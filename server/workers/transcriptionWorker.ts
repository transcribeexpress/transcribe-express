import { getTranscriptionById, updateTranscriptionStatus } from '../db';
import { transcribeAudio } from '../_core/voiceTranscription';

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

    // 3. Appeler Groq API (Whisper Large v3-turbo)
    const result = await transcribeAudio({
      audioUrl: transcription.fileUrl,
      language: 'fr', // Français par défaut
      prompt: 'Transcription audio/vidéo en français', // Contexte pour améliorer la précision
    });

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
    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';
    
    await updateTranscriptionStatus(transcriptionId, 'error', {
      errorMessage,
    });

    console.log(`[Worker] Transcription ${transcriptionId} marked as error`);
  }
}
