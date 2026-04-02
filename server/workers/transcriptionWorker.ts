/**
 * Worker de transcription — Pipeline V5 (Architecture Hybride)
 * 
 * Deux modes de fonctionnement :
 * 
 * MODE A — Audio pré-extrait (client WASM) :
 * 1. downloading (0-15%) : Téléchargement du petit fichier audio depuis S3
 * 2. transcribing (15-90%) : Transcription directe via Groq Whisper (pas de FFmpeg)
 * 3. completed (100%)
 * 
 * MODE B — Vidéo brute (fallback) :
 * 1. downloading (0-20%) : Téléchargement du fichier vidéo depuis S3
 * 2. extracting_audio (20-40%) : Extraction audio via FFmpeg
 * 3. transcribing (40-90%) : Transcription via Groq Whisper (avec chunking si nécessaire)
 * 4. completed (100%)
 * 
 * Détection automatique : basée sur l'extension du fichier uploadé.
 * Si le fichier est un audio pur (m4a, ogg, mp3, wav, flac, webm) → Mode A
 * Si le fichier est une vidéo (mp4, mov, avi, mkv) → Mode B
 * 
 * Supporte l'annulation : vérifie le statut en BDD avant chaque étape.
 */

import { getTranscriptionById, updateTranscriptionStatus, updateTranscriptionProgress, updateTranscriptionSegments } from '../db';
import { transcribeAudioBuffer } from './transcribeBuffer';
import { processMediaFile, isAudioFormat } from '../audioProcessor';
import { needsChunking, splitAudioIntoChunks, transcribeChunksParallel, reassembleTranscriptions } from '../audioChunker';
import { retryWithBackoff } from '../utils/retry';
import { downloadFileFromS3 } from '../s3Direct';

// Timeout global pour le worker (10 minutes)
const WORKER_TIMEOUT_MS = 10 * 60 * 1000;

// Map des workers actifs pour permettre l'annulation
const activeWorkers = new Map<number, { cancelled: boolean }>();

/**
 * Vérifier si une transcription a été annulée
 */
async function isCancelled(transcriptionId: number): Promise<boolean> {
  const worker = activeWorkers.get(transcriptionId);
  if (worker?.cancelled) return true;

  const transcription = await getTranscriptionById(transcriptionId);
  if (transcription?.status === 'cancelled') {
    if (worker) worker.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Annuler un worker en cours
 */
export function cancelTranscriptionWorker(transcriptionId: number): boolean {
  const worker = activeWorkers.get(transcriptionId);
  if (worker) {
    worker.cancelled = true;
    return true;
  }
  return false;
}

/**
 * Déclencher le worker de transcription de manière asynchrone
 */
export async function triggerTranscriptionWorker(transcriptionId: number) {
  activeWorkers.set(transcriptionId, { cancelled: false });

  processTranscription(transcriptionId).catch((error) => {
    console.error(`[Worker] FATAL error for transcription ${transcriptionId}:`, error);
    updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage: `Worker crash: ${error?.message || 'Unknown error'}`,
      processingStep: 'error',
      processingProgress: 0,
    }).catch(() => {});
  }).finally(() => {
    activeWorkers.delete(transcriptionId);
  });
}

/**
 * Traiter une transcription avec timeout global
 */
