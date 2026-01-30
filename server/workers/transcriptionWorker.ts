import { getTranscriptionById, updateTranscriptionStatus } from '../db';
import { transcribeAudio } from '../_core/voiceTranscription';
import { retryWithBackoff, isRetryableError } from '../utils/retry';

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
 * 1. Récupérer la transcription depuis la BDD
 * 2. Mettre à jour le statut à "processing"
 * 3. Appeler Groq API (Whisper)
 * 4. Mettre à jour avec le résultat (completed ou error)
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

    // 3. Appeler Groq API (Whisper Large v3-turbo) avec retry automatique
    console.log(`[Worker] Calling Groq API for transcription ${transcriptionId}`);
    
    const retryResult = await retryWithBackoff(
      async () => {
        return await transcribeAudio({
          audioUrl: transcription.fileUrl,
          language: 'fr', // Français par défaut
          prompt: 'Transcription audio/vidéo en français', // Contexte pour améliorer la précision
        });
      },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          console.log(
            `[Worker] Retry attempt ${attempt}/3 for transcription ${transcriptionId}. Error: ${error.message}`
          );
        },
      }
    );
    
    // Vérifier si le retry a échoué
    if (!retryResult.success) {
      throw retryResult.error || new Error('Transcription failed after 3 attempts');
    }
    
    const result = retryResult.result!;

    // Vérifier si c'est une erreur
    if ('error' in result) {
      throw new Error(result.error);
    }

    console.log(`[Worker] Transcription ${transcriptionId} completed. Text length: ${result.text?.length || 0} chars`);

    // 4. Mettre à jour avec le résultat (completed)
    await updateTranscriptionStatus(transcriptionId, 'completed', {
      transcriptText: result.text || '',
      duration: result.duration ? Math.floor(result.duration) : undefined,
    });

    console.log(`[Worker] Transcription ${transcriptionId} saved to database`);

  } catch (error: any) {
    console.error(`[Worker] Failed to process transcription ${transcriptionId}:`, error);

    // 5. Gérer les erreurs
    const isRetryable = error instanceof Error && isRetryableError(error);
    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';
    const detailedError = isRetryable 
      ? `${errorMessage} (erreur temporaire, réessayez plus tard)`
      : errorMessage;
    
    console.log(`[Worker] Error is ${isRetryable ? 'retryable' : 'not retryable'}`);
    
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage: detailedError,
    });

    console.log(`[Worker] Transcription ${transcriptionId} marked as error`);
  }
}
