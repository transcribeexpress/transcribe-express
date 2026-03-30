/**
 * Module d'extraction audio côté client via FFmpeg WebAssembly
 * 
 * Architecture :
 * - Fichiers vidéo (MP4, MOV, AVI, MKV, WebM) → extraction audio stream copy → upload audio léger
 * - Fichiers audio (MP3, WAV, FLAC, OGG, M4A) → pas d'extraction, upload direct
 * - Fallback : si FFmpeg WASM échoue → upload vidéo brute + extraction serveur
 * 
 * IMPORTANT — Corrections appliquées :
 * 1. Utilise toBlobURL() pour contourner les restrictions CORS (cause #1 de l'échec)
 * 2. Utilise le format ESM (requis par Vite) au lieu de UMD
 * 3. Utilise jsdelivr CDN (plus fiable que unpkg)
 * 4. Utilise @ffmpeg/core@0.12.10 (dernière version stable)
 * 5. Mode single-thread (pas besoin de SharedArrayBuffer/COOP/COEP)
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// ─── Singleton FFmpeg ────────────────────────────────────────────────
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// ─── CDN Configuration ──────────────────────────────────────────────
// ESM build pour Vite, single-thread (pas de SharedArrayBuffer requis)
const CORE_VERSION = '0.12.10';
const BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

// ─── Types ───────────────────────────────────────────────────────────

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

// ─── Constantes ──────────────────────────────────────────────────────

/** Extensions vidéo qui nécessitent une extraction audio */
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

/** Extensions audio qui n'ont pas besoin d'extraction */
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac'];

/** Limite de taille pour l'extraction WASM (2 Go = limite WebAssembly) */
const MAX_WASM_FILE_SIZE = 2 * 1024 * 1024 * 1024;

// ─── Fonctions utilitaires ───────────────────────────────────────────

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
 * 
 * Conditions requises :
 * - WebAssembly disponible
 * - Web Workers disponibles (FFmpeg utilise un Worker interne)
 * - Blob URLs supportées (pour le chargement CORS-safe)
 */
export function isFFmpegSupported(): boolean {
  try {
    if (typeof WebAssembly !== 'object') {
      console.warn('[AudioExtractor] WebAssembly not available');
      return false;
    }
    if (typeof Worker === 'undefined') {
      console.warn('[AudioExtractor] Web Workers not available');
      return false;
    }
    if (typeof Blob === 'undefined' || typeof URL?.createObjectURL !== 'function') {
      console.warn('[AudioExtractor] Blob URLs not available');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Charger l'instance FFmpeg WASM (singleton, chargé une seule fois)
 * 
 * CRITIQUE : Utilise toBlobURL() pour télécharger les fichiers core et WASM
 * puis les convertir en Blob URLs locales. Cela contourne les restrictions CORS
 * qui empêchent le Worker interne de FFmpeg de charger le core depuis un CDN externe.
 * 
 * Le module WASM (~31 Mo compressé ~10 Mo gzip) est mis en cache par le navigateur
 * après le premier chargement.
 */
async function loadFFmpeg(onProgress?: ExtractionProgressCallback): Promise<FFmpeg> {
  // Retourner l'instance existante si déjà chargée
  if (ffmpegInstance) return ffmpegInstance;

  // Éviter les chargements parallèles
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 2,
        message: 'Téléchargement du moteur audio...',
      });

      console.log('[AudioExtractor] Loading FFmpeg WASM from:', BASE_URL);

      const ffmpeg = new FFmpeg();

      // Écouter les logs FFmpeg pour le débogage
      ffmpeg.on('log', ({ message }) => {
        console.debug('[FFmpeg WASM]', message);
      });

      // ═══════════════════════════════════════════════════════════════
      // CORRECTION CRITIQUE : toBlobURL() pour contourner CORS
      // 
      // Sans toBlobURL, le Worker interne de FFmpeg tente de charger
      // ffmpeg-core.js depuis le CDN → bloqué par CORS.
      // toBlobURL télécharge d'abord le fichier, puis crée une URL locale
      // (blob:) qui est accessible sans restriction CORS.
      // ═══════════════════════════════════════════════════════════════

      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 5,
        message: 'Téléchargement du moteur audio (core)...',
      });

      const coreURL = await toBlobURL(
        `${BASE_URL}/ffmpeg-core.js`,
        'text/javascript'
      );

      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 10,
        message: 'Téléchargement du moteur audio (wasm)...',
      });

      const wasmURL = await toBlobURL(
        `${BASE_URL}/ffmpeg-core.wasm`,
        'application/wasm'
      );

      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 14,
        message: 'Initialisation du moteur audio...',
      });

      console.log('[AudioExtractor] Core and WASM downloaded, loading FFmpeg...');

      // Charger FFmpeg avec les Blob URLs (CORS-safe)
      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      console.log('[AudioExtractor] FFmpeg WASM loaded successfully!');

      onProgress?.({
        stage: 'loading_ffmpeg',
        percent: 18,
        message: 'Moteur audio prêt',
      });

      ffmpegInstance = ffmpeg;
      return ffmpeg;

    } catch (error: any) {
      console.error('[AudioExtractor] Failed to load FFmpeg WASM:', error);
      loadPromise = null;
      ffmpegInstance = null;
      throw error;
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
 * - AVI/MKV → essayer stream copy vers .m4a
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
      return { ext: 'm4a', codec: 'copy', mimeType: 'audio/mp4' };
    default:
      return { ext: 'm4a', codec: 'copy', mimeType: 'audio/mp4' };
  }
}

