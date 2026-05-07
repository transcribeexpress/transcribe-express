/**
 * Module d'extraction audio via Web Audio API (AudioContext)
 *
 * Stratégie mobile — alternative à FFmpeg WASM pour les fichiers > 300 Mo :
 *
 * - FFmpeg WASM charge le fichier entier en mémoire × 2 → crash mobile à ~500 Mo
 * - AudioContext décode le fichier nativement dans le navigateur (codec H.264/VP8 déjà
 *   présent dans le moteur) puis ré-encode en WAV PCM 16 kHz mono via OfflineAudioContext
 * - Empreinte mémoire : ~50 Mo pour un fichier de 1 Go (seul le PCM décodé est en RAM)
 *
 * Formats supportés nativement par les navigateurs mobiles :
 * - MP4 / MOV (H.264 + AAC) → iOS Safari, Chrome Android ✅
 * - WebM (VP8/VP9 + Opus/Vorbis) → Chrome Android ✅ (pas iOS Safari)
 * - AVI / MKV → non supportés nativement → fallback upload direct
 *
 * Sortie : fichier WAV PCM 16 kHz mono (~10 Mo pour 1h d'audio)
 * Format optimal pour Whisper / Groq API.
 *
 * Limites connues :
 * - iOS Safari : limite de décodage ~2 Go (suffisant pour tous les cas d'usage)
 * - Chrome Android : limite ~1 Go selon la RAM disponible
 * - Pas de support AVI/MKV → ces formats basculent vers l'upload chunked
 */

export type AudioContextProgressCallback = (progress: {
  stage: 'decoding' | 'encoding' | 'finalizing';
  percent: number;
  message: string;
}) => void;

