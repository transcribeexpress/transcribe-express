/**
 * Route SSE de transcription — Traitement en streaming
 * 
 * Problème résolu : En production (hébergement serverless/Cloud Run), les processus
 * fire-and-forget sont tués quand il n'y a plus de requête HTTP active.
 * 
 * Solution : Le traitement de transcription se fait dans le contexte d'une connexion
 * SSE (Server-Sent Events) maintenue ouverte par le client. Le serveur envoie des
 * événements de progression en temps réel. Tant que la connexion est ouverte, le
 * processus reste actif.
 * 
 * Endpoint : GET /api/transcribe-stream/:id
 * Auth : Session cookie (même auth que tRPC)
 * Response : text/event-stream (SSE)
 * 
 * Events envoyés :
 * - progress: { step, progress, message }
 * - completed: { transcriptionId }
 * - error: { message }
 */
import { Router, Request, Response } from 'express';
import { getTranscriptionById, updateTranscriptionStatus, updateTranscriptionProgress, updateTranscriptionSegments } from './db';
import { transcribeAudioBuffer } from './workers/transcribeBuffer';
import { processMediaFile, isAudioFormat } from './audioProcessor';
import { needsChunking, splitAudioIntoChunks, transcribeChunksParallel, reassembleTranscriptions } from './audioChunker';
import { retryWithBackoff } from './utils/retry';
import { downloadFileFromS3 } from './s3Direct';

export const transcribeStreamRouter = Router();

// Extensions audio pures (Mode A : pas besoin de FFmpeg pour l'extraction)
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm'];

function isUploadedAudioFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return AUDIO_EXTENSIONS.includes(ext);
}

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
 * Envoyer un événement SSE au client
 */