/**
 * Extraire l'audio d'un fichier vidéo via FFmpeg WASM
 * 
 * Pipeline :
 * 1. Charger FFmpeg WASM via toBlobURL (singleton, mis en cache)
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

  // ─── Pré-vérifications ─────────────────────────────────────────────

  // Vérifier le support navigateur
  if (!isFFmpegSupported()) {
    console.warn('[AudioExtractor] Browser does not support FFmpeg WASM');
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

  // Vérifier la limite WebAssembly (2 Go)
  if (file.size > MAX_WASM_FILE_SIZE) {
    console.warn(`[AudioExtractor] File too large for WASM: ${formatSize(file.size)} > 2 Go`);
    return {
      success: false,
      originalSize,
      error: `Fichier trop volumineux pour l'extraction locale (${formatSize(file.size)} > 2 Go)`,
      useFallback: true,
    };
  }

  try {
    // ─── 1. Charger FFmpeg ─────────────────────────────────────────────
    console.log(`[AudioExtractor] Starting extraction for: ${file.name} (${formatSize(file.size)})`);
    
    let ffmpeg: FFmpeg;
    try {
      ffmpeg = await loadFFmpeg(onProgress);
    } catch (loadError: any) {
      console.error('[AudioExtractor] FFmpeg load failed:', loadError);
      return {
        success: false,
        originalSize,
        error: `Impossible de charger le moteur audio: ${loadError.message}`,
        useFallback: true,
      };
    }

    // ─── 2. Écrire le fichier vidéo dans le FS virtuel ─────────────────
    onProgress?.({
      stage: 'reading_file',
      percent: 20,
      message: `Lecture du fichier (${formatSize(file.size)})...`,
    });

    const inputExt = file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const inputFileName = `input.${inputExt}`;
    const { ext: outputExt, codec, mimeType } = getOutputFormat(inputExt);
    const outputFileName = `output.${outputExt}`;

    console.log(`[AudioExtractor] Writing ${formatSize(file.size)} to virtual FS as ${inputFileName}`);
    
    try {
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));
    } catch (writeError: any) {
      console.error('[AudioExtractor] Failed to write file to virtual FS:', writeError);
      return {
        success: false,
        originalSize,
        error: `Erreur de lecture du fichier: ${writeError.message}`,
        useFallback: true,
      };
    }

    console.log('[AudioExtractor] File written to virtual FS');

    onProgress?.({
      stage: 'extracting',
      percent: 40,
      message: 'Extraction de l\'audio en cours...',
    });

    // ─── 3. Extraire l'audio ───────────────────────────────────────────
    let extractionSuccess = false;
    let actualOutputFileName = outputFileName;

    // Tentative 1 : Stream copy (quasi-instantané, pas de ré-encodage)
    try {
      console.log(`[AudioExtractor] Attempt 1: stream copy (-acodec ${codec}) → ${outputFileName}`);
      
      const exitCode = await ffmpeg.exec([
        '-i', inputFileName,
        '-vn',              // Pas de vidéo
        '-acodec', codec,   // Copier le codec audio tel quel
        '-y',               // Écraser si existe
        outputFileName,
      ]);

      console.log(`[AudioExtractor] Stream copy exit code: ${exitCode}`);
      
      // FFmpeg WASM retourne 0 en cas de succès
      if (exitCode === 0) {
        extractionSuccess = true;
      }
    } catch (streamCopyError: any) {
      console.warn('[AudioExtractor] Stream copy failed:', streamCopyError.message);
    }

    // Tentative 2 : Ré-encodage AAC si stream copy a échoué
    if (!extractionSuccess) {
      try {
        console.log('[AudioExtractor] Attempt 2: re-encode to AAC');
        
        onProgress?.({
          stage: 'extracting',
          percent: 50,
          message: 'Conversion audio en cours (ré-encodage)...',
        });

        actualOutputFileName = 'output_reencode.m4a';
        
        const exitCode = await ffmpeg.exec([
          '-i', inputFileName,
          '-vn',
          '-acodec', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-ac', '1',        // Mono (suffisant pour la transcription)
          '-y',
          actualOutputFileName,
        ]);

        console.log(`[AudioExtractor] Re-encode exit code: ${exitCode}`);
        
        if (exitCode === 0) {
          extractionSuccess = true;
        }
      } catch (reencodeError: any) {
        console.error('[AudioExtractor] Re-encode also failed:', reencodeError.message);
      }
    }

    if (!extractionSuccess) {
      // Nettoyer le FS virtuel
      try { await ffmpeg.deleteFile(inputFileName); } catch {}
      try { await ffmpeg.deleteFile(outputFileName); } catch {}
      try { await ffmpeg.deleteFile('output_reencode.m4a'); } catch {}
      
      return {
        success: false,
        originalSize,
        error: 'Extraction audio échouée (stream copy et ré-encodage)',
        useFallback: true,
      };
    }

    onProgress?.({
      stage: 'finalizing',
      percent: 75,
      message: 'Lecture du fichier audio extrait...',
    });

    // ─── 4. Lire le fichier audio résultant ────────────────────────────
    let outputData: Uint8Array;
    try {
      const data = await ffmpeg.readFile(actualOutputFileName);
      outputData = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
      console.log(`[AudioExtractor] Read output: ${formatSize(outputData.length)}`);
    } catch (readError: any) {
      console.error('[AudioExtractor] Failed to read output file:', readError);
      
      // Essayer le nom alternatif
      try {
        const altName = actualOutputFileName === outputFileName ? 'output_reencode.m4a' : outputFileName;
        const data = await ffmpeg.readFile(altName);
        outputData = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
        console.log(`[AudioExtractor] Read alternative output: ${formatSize(outputData.length)}`);
      } catch {
        // Nettoyer
        try { await ffmpeg.deleteFile(inputFileName); } catch {}
        try { await ffmpeg.deleteFile(outputFileName); } catch {}
        try { await ffmpeg.deleteFile('output_reencode.m4a'); } catch {}
        
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
      console.warn(`[AudioExtractor] Output file too small: ${outputData.length} bytes`);
      
      // Nettoyer
      try { await ffmpeg.deleteFile(inputFileName); } catch {}
      try { await ffmpeg.deleteFile(outputFileName); } catch {}
      try { await ffmpeg.deleteFile('output_reencode.m4a'); } catch {}
      
      return {
        success: false,
        originalSize,
        error: 'Le fichier audio extrait est vide ou trop petit',
        useFallback: true,
      };
    }

    // ─── 5. Créer un objet File ────────────────────────────────────────
    onProgress?.({
      stage: 'finalizing',
      percent: 90,
      message: 'Préparation du fichier audio...',
    });

    const finalExt = actualOutputFileName.includes('reencode') ? 'm4a' : outputExt;
    const finalMimeType = actualOutputFileName.includes('reencode') ? 'audio/mp4' : mimeType;
    const audioFileName = file.name.replace(/\.[^.]+$/, `.${finalExt}`);
    
    // Créer le File à partir du Uint8Array
    // Copier dans un ArrayBuffer standard pour éviter l'erreur TS avec Uint8Array<ArrayBufferLike>
    const buffer = outputData.buffer.slice(
      outputData.byteOffset,
      outputData.byteOffset + outputData.byteLength
    ) as ArrayBuffer;
    const audioFile = new File(
      [buffer],
      audioFileName,
      { type: finalMimeType }
    );

    // ─── 6. Nettoyer le FS virtuel ─────────────────────────────────────
    try { await ffmpeg.deleteFile(inputFileName); } catch {}
    try { await ffmpeg.deleteFile(outputFileName); } catch {}
    try { await ffmpeg.deleteFile('output_reencode.m4a'); } catch {}

    const extractedSize = audioFile.size;
    const compressionRatio = originalSize / extractedSize;

    onProgress?.({
      stage: 'finalizing',
      percent: 100,
      message: `Audio extrait : ${formatSize(extractedSize)} (${compressionRatio.toFixed(0)}x plus léger)`,
    });

    console.log(
      `[AudioExtractor] SUCCESS: ${formatSize(originalSize)} → ${formatSize(extractedSize)} ` +
      `(${compressionRatio.toFixed(1)}x compression, method: ${actualOutputFileName.includes('reencode') ? 're-encode' : 'stream copy'})`
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
