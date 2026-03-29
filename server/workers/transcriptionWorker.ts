/**
 * Worker de transcription — Pipeline complet V4
 * 
 * Pipeline avec suivi de progression en temps réel :
 * 1. downloading (0-20%) : Téléchargement depuis S3 vers le disque
 * 2. extracting_audio (20-40%) : Extraction audio via FFmpeg
 * 3. transcribing (40-90%) : Transcription via Groq Whisper (avec chunking si nécessaire)
 * 4. completed (100%) : Terminé
 * 
 * Supporte l'annulation : vérifie le statut en BDD avant chaque étape.
 * 
 * Optimisations mémoire :
 * - S3 → disque en streaming (pas de Buffer 550 Mo en mémoire)
 * - FFmpeg lit/écrit sur le disque
 * - Seul le FLAC résultant (~2-10 Mo) est chargé en mémoire
 * - Timeout global de 10 minutes
 */

import { getTranscriptionById, updateTranscriptionStatus, updateTranscriptionProgress } from '../db';
import { transcribeAudioBuffer } from './transcribeBuffer';
import { processMediaFile } from '../audioProcessor';
import { needsChunking, splitAudioIntoChunks, transcribeChunksParallel, reassembleTranscriptions } from '../audioChunker';
import { retryWithBackoff } from '../utils/retry';

// Timeout global pour le worker (10 minutes)
const WORKER_TIMEOUT_MS = 10 * 60 * 1000;

// Map des workers actifs pour permettre l'annulation
const activeWorkers = new Map<number, { cancelled: boolean }>();

/**
 * Vérifier si une transcription a été annulée
 */
