/**
 * Worker de transcription — Pipeline complet V3
 * 
 * Pipeline optimisé pour les gros fichiers :
 * 1. Récupérer la transcription depuis la BDD
 * 2. Mettre à jour le statut à "processing"
 * 3. Télécharger le fichier depuis S3 en streaming vers le disque (pas de Buffer en mémoire)
 * 4. Extraire l'audio via FFmpeg (conversion MOV/MP4/etc → FLAC 16kHz mono)
 * 5. Si audio > 20 Mo → chunking automatique avec chevauchement
 * 6. Transcrire chaque chunk (ou le fichier entier) via Groq Whisper
 * 7. Réassembler les transcriptions (si chunking)
 * 8. Sauvegarder le résultat en BDD
 * 
 * Optimisations mémoire :
 * - S3 → disque en streaming (pas de Buffer 550 Mo en mémoire)
 * - FFmpeg lit/écrit sur le disque
 * - Seul le FLAC résultant (~2-10 Mo) est chargé en mémoire
 * - Timeout global de 10 minutes
 */

import { getTranscriptionById, updateTranscriptionStatus } from '../db';
import { transcribeAudioBuffer } from './transcribeBuffer';
import { processMediaFile } from '../audioProcessor';
import { needsChunking, splitAudioIntoChunks, transcribeChunksParallel, reassembleTranscriptions } from '../audioChunker';
import { retryWithBackoff } from '../utils/retry';

// Timeout global pour le worker (10 minutes)
const WORKER_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Déclencher le worker de transcription de manière asynchrone
 * Cette fonction ne bloque pas la requête HTTP
 */
export async function triggerTranscriptionWorker(transcriptionId: number) {
  // Lancer le worker en arrière-plan (non-bloquant)
  processTranscription(transcriptionId).catch((error) => {
    console.error(`[Worker] FATAL error for transcription ${transcriptionId}:`, error);
    // Tenter de marquer comme erreur en BDD même en cas de crash
    updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage: `Worker crash: ${error?.message || 'Unknown error'}`,
    }).catch(() => {});
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
 * Logique principale de traitement
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

    // 2. Mettre à jour le statut à "processing"
    await updateTranscriptionStatus(transcriptionId, 'processing');
    log(`Status: processing | File: ${transcription.fileName} | Key: ${transcription.fileKey}`);

    // 3. Extraire l'audio via FFmpeg (streaming S3 → disque → FFmpeg → FLAC)
    log('Starting audio processing (S3 streaming → FFmpeg)...');
    const audioResult = await processMediaFile(
      transcription.fileUrl,
      transcription.fileName,
      getMimeTypeFromFileName(transcription.fileName),
      transcription.fileKey ?? undefined
    );

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    log(`Audio extracted: ${(audioResult.processedSizeBytes / 1024 / 1024).toFixed(1)}MB FLAC, duration: ${audioResult.durationSeconds.toFixed(1)}s`);

    // 4. Vérifier si le chunking est nécessaire
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

      log(`Split into ${chunks.length} chunks`);

      try {
        // Transcrire les chunks en parallèle (max 3 simultanés)
        const chunkResults = await transcribeChunksParallel(
          chunks,
          async (buffer, mimeType) => {
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
    }

    // 5. Sauvegarder le résultat
    await updateTranscriptionStatus(transcriptionId, 'completed', {
      transcriptText,
      duration: Math.floor(totalDuration),
    });

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`✅ COMPLETED: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s, total time: ${totalElapsed}s`);

  } catch (error: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Worker][${transcriptionId}][${totalElapsed}s] ❌ FAILED:`, error);

    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';
    
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage,
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