export interface AudioContextExtractionResult {
  success: boolean;
  /** Fichier WAV extrait (si success=true) */
  audioFile?: File;
  /** Taille originale en octets */
  originalSize: number;
  /** Taille du fichier WAV extrait en octets */
  extractedSize?: number;
  /** Ratio de compression */
  compressionRatio?: number;
  /** Message d'erreur (si success=false) */
  error?: string;
  /** Basculer vers l'upload chunked direct */
  useFallback?: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Fréquence d'échantillonnage cible (optimal pour Whisper) */
const TARGET_SAMPLE_RATE = 16000;

/** Formats vidéo supportés nativement par les navigateurs mobiles */
const MOBILE_NATIVE_VIDEO_EXTS = ['mp4', 'mov', 'm4v', 'webm'];

/** Formats non supportés nativement → fallback upload chunked */
const UNSUPPORTED_NATIVE_EXTS = ['avi', 'mkv', 'flv', 'wmv'];

// ─── Détection ───────────────────────────────────────────────────────────────

/**
 * Détecter si le navigateur est sur un appareil mobile
 * Combinaison userAgent + largeur d'écran pour couvrir les fenêtres redimensionnées
 */
export function isMobileDevice(): boolean {
  const uaMatch = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const narrowScreen = window.innerWidth < 1024;
  return uaMatch || narrowScreen;
}

/**
 * Vérifier si AudioContext est disponible dans le navigateur
 */
export function isAudioContextSupported(): boolean {
  return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
}

/**
 * Vérifier si un fichier vidéo peut être décodé nativement par le navigateur
 * (sans FFmpeg WASM)
 */
export function canDecodeNatively(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (UNSUPPORTED_NATIVE_EXTS.includes(ext)) return false;
  if (MOBILE_NATIVE_VIDEO_EXTS.includes(ext)) return true;
  return false;
}

/**
 * Déterminer si on doit utiliser AudioContext (au lieu de FFmpeg WASM)
 *
 * DÉSACTIVÉ — AudioContext.decodeAudioData() nécessite un ArrayBuffer complet
 * en entrée (pas de streaming), ce qui charge le fichier entier en RAM.
 * Sur mobile, un fichier de 470 Mo = 940 Mo de RAM (original + copie décodage)
 * → OOM kill garanti sur iPhone 13 (crash à ~25%).
 *
 * Solution : pour tout fichier > 300 Mo sur mobile, utiliser l'upload chunked
 * direct (10 Mo/chunk en RAM max) + extraction ffmpeg côté serveur.
 *
 * @returns false — toujours désactivé, le chemin chunked est utilisé à la place
 */
export function shouldUseAudioContext(_file: File): boolean {
  return false;
}

/**
 * Déterminer si on doit basculer vers l'upload chunked direct
 *
 * Règle simple : tout fichier vidéo > 300 Mo sur mobile → upload chunked.
 * Aucune extraction côté client n'est possible sans charger le fichier
 * complet en RAM (que ce soit FFmpeg WASM ou AudioContext).
 *
 * L'upload chunked ne charge que 10 Mo à la fois en RAM (1 chunk),
 * puis le serveur extrait l'audio avec ffmpeg Node.js.
 */
export function shouldUseChunkedUpload(file: File): boolean {
  const MOBILE_THRESHOLD_BYTES = 300 * 1024 * 1024; // 300 Mo
  if (!isMobileDevice()) return false;
  if (file.size <= MOBILE_THRESHOLD_BYTES) return false;
  // Tout fichier > 300 Mo sur mobile → upload chunked (pas d'extraction client possible)
  return true;
}

// ─── Encodage WAV ────────────────────────────────────────────────────────────

/**
 * Encoder un AudioBuffer en fichier WAV PCM 16 bits
 *
 * Format WAV :
 * - Header RIFF (44 octets)
 * - PCM 16 bits little-endian
 * - Mono (1 canal)
 * - 16 kHz
 */
function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1; // Mono
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // ─── RIFF Header ─────────────────────────────────────────────────
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // ─── fmt chunk ───────────────────────────────────────────────────
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // Chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // ─── data chunk ──────────────────────────────────────────────────
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // ─── PCM samples (mono mix-down) ─────────────────────────────────
  const channelData = audioBuffer.getChannelData(0); // Canal gauche (ou mono)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Clamp [-1, 1] → int16
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ─── Extraction principale ───────────────────────────────────────────────────

/**
 * Extraire l'audio d'un fichier vidéo via Web Audio API
 *
 * Pipeline :
 * 1. Lire le fichier en ArrayBuffer (FileReader)
 * 2. Décoder via AudioContext.decodeAudioData() (décodage natif navigateur)
 * 3. Ré-échantillonner à 16 kHz mono via OfflineAudioContext
 * 4. Encoder en WAV PCM 16 bits
 * 5. Retourner un File prêt à uploader
 *
 * @param file - Fichier vidéo source
 * @param onProgress - Callback de progression (optionnel)
 */
export async function extractAudioViaAudioContext(
  file: File,
  onProgress?: AudioContextProgressCallback
): Promise<AudioContextExtractionResult> {
  const originalSize = file.size;

  // ─── Vérifications préalables ─────────────────────────────────────
  if (!isAudioContextSupported()) {
    return {
      success: false,
      originalSize,
      error: 'AudioContext non supporté par ce navigateur',
      useFallback: true,
    };
  }

  if (!canDecodeNatively(file)) {
    return {
      success: false,
      originalSize,
      error: `Format ${file.name.split('.').pop()} non supporté nativement`,
      useFallback: true,
    };
  }

  try {
    // ─── Étape 1 : Lire le fichier en ArrayBuffer ──────────────────
    onProgress?.({
      stage: 'decoding',
      percent: 5,
      message: `Lecture du fichier (${formatSize(originalSize)})...`,
    });

    const arrayBuffer = await readFileAsArrayBuffer(file, (readPercent) => {
      onProgress?.({
        stage: 'decoding',
        percent: Math.round(5 + readPercent * 0.2), // 5% → 25%
        message: `Lecture du fichier... ${readPercent}%`,
      });
    });

    // ─── Étape 2 : Décoder via AudioContext ────────────────────────
    onProgress?.({
      stage: 'decoding',
      percent: 25,
      message: 'Décodage de la piste audio...',
    });

    const AudioContextClass: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx = new AudioContextClass();

    let decodedBuffer: AudioBuffer;
    try {
      decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch (decodeError: any) {
      await audioCtx.close();
      return {
        success: false,
        originalSize,
        error: `Impossible de décoder l'audio : ${decodeError.message || 'format non supporté'}`,
        useFallback: true,
      };
    }

    await audioCtx.close();

    const durationSeconds = decodedBuffer.duration;
    const originalSampleRate = decodedBuffer.sampleRate;

    onProgress?.({
      stage: 'decoding',
      percent: 50,
      message: `Audio décodé (${Math.round(durationSeconds)}s, ${originalSampleRate} Hz)`,
    });

    // ─── Étape 3 : Ré-échantillonner à 16 kHz mono ─────────────────
    onProgress?.({
      stage: 'encoding',
      percent: 55,
      message: 'Optimisation pour la transcription (16 kHz mono)...',
    });

    const numOutputSamples = Math.ceil(durationSeconds * TARGET_SAMPLE_RATE);
    const offlineCtx = new OfflineAudioContext(
      1,                    // Mono
      numOutputSamples,
      TARGET_SAMPLE_RATE
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = decodedBuffer;

    // Mix-down stéréo → mono si nécessaire
    if (decodedBuffer.numberOfChannels > 1) {
      const merger = offlineCtx.createChannelMerger(1);
      source.connect(merger);
      merger.connect(offlineCtx.destination);
    } else {
      source.connect(offlineCtx.destination);
    }

    source.start(0);

    const resampledBuffer = await offlineCtx.startRendering();

    onProgress?.({
      stage: 'encoding',
      percent: 75,
      message: 'Encodage WAV en cours...',
    });

    // ─── Étape 4 : Encoder en WAV PCM 16 bits ─────────────────────
    const wavBuffer = encodeWAV(resampledBuffer);

    onProgress?.({
      stage: 'finalizing',
      percent: 90,
      message: 'Finalisation...',
    });

    // ─── Étape 5 : Créer le File ───────────────────────────────────
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const audioFile = new File([wavBuffer], `${baseName}.wav`, {
      type: 'audio/wav',
    });

    const extractedSize = audioFile.size;
    const compressionRatio = originalSize / extractedSize;

    onProgress?.({
      stage: 'finalizing',
      percent: 100,
      message: `Audio extrait (${formatSize(extractedSize)})`,
    });

    console.log(
      `[AudioContextExtractor] Extracted: ${formatSize(originalSize)} → ${formatSize(extractedSize)} ` +
      `(${compressionRatio.toFixed(1)}x) in ${durationSeconds.toFixed(1)}s`
    );

    return {
      success: true,
      audioFile,
      originalSize,
      extractedSize,
      compressionRatio,
    };
  } catch (error: any) {
    console.error('[AudioContextExtractor] Extraction failed:', error);
    return {
      success: false,
      originalSize,
      error: error.message || 'Erreur lors de l\'extraction audio',
      useFallback: true,
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Lire un fichier en ArrayBuffer avec suivi de progression
 */
function readFileAsArrayBuffer(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return ArrayBuffer'));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Formater une taille en octets en chaîne lisible
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