function sendSSE(res: Response, event: string, data: any) {
  if (!res.writableEnded) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * GET /api/transcribe-stream/:id
 * 
 * Lance ou reprend la transcription d'un fichier et envoie la progression via SSE.
 * Le client maintient cette connexion ouverte pendant toute la durée du traitement.
 */
transcribeStreamRouter.get('/transcribe-stream/:id', async (req: Request, res: Response) => {
  const transcriptionId = parseInt(req.params.id, 10);
  const user = (req as any).user;
  
  if (!user) {
    res.status(401).json({ error: 'Non authentifié' });
    return;
  }
  
  if (isNaN(transcriptionId)) {
    res.status(400).json({ error: 'ID de transcription invalide' });
    return;
  }

  // Vérifier la transcription
  const transcription = await getTranscriptionById(transcriptionId);
  if (!transcription) {
    res.status(404).json({ error: 'Transcription non trouvée' });
    return;
  }
  if (transcription.userId !== user.openId) {
    res.status(403).json({ error: 'Accès refusé' });
    return;
  }

  // Si déjà complétée ou en erreur, retourner immédiatement
  if (transcription.status === 'completed') {
    res.status(200).json({ status: 'completed', transcriptionId });
    return;
  }
  if (transcription.status === 'error') {
    res.status(200).json({ status: 'error', message: transcription.errorMessage });
    return;
  }
  if (transcription.status === 'cancelled') {
    res.status(200).json({ status: 'cancelled' });
    return;
  }

  // Configurer SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Désactiver le buffering nginx/proxy
  });

  // Keep-alive : envoyer un commentaire toutes les 15s pour garder la connexion ouverte
  const keepAliveInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': keep-alive\n\n');
    }
  }, 15000);

  let cancelled = false;
  req.on('close', () => {
    cancelled = true;
    clearInterval(keepAliveInterval);
  });

  const startTime = Date.now();
  const log = (msg: string) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[TranscribeStream][${transcriptionId}][${elapsed}s] ${msg}`);
  };

  try {
    // Mettre à jour le statut en BDD
    await updateTranscriptionStatus(transcriptionId, 'processing', {
      processingStep: 'downloading',
      processingProgress: 5,
    });
    sendSSE(res, 'progress', { step: 'downloading', progress: 5, message: 'Téléchargement du fichier...' });

    const fileKey = transcription.fileKey;
    if (!fileKey) {
      throw new Error('Missing fileKey for S3 download');
    }

    // Vérifier l'annulation
    if (cancelled) { log('Cancelled by client'); return; }

    // Télécharger le fichier depuis S3
    log(`Downloading: ${fileKey}`);
    const audioBuffer = await downloadFileFromS3(fileKey);
    const sizeMB = audioBuffer.length / (1024 * 1024);
    log(`Downloaded: ${sizeMB.toFixed(1)} MB`);

    await updateTranscriptionProgress(transcriptionId, 'downloading', 15);
    sendSSE(res, 'progress', { step: 'downloading', progress: 15, message: `Fichier téléchargé (${sizeMB.toFixed(1)} Mo)` });

    if (cancelled) { log('Cancelled by client'); return; }

    let transcriptText: string;
    let detectedLanguage: string = 'fr';
    let totalDuration: number = 0;

    if (isUploadedAudioFile(transcription.fileName)) {
      // === MODE A : Audio direct ===
      log(`MODE A: Audio direct (${transcription.fileName})`);
      const mimeType = getMimeTypeFromFileName(transcription.fileName);

      if (needsChunking(audioBuffer.length)) {
        // Audio > 20 Mo → chunking
        log(`Audio needs chunking: ${sizeMB.toFixed(1)} MB > 20 MB`);
        sendSSE(res, 'progress', { step: 'extracting_audio', progress: 20, message: 'Préparation audio pour chunking...' });
        await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 20);

        const audioResult = await processMediaFile('', transcription.fileName, mimeType, fileKey);
        if (!audioResult.success) {
          throw new Error(`Audio processing failed: ${audioResult.error}`);
        }

        sendSSE(res, 'progress', { step: 'transcribing', progress: 35, message: 'Découpage en segments...' });
        await updateTranscriptionProgress(transcriptionId, 'transcribing', 35);

        if (cancelled) { log('Cancelled by client'); return; }

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
              if (cancelled) throw new Error('Cancelled by client');
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
              const chunkProgress = 35 + Math.floor((completedChunks / totalChunks) * 55);
              await updateTranscriptionProgress(transcriptionId, `transcribing_${completedChunks}/${totalChunks}`, chunkProgress);
              sendSSE(res, 'progress', { step: `transcribing`, progress: chunkProgress, message: `Transcription segment ${completedChunks}/${totalChunks}...` });
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
        // Audio < 20 Mo → transcription directe
        log(`Direct transcription: ${sizeMB.toFixed(1)} MB`);
        sendSSE(res, 'progress', { step: 'transcribing', progress: 30, message: 'Transcription en cours...' });
        await updateTranscriptionProgress(transcriptionId, 'transcribing', 30);

        if (cancelled) { log('Cancelled by client'); return; }

        const retryResult = await retryWithBackoff(
          async () => transcribeAudioBuffer(audioBuffer, mimeType, 'fr'),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            backoffMultiplier: 2,
            onRetry: (attempt, error) => {
              log(`Retry attempt ${attempt}/3: ${error.message}`);
              sendSSE(res, 'progress', { step: 'transcribing', progress: 30, message: `Nouvelle tentative ${attempt}/3...` });
            },
          }
        );

        if (!retryResult.success || !retryResult.result) {
          throw retryResult.error || new Error('Transcription failed after 3 attempts');
        }

        transcriptText = retryResult.result.text;
        detectedLanguage = retryResult.result.language;
        totalDuration = retryResult.result.duration || 0;

        // Stocker les segments Whisper
        if (retryResult.result.segments && retryResult.result.segments.length > 0) {
          try {
            await updateTranscriptionSegments(transcriptionId, JSON.stringify(retryResult.result.segments));
            log(`Stored ${retryResult.result.segments.length} Whisper segments`);
          } catch (e) {
            log(`Warning: could not store segments: ${e}`);
          }
        }

        await updateTranscriptionProgress(transcriptionId, 'transcribing', 90);
        sendSSE(res, 'progress', { step: 'transcribing', progress: 90, message: 'Transcription terminée' });
      }
    } else {
      // === MODE B : Vidéo → extraction audio + transcription ===
      log(`MODE B: Video pipeline (${transcription.fileName})`);
      sendSSE(res, 'progress', { step: 'extracting_audio', progress: 20, message: 'Extraction audio de la vidéo...' });
      await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 20);

      const mimeType = getMimeTypeFromFileName(transcription.fileName);
      const audioResult = await processMediaFile(
        transcription.fileUrl || '',
        transcription.fileName,
        mimeType,
        fileKey
      );

      if (!audioResult.success) {
        throw new Error(`Audio extraction failed: ${audioResult.error}`);
      }

      log(`Audio extracted: ${(audioResult.audioBuffer.length / 1024 / 1024).toFixed(1)} MB`);
      sendSSE(res, 'progress', { step: 'extracting_audio', progress: 35, message: 'Audio extrait avec succès' });
      await updateTranscriptionProgress(transcriptionId, 'extracting_audio', 35);

      if (cancelled) { log('Cancelled by client'); return; }

      // Transcription de l'audio extrait
      if (needsChunking(audioResult.audioBuffer.length)) {
        sendSSE(res, 'progress', { step: 'transcribing', progress: 40, message: 'Découpage en segments...' });
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
              if (cancelled) throw new Error('Cancelled by client');
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
              await updateTranscriptionProgress(transcriptionId, `transcribing_${completedChunks}/${totalChunks}`, chunkProgress);
              sendSSE(res, 'progress', { step: 'transcribing', progress: chunkProgress, message: `Transcription segment ${completedChunks}/${totalChunks}...` });
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
        // Audio extrait < 20 Mo → transcription directe
        sendSSE(res, 'progress', { step: 'transcribing', progress: 45, message: 'Transcription en cours...' });
        await updateTranscriptionProgress(transcriptionId, 'transcribing', 45);

        if (cancelled) { log('Cancelled by client'); return; }

        const retryResult = await retryWithBackoff(
          async () => transcribeAudioBuffer(audioResult.audioBuffer, `audio/${audioResult.extension}`, 'fr'),
          {
            maxAttempts: 3,
            initialDelayMs: 1000,
            backoffMultiplier: 2,
            onRetry: (attempt, error) => {
              log(`Retry attempt ${attempt}/3: ${error.message}`);
              sendSSE(res, 'progress', { step: 'transcribing', progress: 45, message: `Nouvelle tentative ${attempt}/3...` });
            },
          }
        );

        if (!retryResult.success || !retryResult.result) {
          throw retryResult.error || new Error('Transcription failed after 3 attempts');
        }

        transcriptText = retryResult.result.text;
        detectedLanguage = retryResult.result.language;
        totalDuration = retryResult.result.duration || 0;

        if (retryResult.result.segments && retryResult.result.segments.length > 0) {
          try {
            await updateTranscriptionSegments(transcriptionId, JSON.stringify(retryResult.result.segments));
          } catch {}
        }

        await updateTranscriptionProgress(transcriptionId, 'transcribing', 90);
        sendSSE(res, 'progress', { step: 'transcribing', progress: 90, message: 'Transcription terminée' });
      }
    }

    if (cancelled) { log('Cancelled by client before save'); return; }

    // === SAUVEGARDE ===
    sendSSE(res, 'progress', { step: 'saving', progress: 95, message: 'Sauvegarde...' });
    await updateTranscriptionStatus(transcriptionId, 'completed', {
      transcriptText,
      duration: Math.floor(totalDuration),
      processingStep: 'completed',
      processingProgress: 100,
    });

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`COMPLETED: ${transcriptText.length} chars, ${Math.floor(totalDuration)}s audio, ${totalElapsed}s total`);

    sendSSE(res, 'completed', { transcriptionId, duration: Math.floor(totalDuration) });

  } catch (error: any) {
    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[TranscribeStream][${transcriptionId}][${totalElapsed}s] FAILED:`, error);

    const errorMessage = error.message || 'Erreur inconnue lors de la transcription';

    // Ne pas écraser le statut si déjà cancelled
    const current = await getTranscriptionById(transcriptionId);
    if (current && current.status !== 'cancelled') {
      await updateTranscriptionStatus(transcriptionId, 'error', {
        errorMessage,
        processingStep: 'error',
        processingProgress: 0,
      });
    }

    sendSSE(res, 'error', { message: errorMessage });
  } finally {
    clearInterval(keepAliveInterval);
    if (!res.writableEnded) {
      res.end();
    }
  }
});
