/**
 * Module d'extraction audio côté client via FFmpeg WebAssembly
 * 
 * Architecture :
 * - Fichiers vidéo (MP4, MOV, AVI, MKV, WebM) → extraction audio stream copy → upload audio léger
 * - Fichiers audio (MP3, WAV, FLAC, OGG, M4A) → pas d'extraction, upload direct
 * - Fallback : si FFmpeg WASM échoue → upload vidéo brute + extraction serveur
 * 
 * Utilise @ffmpeg/ffmpeg 0.12.x en mode single-thread (pas besoin de SharedArrayBuffer)
 * pour une compatibilité maximale avec tous les navigateurs (Chrome, Firefox, Safari, iOS).
 * 
 * Le core WASM (~30 Mo) est chargé depuis le CDN unpkg et mis en cache par le navigateur.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

// Singleton FFmpeg pour éviter de recharger le module WASM à chaque extraction
let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<FFmpeg> | null = null;

/**
 * Résultat de l'extraction audio
 */
export interface AudioExtractionResult {
  success: boolean;
  /** Fichier audio extrait (si success=true) */
  audioFile?: File;
  /** Taille du fichier original en octets */
  originalSize: number;
  /** Taille du fichier audio extrait en octets */
  extractedSize?: number;
  /** Ratio de compression (originalSize / extractedSize) */
  compressionRatio?: number;
  /** Message d'erreur (si success=false) */
  error?: string;
  /** Le fallback serveur doit être utilisé */
  useFallback?: boolean;
}

/**
 * Callback de progression pour l'extraction audio
 */
export type ExtractionProgressCallback = (progress: {
  stage: 'loading_ffmpeg' | 'reading_file' | 'extracting' | 'finalizing';
  percent: number;
  message: string;
}) => void;

/**
 * Extensions vidéo qui nécessitent une extraction audio
 */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

/**
 * Extensions audio qui n'ont pas besoin d'extraction
 */
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];

/**
 * Déterminer si un fichier est une vidéo (nécessite extraction audio)
 */
