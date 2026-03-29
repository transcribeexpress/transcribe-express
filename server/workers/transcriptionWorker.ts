/**
 * Worker de transcription — Pipeline complet
 * 
 * Pipeline V2 :
 * 1. Récupérer la transcription depuis la BDD
 * 2. Mettre à jour le statut à "processing"
 * 3. Télécharger le fichier depuis S3
 * 4. Extraire l'audio via FFmpeg (conversion MOV/MP4/etc → FLAC 16kHz mono)
 * 5. Si audio > 20 Mo → chunking automatique avec chevauchement
 * 6. Transcrire chaque chunk (ou le fichier entier) via Groq Whisper
 * 7. Réassembler les transcriptions (si chunking)
 * 8. Sauvegarder le résultat en BDD
 */

import { getTranscriptionById, updateTranscriptionStatus } from '../db';
import { transcribeAudioBuffer } from './transcribeBuffer';
import { processMediaFile } from '../audioProcessor';
import { needsChunking, splitAudioIntoChunks, transcribeChunksParallel, reassembleTranscriptions } from '../audioChunker';
import { retryWithBackoff } from '../utils/retry';

/**
 * Déclencher le worker de transcription de manière asynchrone
 * Cette fonction ne bloque pas la requête HTTP
 */
export async function triggerTranscriptionWorker(transcriptionId: number) {
  // Lancer le worker en arrière-plan (non-bloquant)
  processTranscription(transcriptionId).catch((error) => {
    console.error(`[Worker] Error for transcription ${transcriptionId}:`, error);
  });
}

/**
 * Traiter une transcription de manière asynchrone
 */
async function processTranscription(transcriptionId: number) {
  try {
    console.log(`[Worker] Starting transcription ${transcriptionId}`);
    
    // 1. Récupérer la transcription
    const transcription = await getTranscriptionById(transcriptionId);
    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }

    // 2. Mettre à jour le statut à "processing"
    await updateTranscriptionStatus(transcriptionId, 'processing');
    console.log(`[Worker] Transcription ${transcriptionId} status: processing`);

    // 3. Extraire l'audio via FFmpeg (gère MOV, MP4, AVI, MKV, etc.)
    console.log(`[Worker] Processing media file: ${transcription.fileName}`);
    const audioResult = await processMediaFile(
      transcription.fileUrl,
      transcription.fileName,
      getMimeTypeFromFileName(transcription.fileName)
    );

    if (!audioResult.success) {
      throw new Error(`Audio processing failed: ${audioResult.error}`);
    }

    console.log(`[Worker] Audio extracted: ${(audioResult.processedSizeBytes / 1024 / 1024).toFixed(1)}MB, duration: ${audioResult.durationSeconds.toFixed(1)}s`);

    // 4. Vérifier si le chunking est nécessaire
    let transcriptText: string;
    let detectedLanguage: string = 'fr';
    let totalDuration: number = audioResult.durationSeconds;

    if (needsChunking(audioResult.audioBuffer.length)) {
      // ===== MODE CHUNKING =====
      console.log(`[Worker] File needs chunking (${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB > 20MB)`);

      const { chunks, totalDuration: chunkTotalDuration, tempFiles } = await splitAudioIntoChunks(
        audioResult.audioBuffer,
        audioResult.extension
      );

      console.log(`[Worker] Split into ${chunks.length} chunks`);

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
                  console.log(`[Worker] Chunk retry ${attempt}/3: ${error.message}`);
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

        console.log(`[Worker] Reassembled ${chunkResults.length} chunks → ${transcriptText.length} chars`);
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
      console.log(`[Worker] Direct transcription (${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

      const retryResult = await retryWithBackoff(
        async () => transcribeAudioBuffer(audioResult.audioBuffer, 'audio/flac', 'fr'),
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, error) => {
            console.log(`[Worker] Retry attempt ${attempt}/3 for transcription ${transcriptionId}: ${error.message}`);
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

    console.log(`[Worker] Transcription ${transcriptionId} completed: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s`);

  } catch (error: any) {
    console.error(`[Worker] Failed to process transcription ${transcriptionId}:`, error);

    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';
    
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage,
    });

    console.log(`[Worker] Transcription ${transcriptionId} marked as error`);
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