async function isCancelled(transcriptionId: number): Promise<boolean> {
  // Vérifier le flag local d'abord (plus rapide)
  const worker = activeWorkers.get(transcriptionId);
  if (worker?.cancelled) return true;

  // Vérifier en BDD
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
 * Cette fonction ne bloque pas la requête HTTP
 */
export async function triggerTranscriptionWorker(transcriptionId: number) {
  // Enregistrer le worker actif
  activeWorkers.set(transcriptionId, { cancelled: false });

  // Lancer le worker en arrière-plan (non-bloquant)
  processTranscription(transcriptionId).catch((error) => {
    console.error(`[Worker] FATAL error for transcription ${transcriptionId}:`, error);
    // Tenter de marquer comme erreur en BDD même en cas de crash
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
 * Traiter une transcription de manière asynchrone avec timeout global
 */
async function processTranscription(transcriptionId: number) {
  const startTime = Date.now();
  
  // Timeout global
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Worker timeout: transcription ${transcriptionId} exceeded ${WORKER_TIMEOUT_MS / 1000}s`));
    }, WORKER_TIMEOUT_MS);
  });

  // Course entre le traitement et le timeout
  await Promise.race([
    doProcessTranscription(transcriptionId, startTime),
    timeoutPromise,
  ]);
}

/**
 * Logique principale de traitement avec suivi de progression
 */
async function doProcessTranscription(transcriptionId: number, startTime: number) {
  const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Worker][${transcriptionId}][${elapsed}s] ${msg}`);
  };

  try {
    log('Starting transcription');
    
    // 1. Récupérer la transcription
    const transcription = await getTranscriptionById(transcriptionId);
    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }

    // 2. Mettre à jour le statut à "processing" + étape "downloading"
    await updateTranscriptionStatus(transcriptionId, 'processing', {
      processingStep: 'downloading',
      processingProgress: 5,
    });
    log(`Status: processing | File: ${transcription.fileName} | Key: ${transcription.fileKey}`);

    // === ÉTAPE 1 : TÉLÉCHARGEMENT S3 (0-20%) ===
    await updateTranscriptionProgress(transcriptionId, 'downloading', 10);

    // Vérifier annulation
    if (await isCancelled(transcriptionId)) {
      log('Cancelled before download');
      return;
    }

    // 3. Extraire l'audio via FFmpeg (streaming S3 → disque → FFmpeg → FLAC)
    log('Starting audio processing (S3 streaming → FFmpeg)...');
    
    // Mettre à jour la progression pendant le téléchargement
    await updateTranscriptionProgress(transcriptionId, 'downloading', 15);

    const audioResult = await processMediaFile(
      transcription.fileUrl,
      transcription.fileName,
      getMimeTypeFromFileName(transcription.fileName),
      transcription.fileKey ?? undefined
    );

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    // === ÉTAPE 2 : EXTRACTION AUDIO (20-40%) ===
    await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 30);
    log(`Audio extracted: ${(audioResult.processedSizeBytes / 1024 / 1024).toFixed(1)}MB FLAC, duration: ${audioResult.durationSeconds.toFixed(1)}s`);

    // Vérifier annulation
    if (await isCancelled(transcriptionId)) {
      log('Cancelled after audio extraction');
      return;
    }

    await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 40);

    // === ÉTAPE 3 : TRANSCRIPTION (40-90%) ===
    await updateTranscriptionProgress(transcriptionId, 'transcribing', 45);

    let transcriptText: string;
    let detectedLanguage: string = 'fr';
    let totalDuration: number = audioResult.durationSeconds;

    if (needsChunking(audioResult.audioBuffer.length)) {
      // ===== MODE CHUNKING =====
      log(`Chunking needed: ${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB > 20MB`);

      const { chunks, totalDuration: chunkTotalDuration, tempFiles } = await splitAudioIntoChunks(
        audioResult.audioBuffer,
        audioResult.extension
      );

      const totalChunks = chunks.length;
      log(`Split into ${totalChunks} chunks`);

      try {
        let completedChunks = 0;

        // Transcrire les chunks en parallèle (max 3 simultanés)
        const chunkResults = await transcribeChunksParallel(
          chunks,
          async (buffer, mimeType) => {
            // Vérifier annulation avant chaque chunk
            if (await isCancelled(transcriptionId)) {
              throw new Error('Transcription cancelled by user');
            }

            const retryResult = await retryWithBackoff(
              async () => transcribeAudioBuffer(buffer, mimeType, 'fr'),
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

            // Mettre à jour la progression par chunk (45% → 90%)
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

        // Réassembler les transcriptions
        transcriptText = reassembleTranscriptions(chunkResults);
        detectedLanguage = chunkResults[0]?.language || 'fr';
        totalDuration = chunkTotalDuration || totalDuration;

        log(`Reassembled ${chunkResults.length} chunks → ${transcriptText.length} chars`);
      } finally {
        // Nettoyer les fichiers temporaires
        for (const tempFile of tempFiles) {
          try {
            const fs = await import('fs');
            if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          } catch {}
        }
      }

    } else {
      // ===== MODE DIRECT (fichier < 20 Mo) =====
      log(`Direct transcription: ${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);
      await updateTranscriptionProgress(transcriptionId, 'transcribing', 55);

      // Vérifier annulation
      if (await isCancelled(transcriptionId)) {
        log('Cancelled before transcription');
        return;
      }

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

      await updateTranscriptionProgress(transcriptionId, 'transcribing', 90);
    }

    // Vérifier annulation une dernière fois
    if (await isCancelled(transcriptionId)) {
      log('Cancelled before saving');
      return;
    }

    // === ÉTAPE 4 : SAUVEGARDE (90-100%) ===
    await updateTranscriptionProgress(transcriptionId, 'saving', 95);

    // 5. Sauvegarder le résultat
    await updateTranscriptionStatus(transcriptionId, 'completed', {
      transcriptText,
      duration: Math.floor(totalDuration),
      processingStep: 'completed',
      processingProgress: 100,
    });

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`COMPLETED: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s, total time: ${totalElapsed}s`);

  } catch (error: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Worker][${transcriptionId}][${totalElapsed}s] FAILED:`, error);

    // Ne pas écraser le statut si annulé
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

/**
 * Déterminer le MIME type à partir du nom de fichier
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
