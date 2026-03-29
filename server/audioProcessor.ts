/**
 * Module audioProcessor — Extraction et conversion audio côté serveur
 * 
 * Pipeline optimisé pour les gros fichiers (streaming, pas de chargement en mémoire) :
 * 1. Télécharger depuis S3 en streaming vers le disque (pas de Buffer en mémoire)
 * 2. FFmpeg lit depuis le disque et écrit le FLAC sur le disque
 * 3. Lire le FLAC résultant (petit fichier ~2-10 Mo) en mémoire pour la transcription
 * 
 * Empreinte mémoire : ~10 Mo max au lieu de ~550 Mo pour un fichier vidéo 4K
 * 
 * Formats vidéo supportés en entrée : MOV, MP4, AVI, MKV, WEBM
 * Formats audio supportés en entrée : MP3, WAV, M4A, OGG, FLAC, WEBM
 * Format de sortie : FLAC 16kHz mono (optimal pour Whisper/Groq)
 */

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';
import { downloadFileFromS3ToFile } from './s3Direct';

// Types MIME supportés (vidéo + audio)
export const SUPPORTED_VIDEO_MIMES = [
  'video/quicktime',     // .mov (iPhone natif)
  'video/mp4',           // .mp4
  'video/x-msvideo',     // .avi
  'video/x-matroska',    // .mkv
  'video/webm',          // .webm
];

export const SUPPORTED_AUDIO_MIMES = [
  'audio/mpeg',          // .mp3
  'audio/wav',           // .wav
  'audio/x-wav',         // .wav
  'audio/mp4',           // .m4a
  'audio/x-m4a',         // .m4a
  'audio/ogg',           // .ogg
  'audio/flac',          // .flac
  'audio/webm',          // .webm
];

export const ALL_SUPPORTED_MIMES = [...SUPPORTED_VIDEO_MIMES, ...SUPPORTED_AUDIO_MIMES];

// Extensions supportées
export const SUPPORTED_EXTENSIONS = [
  'mov', 'mp4', 'avi', 'mkv', 'webm',  // vidéo
  'mp3', 'wav', 'm4a', 'ogg', 'flac',  // audio
];

// Limite de taille pour l'audio extrait envoyé directement à Groq (sans chunking)
export const MAX_AUDIO_CHUNK_SIZE_MB = 20;
export const MAX_AUDIO_CHUNK_SIZE_BYTES = MAX_AUDIO_CHUNK_SIZE_MB * 1024 * 1024;

// Timeout global pour le pipeline (10 minutes)
const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000;

export interface AudioProcessingResult {
  success: true;
  audioBuffer: Buffer;
  mimeType: string;       // 'audio/flac'
  extension: string;      // 'flac'
  durationSeconds: number;
  originalSizeBytes: number;
  processedSizeBytes: number;
}

export interface AudioProcessingError {
  success: false;
  error: string;
  code: 'DOWNLOAD_FAILED' | 'CONVERSION_FAILED' | 'UNSUPPORTED_FORMAT' | 'NO_AUDIO_TRACK' | 'TIMEOUT';
}

export type AudioProcessingOutput = AudioProcessingResult | AudioProcessingError;

/**
 * Déterminer si un fichier est un format vidéo nécessitant une extraction audio
 */
export function isVideoFormat(mimeType: string, fileName: string): boolean {
  if (SUPPORTED_VIDEO_MIMES.includes(mimeType)) return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['mov', 'mp4', 'avi', 'mkv', 'webm'].includes(ext);
}

/**
 * Déterminer si un fichier est un format audio natif
 */
export function isAudioFormat(mimeType: string, fileName: string): boolean {
  if (SUPPORTED_AUDIO_MIMES.includes(mimeType)) return true;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext);
}

/**
 * Valider le format d'un fichier (audio ou vidéo)
 */
export function isSupportedFormat(mimeType: string, fileName: string): boolean {
  return isVideoFormat(mimeType, fileName) || isAudioFormat(mimeType, fileName);
}

/**
 * Créer un fichier temporaire avec un nom unique
 */
function createTempFilePath(extension: string): string {
  const tmpDir = os.tmpdir();
  const uniqueId = randomBytes(8).toString('hex');
  return path.join(tmpDir, `te-audio-${uniqueId}.${extension}`);
}

/**
 * Nettoyer les fichiers temporaires de manière sûre
 */