export function needsAudioExtraction(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Déterminer si un fichier est un audio pur (pas besoin d'extraction)
 */
export function isDirectAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.includes(ext);
}

/**
 * Vérifier si FFmpeg WASM est supporté par le navigateur
 */
export function isFFmpegSupported(): boolean {
  try {
    // Vérifier le support WebAssembly
    if (typeof WebAssembly !== 'object') return false;
    // Vérifier le support des Web Workers (nécessaire pour FFmpeg WASM)
    if (typeof Worker === 'undefined') return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Charger l'instance FFmpeg WASM (singleton, chargé une seule fois)
 * Le module WASM (~30 Mo compressé ~10 Mo gzip) est mis en cache par le navigateur.
 */
async function loadFFmpeg(onProgress?: ExtractionProgressCallback): Promise<FFmpeg> {
  // Retourner l'instance existante si déjà chargée
  if (ffmpegInstance) return ffmpegInstance;

  // Éviter les chargements parallèles
  if (loadPromise) return loadPromise;

  isLoading = true;
  loadPromise = (async () => {
    try {
      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 5,
        message: 'Chargement du moteur audio...',
      });

      const ffmpeg = new FFmpeg();

      // Écouter la progression du chargement
      ffmpeg.on('log', ({ message }) => {
        console.debug('[FFmpeg WASM]', message);
      });

      // Charger le core WASM depuis le CDN (single-thread, pas besoin de SharedArrayBuffer)
      await ffmpeg.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
      });

      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 15,
        message: 'Moteur audio prêt',
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;
    } catch (error) {
      loadPromise = null;
      throw error;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Déterminer le format de sortie audio optimal selon le conteneur vidéo
 * 
 * Stratégie : stream copy quand possible (quasi-instantané), sinon ré-encodage léger
 * - MP4/MOV → AAC (stream copy) → .m4a
 * - WebM → Opus/Vorbis (stream copy) → .ogg
 * - AVI/MKV → essayer stream copy, sinon MP3
 */
function getOutputFormat(inputExt: string): { ext: string; codec: string; mimeType: string } {
  switch (inputExt) {
    case 'mp4':
    case 'mov':
    case 'm4v':
      return { ext: 'm4a', codec: 'copy', mimeType: 'audio/mp4' };
    case 'webm':
      return { ext: 'ogg', codec: 'copy', mimeType: 'audio/ogg' };
    case 'avi':
    case 'mkv':
      // AVI/MKV peuvent avoir des codecs variés, on essaie stream copy d'abord
      return { ext: 'm4a', codec: 'copy', mimeType: 'audio/mp4' };
    default:
      return { ext: 'm4a', codec: 'copy', mimeType: 'audio/mp4' };
  }
}

/**
 * Extraire l'audio d'un fichier vidéo via FFmpeg WASM
 * 
 * Pipeline :
 * 1. Charger FFmpeg WASM (singleton, mis en cache)
 * 2. Écrire le fichier vidéo dans le filesystem virtuel WASM
 * 3. Exécuter FFmpeg avec stream copy (pas de ré-encodage = quasi-instantané)
 * 4. Lire le fichier audio résultant
 * 5. Retourner un objet File prêt à uploader
 * 
 * Si stream copy échoue (codec incompatible), tente un ré-encodage en AAC.
 * Si tout échoue, retourne useFallback=true pour utiliser le pipeline serveur.
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress?: ExtractionProgressCallback
): Promise<AudioExtractionResult> {
  const originalSize = file.size;

  // Vérifier le support navigateur
  if (!isFFmpegSupported()) {
    return {
      success: false,
      originalSize,
      error: 'FFmpeg WASM non supporté par ce navigateur',
      useFallback: true,
    };
  }

  // Vérifier si c'est bien une vidéo
  if (!needsAudioExtraction(file)) {
    return {
      success: false,
      originalSize,
      error: 'Ce fichier n\'est pas une vidéo, pas besoin d\'extraction',
      useFallback: false,
    };
  }

  try {
    // 1. Charger FFmpeg
    const ffmpeg = await loadFFmpeg(onProgress);

    // 2. Écrire le fichier vidéo dans le FS virtuel
    onProgress?.({
      stage: 'reading_file',
      percent: 20,
      message: `Lecture du fichier (${formatSize(file.size)})...`,
    });

    const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const inputFileName = `input.${inputExt}`;
    const { ext: outputExt, codec, mimeType } = getOutputFormat(inputExt);
    const outputFileName = `output.${outputExt}`;

    await ffmpeg.writeFile(inputFileName, await fetchFile(file));

    onProgress?.({
      stage: 'extracting',
      percent: 40,
      message: 'Extraction de l\'audio en cours...',
    });

    // 3. Extraire l'audio avec stream copy (pas de ré-encodage)
    let extractionSuccess = false;

    try {
      // Tentative 1 : Stream copy (quasi-instantané)
      await ffmpeg.exec([
        '-i', inputFileName,
        '-vn',              // Pas de vidéo
        '-acodec', codec,   // Copier le codec audio tel quel
        '-y',               // Écraser si existe
        outputFileName,
      ]);
      extractionSuccess = true;
    } catch (streamCopyError) {
      console.warn('[AudioExtractor] Stream copy failed, trying re-encode:', streamCopyError);
      
      // Tentative 2 : Ré-encodage en AAC (plus lent mais plus compatible)
      try {
        onProgress?.({
          stage: 'extracting',
          percent: 50,
          message: 'Conversion audio en cours (ré-encodage)...',
        });

        await ffmpeg.exec([
          '-i', inputFileName,
          '-vn',
          '-acodec', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '1',        // Mono (suffisant pour la transcription)
          '-y',
          `output.m4a`,
        ]);
        extractionSuccess = true;
      } catch (reencodeError) {
        console.error('[AudioExtractor] Re-encode also failed:', reencodeError);
      }
    }

    if (!extractionSuccess) {
      // Nettoyer le FS virtuel
      try { await ffmpeg.deleteFile(inputFileName); } catch {}
      
      return {
        success: false,
        originalSize,
        error: 'Extraction audio échouée',
        useFallback: true,
      };
    }

    onProgress?.({
      stage: 'finalizing',
      percent: 80,
      message: 'Finalisation...',
    });

    // 4. Lire le fichier audio résultant
    let outputData: Uint8Array;
    try {
      const data = await ffmpeg.readFile(outputFileName);
      outputData = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    } catch {
      // Essayer avec le nom alternatif (si re-encode a changé le nom)
      try {
        const data = await ffmpeg.readFile('output.m4a');
        outputData = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
      } catch {
        return {
          success: false,
          originalSize,
          error: 'Impossible de lire le fichier audio extrait',
          useFallback: true,
        };
      }
    }

    // Vérifier que le fichier audio n'est pas vide
    if (outputData.length < 1000) {
      return {
        success: false,
        originalSize,
        error: 'Le fichier audio extrait est vide ou trop petit',
        useFallback: true,
      };
    }

    // 5. Créer un objet File
    const audioFileName = file.name.replace(/\.[^.]+$/, `.${outputExt}`);
    // Cast nécessaire car TypeScript n'accepte pas Uint8Array<ArrayBufferLike> comme BlobPart
    const audioBuffer = new Uint8Array(outputData).buffer as ArrayBuffer;
    const audioFile = new File([audioBuffer], audioFileName, { type: mimeType });

    // 6. Nettoyer le FS virtuel
    try { await ffmpeg.deleteFile(inputFileName); } catch {}
    try { await ffmpeg.deleteFile(outputFileName); } catch {}
    try { await ffmpeg.deleteFile('output.m4a'); } catch {}

    const extractedSize = audioFile.size;
    const compressionRatio = originalSize / extractedSize;

    onProgress?.({
      stage: 'finalizing',
      percent: 100,
      message: `Audio extrait : ${formatSize(extractedSize)} (${compressionRatio.toFixed(0)}x plus léger)`,
    });

    console.log(
      `[AudioExtractor] Success: ${formatSize(originalSize)} → ${formatSize(extractedSize)} (${compressionRatio.toFixed(1)}x compression)`
    );

    return {
      success: true,
      audioFile,
      originalSize,
      extractedSize,
      compressionRatio,
    };

  } catch (error: any) {
    console.error('[AudioExtractor] Unexpected error:', error);
    
    return {
      success: false,
      originalSize,
      error: error.message || 'Erreur inattendue lors de l\'extraction audio',
      useFallback: true,
    };
  }
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

/**
 * Libérer l'instance FFmpeg (pour les tests ou le nettoyage mémoire)
 */
export function disposeFFmpeg(): void {
  if (ffmpegInstance) {
    try {
      ffmpegInstance.terminate();
    } catch {}
    ffmpegInstance = null;
    loadPromise = null;
  }
}