async function processTranscription(transcriptionId: number) {
  const startTime = Date.now();
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Worker timeout: transcription ${transcriptionId} exceeded ${WORKER_TIMEOUT_MS / 1000}s`));
    }, WORKER_TIMEOUT_MS);
  });

  await Promise.race([
    doProcessTranscription(transcriptionId, startTime),
    timeoutPromise,
  ]);
}

/**
 * Déterminer si un fichier est un audio pur (pas besoin de FFmpeg)
 * basé sur l'extension du fichier uploadé
 */
function isUploadedAudioFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'].includes(ext);
}

/**
 * Obtenir le MIME type à partir du nom de fichier
 */
function getMimeTypeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mimeMap: Record<string, string> = {
    'mov': 'video/quicktime',
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * MODE A : Pipeline audio direct (pas de FFmpeg)
 * 
 * Pour les fichiers audio pré-extraits côté client ou les uploads audio directs.
 * Télécharge le fichier depuis S3 et l'envoie directement à Groq Whisper.
 */
async function processAudioDirect(
  transcriptionId: number,
  fileKey: string,
  fileName: string,
  startTime: number
): Promise<void> {
  const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Worker][${transcriptionId}][${elapsed}s][AUDIO_DIRECT] ${msg}`);
  };

  // === TÉLÉCHARGEMENT (0-15%) ===
  await updateTranscriptionProgress(transcriptionId, 'downloading', 5);
  log(`Downloading audio: ${fileKey}`);

  if (await isCancelled(transcriptionId)) { log('Cancelled before download'); return; }

  const audioBuffer = await downloadFileFromS3(fileKey);
  const sizeMB = audioBuffer.length / (1024 * 1024);
  log(`Downloaded: ${sizeMB.toFixed(1)} MB`);

  await updateTranscriptionProgress(transcriptionId, 'downloading', 15);

  if (await isCancelled(transcriptionId)) { log('Cancelled after download'); return; }

  // === TRANSCRIPTION (15-90%) ===
  const mimeType = getMimeTypeFromFileName(fileName);
  let transcriptText: string;
  let detectedLanguage: string = 'fr';
  let totalDuration: number = 0;

  if (needsChunking(audioBuffer.length)) {
    // Fichier audio > 20 Mo → chunking nécessaire (conversion FLAC + split)
    log(`Audio needs chunking: ${sizeMB.toFixed(1)} MB > 20 MB`);
    await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 20);

    // Pour le chunking, on doit convertir en FLAC via processMediaFile
    const audioResult = await processMediaFile(
      '', // pas d'URL publique
      fileName,
      mimeType,
      fileKey
    );

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    await updateTranscriptionProgress(transcriptionId, 'transcribing', 40);

    const { chunks, totalDuration: chunkTotalDuration, tempFiles } = await splitAudioIntoChunks(
      audioResult.audioBuffer,
      audioResult.extension
    );

    const totalChunks = chunks.length;
    log(`Split into ${totalChunks} chunks`);

    try {
      let completedChunks = 0;

      const chunkResults = await transcribeChunksParallel(
        chunks,
        async (buffer, chunkMimeType) => {
          if (await isCancelled(transcriptionId)) {
            throw new Error('Transcription cancelled by user');
          }

          const retryResult = await retryWithBackoff(
            async () => transcribeAudioBuffer(buffer, chunkMimeType, 'fr'),
            {
              maxAttempts: 3,
              initialDelayMs: 2000,
              backoffMultiplier: 2,
              onRetry: (attempt, error) => {
                log(`Chunk retry ${attempt}/3: ${error.message}`);
              },
            }
          );

          if (!retryResult.success || !retryResult.result) {
            throw retryResult.error || new Error('Chunk transcription failed');
          }

          completedChunks++;
          const chunkProgress = 40 + Math.floor((completedChunks / totalChunks) * 50);
          await updateTranscriptionProgress(
            transcriptionId,
            `transcribing_${completedChunks}/${totalChunks}`,
            chunkProgress
          );
          log(`Chunk ${completedChunks}/${totalChunks} completed (${chunkProgress}%)`);

          return retryResult.result;
        }
      );

      transcriptText = reassembleTranscriptions(chunkResults);
      detectedLanguage = chunkResults[0]?.language || 'fr';
      totalDuration = chunkTotalDuration || 0;
    } finally {
      for (const tempFile of tempFiles) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {}
      }
    }

  } else {
    // Fichier audio < 20 Mo → transcription directe (PAS de FFmpeg !)
    log(`Direct transcription: ${sizeMB.toFixed(1)} MB (no FFmpeg needed)`);
    await updateTranscriptionProgress(transcriptionId, 'transcribing', 30);

    if (await isCancelled(transcriptionId)) { log('Cancelled before transcription'); return; }

    const retryResult = await retryWithBackoff(
      async () => transcribeAudioBuffer(audioBuffer, mimeType, 'fr'),
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          log(`Retry attempt ${attempt}/3: ${error.message}`);
        },
      }
    );

    if (!retryResult.success || !retryResult.result) {
      throw retryResult.error || new Error('Transcription failed after 3 attempts');
    }

    transcriptText = retryResult.result.text;
    detectedLanguage = retryResult.result.language;
    totalDuration = retryResult.result.duration || 0;
    // Stocker les segments Whisper pour la mise en évidence de confiance
    if (retryResult.result.segments && retryResult.result.segments.length > 0) {
      try {
        await updateTranscriptionSegments(transcriptionId, JSON.stringify(retryResult.result.segments));
        log(`Stored ${retryResult.result.segments.length} Whisper segments`);
      } catch (e) {
        log(`Warning: could not store segments: ${e}`);
      }
    }

    await updateTranscriptionProgress(transcriptionId, 'transcribing', 90);
  }

  if (await isCancelled(transcriptionId)) { log('Cancelled before saving'); return; }

  // === SAUVEGARDE (90-100%) ===
  await updateTranscriptionProgress(transcriptionId, 'saving', 95);

  await updateTranscriptionStatus(transcriptionId, 'completed', {
    transcriptText,
    duration: Math.floor(totalDuration),
    processingStep: 'completed',
    processingProgress: 100,
  });

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`COMPLETED: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s, total time: ${totalElapsed}s`);
}