async function cleanupTempFiles(...filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[AudioProcessor] Failed to cleanup temp file ${filePath}:`, err);
    }
  }
}

/**
 * Télécharger un fichier depuis une URL vers un buffer (fallback pour petits fichiers)
 */
export async function downloadFileFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Obtenir la durée d'un fichier audio/vidéo via FFmpeg
 * Utilise FFmpeg -i pour extraire la durée depuis stderr
 */
async function getMediaDuration(inputPath: string): Promise<number> {
  return new Promise((resolve) => {
    const args = [
      '-i', inputPath,
      '-f', 'null',
      '-'
    ];

    const proc = spawn(ffmpegPath!, args);
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      // Extraire la durée depuis la sortie FFmpeg
      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);
        const centiseconds = parseInt(durationMatch[4]);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        if (isFinite(totalSeconds) && totalSeconds > 0) {
          resolve(totalSeconds);
          return;
        }
      }
      resolve(0);
    });

    proc.on('error', () => resolve(0));

    // Timeout de 30 secondes pour la détection de durée
    setTimeout(() => {
      try { proc.kill(); } catch {}
      resolve(0);
    }, 30000);
  });
}

/**
 * Extraire et convertir l'audio d'un fichier en FLAC 16kHz mono via FFmpeg
 * 
 * Pipeline : input file (sur disque) → FFmpeg → FLAC 16kHz mono (sur disque)
 * Pas de chargement en mémoire du fichier source.
 * 
 * @param inputPath - Chemin du fichier source sur le disque
 * @param originalSizeBytes - Taille originale pour le logging
 * @returns AudioProcessingOutput avec le buffer FLAC résultant
 */
export async function extractAndConvertAudioFromFile(
  inputPath: string,
  originalSizeBytes: number
): Promise<AudioProcessingOutput> {
  const outputPath = createTempFilePath('flac');

  try {
    // 1. Obtenir la durée du fichier source
    console.log(`[AudioProcessor] Getting media duration...`);
    const duration = await getMediaDuration(inputPath);
    console.log(`[AudioProcessor] Duration: ${duration.toFixed(1)}s`);

    // 2. Exécuter FFmpeg pour extraire et convertir l'audio
    console.log(`[AudioProcessor] Starting FFmpeg conversion...`);
    const ffmpegStart = Date.now();

    await new Promise<void>((resolve, reject) => {
      const args = [
        '-i', inputPath,           // Fichier d'entrée (sur disque)
        '-vn',                     // Pas de vidéo (extraction audio seule)
        '-acodec', 'flac',         // Codec de sortie : FLAC
        '-ar', '16000',            // Taux d'échantillonnage : 16kHz
        '-ac', '1',                // Mono
        '-map', '0:a:0',          // Première piste audio uniquement
        '-y',                      // Écraser le fichier de sortie
        outputPath,
      ];

      const proc = spawn(ffmpegPath!, args);
      let stderr = '';

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const elapsed = ((Date.now() - ffmpegStart) / 1000).toFixed(1);
        console.log(`[AudioProcessor] FFmpeg finished in ${elapsed}s with code ${code}`);

        if (code === 0) {
          resolve();
        } else {
          // Vérifier si l'erreur est liée à l'absence de piste audio
          if (stderr.includes('does not contain any stream') || 
              stderr.includes('Output file is empty') ||
              stderr.includes('no audio stream')) {
            reject(new Error('NO_AUDIO_TRACK'));
          } else {
            reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
          }
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });

      // Timeout FFmpeg : 5 minutes max
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch {}
        reject(new Error('FFmpeg timeout after 5 minutes'));
      }, 5 * 60 * 1000);
    });

    // 3. Lire le fichier FLAC résultant (petit fichier, ~2-10 Mo)
    if (!fs.existsSync(outputPath)) {
      return {
        success: false,
        error: 'FFmpeg n\'a produit aucun fichier de sortie',
        code: 'CONVERSION_FAILED',
      };
    }

    const audioBuffer = fs.readFileSync(outputPath);
    
    if (audioBuffer.length === 0) {
      return {
        success: false,
        error: 'Le fichier de sortie est vide. Le fichier source ne contient peut-être pas de piste audio.',
        code: 'NO_AUDIO_TRACK',
      };
    }

    console.log(`[AudioProcessor] Conversion réussie: ${(originalSizeBytes / 1024 / 1024).toFixed(1)}MB → ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB (FLAC 16kHz mono)`);

    return {
      success: true,
      audioBuffer,
      mimeType: 'audio/flac',
      extension: 'flac',
      durationSeconds: duration,
      originalSizeBytes,
      processedSizeBytes: audioBuffer.length,
    };

  } catch (error: any) {
    if (error.message === 'NO_AUDIO_TRACK') {
      return {
        success: false,
        error: 'Aucune piste audio détectée dans le fichier',
        code: 'NO_AUDIO_TRACK',
      };
    }

    console.error('[AudioProcessor] Conversion error:', error);
    return {
      success: false,
      error: `Erreur de conversion audio: ${error.message}`,
      code: 'CONVERSION_FAILED',
    };
  } finally {
    // Nettoyer le fichier FLAC de sortie (le fichier d'entrée est nettoyé par l'appelant)
    await cleanupTempFiles(outputPath);
  }
}

/**
 * Legacy : Extraire et convertir depuis un Buffer en mémoire
 * Gardé pour compatibilité avec le chunker qui travaille déjà avec des buffers
 */
export async function extractAndConvertAudio(
  inputBuffer: Buffer,
  inputExtension: string
): Promise<AudioProcessingOutput> {
  const inputPath = createTempFilePath(inputExtension);

  try {
    // Écrire le buffer d'entrée dans un fichier temporaire
    fs.writeFileSync(inputPath, inputBuffer);
    return await extractAndConvertAudioFromFile(inputPath, inputBuffer.length);
  } finally {
    await cleanupTempFiles(inputPath);
  }
}

/**
 * Pipeline complet V3 : S3 streaming → disque → FFmpeg → FLAC
 * 
 * OPTIMISÉ POUR LA MÉMOIRE :
 * - Le fichier source est streamé depuis S3 directement vers le disque (pas de Buffer)
 * - FFmpeg lit depuis le disque et écrit sur le disque
 * - Seul le FLAC résultant (~2-10 Mo) est chargé en mémoire
 * - Empreinte mémoire : ~10 Mo au lieu de ~550 Mo
 * 
 * @param fileUrl - URL publique du fichier (fallback)
 * @param fileName - Nom original du fichier
 * @param mimeType - Type MIME du fichier
 * @param fileKey - Clé S3 du fichier (méthode préférée)
 */
export async function processMediaFile(
  fileUrl: string,
  fileName: string,
  mimeType: string,
  fileKey?: string
): Promise<AudioProcessingOutput> {
  const startTime = Date.now();
  console.log(`[AudioProcessor] ========== START: ${fileName} (${mimeType}) ==========`);

  // 1. Valider le format
  if (!isSupportedFormat(mimeType, fileName)) {
    return {
      success: false,
      error: `Format non supporté: ${mimeType}. Formats acceptés: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      code: 'UNSUPPORTED_FORMAT',
    };
  }

  // 2. Préparer le chemin temporaire pour le fichier source
  const inputExtension = fileName.split('.').pop()?.toLowerCase() || 'mp4';
  const inputPath = createTempFilePath(inputExtension);

  try {
    // 3. Télécharger le fichier depuis S3 en streaming vers le disque
    let fileSizeBytes: number;
    try {
      if (fileKey) {
        // Méthode préférée : streaming S3 → disque (pas de Buffer en mémoire)
        console.log(`[AudioProcessor] Streaming download via AWS SDK: ${fileKey}`);
        fileSizeBytes = await downloadFileFromS3ToFile(fileKey, inputPath);
      } else {
        // Fallback : télécharger via URL publique en mémoire puis écrire
        console.log(`[AudioProcessor] Downloading via public URL: ${fileUrl}`);
        const buffer = await downloadFileFromUrl(fileUrl);
        fs.writeFileSync(inputPath, buffer);
        fileSizeBytes = buffer.length;
      }
      console.log(`[AudioProcessor] Downloaded: ${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB to ${inputPath}`);
    } catch (error: any) {
      return {
        success: false,
        error: `Impossible de télécharger le fichier: ${error.message}`,
        code: 'DOWNLOAD_FAILED',
      };
    }

    // 4. Vérifier le timeout global
    const elapsed = Date.now() - startTime;
    if (elapsed > PIPELINE_TIMEOUT_MS) {
      return {
        success: false,
        error: `Pipeline timeout après ${(elapsed / 1000).toFixed(0)}s`,
        code: 'TIMEOUT',
      };
    }

    // 5. Extraire et convertir l'audio (lit depuis le disque, pas de Buffer source en mémoire)
    const result = await extractAndConvertAudioFromFile(inputPath, fileSizeBytes);

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[AudioProcessor] ========== END: ${fileName} (${totalElapsed}s) ==========`);

    return result;

  } finally {
    // 6. Nettoyer le fichier source temporaire
    await cleanupTempFiles(inputPath);
  }
}
