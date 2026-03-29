/**
 * Module audioProcessor — Extraction et conversion audio côté serveur
 * 
 * Responsabilités :
 * 1. Télécharger un fichier depuis S3 (URL publique)
 * 2. Détecter le format (MOV, MP4, AVI, MKV, audio natif)
 * 3. Extraire la piste audio et convertir en FLAC 16kHz mono (format optimal Groq)
 * 4. Retourner le buffer audio prêt pour la transcription
 * 
 * Formats vidéo supportés en entrée : MOV, MP4, AVI, MKV, WEBM
 * Formats audio supportés en entrée : MP3, WAV, M4A, OGG, FLAC, WEBM
 * Format de sortie : FLAC 16kHz mono (optimal pour Whisper/Groq)
 */

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';
import { downloadFileFromS3 } from './s3Direct';

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

// Pas de limite de taille côté serveur
// L'upload se fait directement vers S3 via URL pré-signée (pas de passage par le proxy)
// Le serveur télécharge ensuite depuis S3 pour le traitement

// Limite de taille pour l'audio extrait envoyé directement à Groq (sans chunking)
export const MAX_AUDIO_CHUNK_SIZE_MB = 20;
export const MAX_AUDIO_CHUNK_SIZE_BYTES = MAX_AUDIO_CHUNK_SIZE_MB * 1024 * 1024;

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
  code: 'DOWNLOAD_FAILED' | 'CONVERSION_FAILED' | 'UNSUPPORTED_FORMAT' | 'NO_AUDIO_TRACK';
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
 * Nettoyer les fichiers temporaires
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
 * Télécharger un fichier depuis une URL vers un buffer
 */
export async function downloadFileFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Obtenir la durée d'un fichier audio/vidéo via FFprobe
 */
async function getMediaDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobePath = ffmpegPath!.replace(/ffmpeg$/, 'ffprobe');
    // Utiliser ffmpeg lui-même si ffprobe n'existe pas
    const probePath = fs.existsSync(ffprobePath) ? ffprobePath : ffmpegPath!;
    
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ];

    const proc = spawn(probePath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && stdout.trim()) {
        const duration = parseFloat(stdout.trim());
        if (isFinite(duration) && duration > 0) {
          resolve(duration);
          return;
        }
      }
      // Fallback : essayer avec ffmpeg -i
      resolve(0);
    });

    proc.on('error', () => resolve(0));
  });
}

/**
 * Extraire et convertir l'audio d'un fichier en FLAC 16kHz mono via FFmpeg
 * 
 * Pipeline : input (MOV/MP4/audio) → FFmpeg → FLAC 16kHz mono
 * 
 * Pourquoi FLAC 16kHz mono ?
 * - Groq recommande ce format pour une latence optimale
 * - Compression sans perte (qualité préservée)
 * - 16kHz est le taux d'échantillonnage de Whisper (pas de perte de qualité)
 * - Mono car Whisper ne traite qu'un canal
 * - Réduit considérablement la taille (ex: vidéo 4K 160Mo → audio ~8Mo)
 */
export async function extractAndConvertAudio(
  inputBuffer: Buffer,
  inputExtension: string
): Promise<AudioProcessingOutput> {
  const inputPath = createTempFilePath(inputExtension);
  const outputPath = createTempFilePath('flac');

  try {
    // 1. Écrire le buffer d'entrée dans un fichier temporaire
    fs.writeFileSync(inputPath, inputBuffer);

    // 2. Obtenir la durée du fichier source
    const duration = await getMediaDuration(inputPath);

    // 3. Exécuter FFmpeg pour extraire et convertir l'audio
    await new Promise<void>((resolve, reject) => {
      const args = [
        '-i', inputPath,           // Fichier d'entrée
        '-vn',                     // Pas de vidéo (extraction audio seule)
        '-acodec', 'flac',         // Codec de sortie : FLAC
        '-ar', '16000',            // Taux d'échantillonnage : 16kHz
        '-ac', '1',                // Mono
        '-map', '0:a:0',          // Première piste audio uniquement
        '-y',                      // Écraser le fichier de sortie
        outputPath,
      ];

      console.log(`[AudioProcessor] Running FFmpeg: ${ffmpegPath} ${args.join(' ')}`);

      const proc = spawn(ffmpegPath!, args);
      let stderr = '';

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
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
    });

    // 4. Lire le fichier de sortie
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

    console.log(`[AudioProcessor] Conversion réussie: ${(inputBuffer.length / 1024 / 1024).toFixed(1)}MB → ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB (FLAC 16kHz mono)`);

    return {
      success: true,
      audioBuffer,
      mimeType: 'audio/flac',
      extension: 'flac',
      durationSeconds: duration,
      originalSizeBytes: inputBuffer.length,
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
    // 5. Nettoyer les fichiers temporaires
    await cleanupTempFiles(inputPath, outputPath);
  }
}

/**
 * Pipeline complet : télécharger un fichier depuis S3 via AWS SDK, extraire l'audio, convertir en FLAC
 * 
 * C'est le point d'entrée principal utilisé par le worker de transcription.
 * Utilise le fileKey pour télécharger via AWS SDK (avec credentials) au lieu de l'URL publique.
 */
export async function processMediaFile(
  fileUrl: string,
  fileName: string,
  mimeType: string,
  fileKey?: string
): Promise<AudioProcessingOutput> {
  console.log(`[AudioProcessor] Processing: ${fileName} (${mimeType})`);

  // 1. Valider le format
  if (!isSupportedFormat(mimeType, fileName)) {
    return {
      success: false,
      error: `Format non supporté: ${mimeType}. Formats acceptés: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      code: 'UNSUPPORTED_FORMAT',
    };
  }

  // 2. Télécharger le fichier depuis S3
  let fileBuffer: Buffer;
  try {
    if (fileKey) {
      // Méthode préférée : télécharger via AWS SDK (avec credentials, pas de 403)
      console.log(`[AudioProcessor] Downloading via AWS SDK: ${fileKey}`);
      fileBuffer = await downloadFileFromS3(fileKey);
    } else {
      // Fallback : télécharger via URL publique (pour compatibilité)
      console.log(`[AudioProcessor] Downloading via public URL: ${fileUrl}`);
      fileBuffer = await downloadFileFromUrl(fileUrl);
    }
    console.log(`[AudioProcessor] Downloaded: ${(fileBuffer.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (error: any) {
    return {
      success: false,
      error: `Impossible de télécharger le fichier: ${error.message}`,
      code: 'DOWNLOAD_FAILED',
    };
  }

  // 3. Déterminer l'extension d'entrée
  const inputExtension = fileName.split('.').pop()?.toLowerCase() || 'mp4';

  // 4. Extraire et convertir l'audio
  return await extractAndConvertAudio(fileBuffer, inputExtension);
}