/**
 * MODE B : Pipeline vidéo complet (avec FFmpeg)
 * 
 * Pour les fichiers vidéo (fallback quand WASM échoue côté client).
 * Pipeline : S3 → disque → FFmpeg → FLAC → Groq Whisper
 */
async function processVideoFull(
  transcriptionId: number,
  fileKey: string,
  fileName: string,
  fileUrl: string,
  startTime: number
): Promise<void> {
  const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Worker][${transcriptionId}][${elapsed}s][VIDEO_FULL] ${msg}`);
  };

  const mimeType = getMimeTypeFromFileName(fileName);

  // === TÉLÉCHARGEMENT + EXTRACTION AUDIO (0-40%) ===
  await updateTranscriptionProgress(transcriptionId, 'downloading', 10);
  log(`Starting video pipeline: ${fileName} (${mimeType})`);

  if (await isCancelled(transcriptionId)) { log('Cancelled before download'); return; }

  await updateTranscriptionProgress(transcriptionId, 'downloading', 15);

  const audioResult = await processMediaFile(
    fileUrl,
    fileName,
    mimeType,
    fileKey ?? undefined
  );

  if (!audioResult.success) {
    throw new Error(`Audio processing failed: ${audioResult.error}`);
  }

  await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 30);
  log(`Audio extracted: ${(audioResult.processedSizeBytes / 1024 / 1024).toFixed(1)}MB FLAC, duration: ${audioResult.durationSeconds.toFixed(1)}s`);

  if (await isCancelled(transcriptionId)) { log('Cancelled after audio extraction'); return; }

  await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 40);

  // === TRANSCRIPTION (40-90%) ===
  await updateTranscriptionProgress(transcriptionId, 'transcribing', 45);

  let transcriptText: string;
  let detectedLanguage: string = 'fr';
  let totalDuration: number = audioResult.durationSeconds;

  if (needsChunking(audioResult.audioBuffer.length)) {
    log(`Chunking needed: ${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB > 20MB`);

    const { chunks, totalDuration: chunkTotalDuration, tempFiles } = await splitAudioIntoChunks(
      audioResult.audioBuffer,
      audioResult.extension
    );

    const totalChunks = chunks.length;
    log(`Split into ${totalChunks} chunks`);

    try {
      let completedChunks = 0;

      const chunkResults = await transcribeChunksParallel(
        chunks,
        async (buffer, chunkMimeType) => {
          if (await isCancelled(transcriptionId)) {
            throw new Error('Transcription cancelled by user');
          }

          const retryResult = await retryWithBackoff(
            async () => transcribeAudioBuffer(buffer, chunkMimeType, 'fr'),
            {
              maxAttempts: 3,
              initialDelayMs: 2000,
              backoffMultiplier: 2,
              onRetry: (attempt, error) => {
                log(`Chunk retry ${attempt}/3: ${error.message}`);
              },
            }
          );

          if (!retryResult.success || !retryResult.result) {
            throw retryResult.error || new Error('Chunk transcription failed');
          }

          completedChunks++;
          const chunkProgress = 45 + Math.floor((completedChunks / totalChunks) * 45);
          await updateTranscriptionProgress(
            transcriptionId,
            `transcribing_${completedChunks}/${totalChunks}`,
            chunkProgress
          );
          log(`Chunk ${completedChunks}/${totalChunks} completed (${chunkProgress}%)`);

          return retryResult.result;
        }
      );

      transcriptText = reassembleTranscriptions(chunkResults);
      detectedLanguage = chunkResults[0]?.language || 'fr';
      totalDuration = chunkTotalDuration || totalDuration;

      log(`Reassembled ${chunkResults.length} chunks → ${transcriptText.length} chars`);
    } finally {
      for (const tempFile of tempFiles) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        } catch {}
      }
    }

  } else {
    log(`Direct transcription: ${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);
    await updateTranscriptionProgress(transcriptionId, 'transcribing', 55);

    if (await isCancelled(transcriptionId)) { log('Cancelled before transcription'); return; }

    const retryResult = await retryWithBackoff(
      async () => transcribeAudioBuffer(audioResult.audioBuffer, 'audio/flac', 'fr'),
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          log(`Retry attempt ${attempt}/3: ${error.message}`);
        },
      }
    );

    if (!retryResult.success || !retryResult.result) {
      throw retryResult.error || new Error('Transcription failed after 3 attempts');
    }

    transcriptText = retryResult.result.text;
    detectedLanguage = retryResult.result.language;
    totalDuration = retryResult.result.duration || totalDuration;
    // Stocker les segments Whisper pour la mise en évidence de confiance
    if (retryResult.result.segments && retryResult.result.segments.length > 0) {
      try {
        await updateTranscriptionSegments(transcriptionId, JSON.stringify(retryResult.result.segments));
        log(`Stored ${retryResult.result.segments.length} Whisper segments`);
      } catch (e) {
        log(`Warning: could not store segments: ${e}`);
      }
    }

    await updateTranscriptionProgress(transcriptionId, 'transcribing', 90);
  }

  if (await isCancelled(transcriptionId)) { log('Cancelled before saving'); return; }

  // === SAUVEGARDE (90-100%) ===
  await updateTranscriptionProgress(transcriptionId, 'saving', 95);

  await updateTranscriptionStatus(transcriptionId, 'completed', {
    transcriptText,
    duration: Math.floor(totalDuration),
    processingStep: 'completed',
    processingProgress: 100,
  });

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`COMPLETED: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s, total time: ${totalElapsed}s`);
}

/**
 * Logique principale : routage vers le bon pipeline
 */
async function doProcessTranscription(transcriptionId: number, startTime: number) {
  const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Worker][${transcriptionId}][${elapsed}s] ${msg}`);
  };

  try {
    log('Starting transcription');
    
    const transcription = await getTranscriptionById(transcriptionId);
    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }

    await updateTranscriptionStatus(transcriptionId, 'processing', {
      processingStep: 'downloading',
      processingProgress: 5,
    });
    log(`File: ${transcription.fileName} | Key: ${transcription.fileKey}`);

    // === ROUTAGE : Audio direct vs Vidéo complète ===
    const fileKey = transcription.fileKey;
    if (!fileKey) {
      throw new Error('Missing fileKey for S3 download');
    }

    if (isUploadedAudioFile(transcription.fileName)) {
      // MODE A : Le fichier uploadé est un audio pur
      // (soit extraction WASM côté client, soit upload audio direct)
      log(`MODE A: Audio direct pipeline (${transcription.fileName})`);
      await processAudioDirect(transcriptionId, fileKey, transcription.fileName, startTime);
    } else {
      // MODE B : Le fichier uploadé est une vidéo (fallback)
      log(`MODE B: Video full pipeline (${transcription.fileName})`);
      await processVideoFull(transcriptionId, fileKey, transcription.fileName, transcription.fileUrl, startTime);
    }

  } catch (error: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Worker][${transcriptionId}][${totalElapsed}s] FAILED:`, error);

    if (await isCancelled(transcriptionId)) {
      log('Worker stopped due to cancellation');
      return;
    }

    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';
    
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage,
      processingStep: 'error',
      processingProgress: 0,
    });

    log(`Marked as error: ${errorMessage}`);
  }
}
