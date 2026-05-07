/**
 * Routes d'upload chunked — Gestion des fichiers volumineux sur mobile
 *
 * Architecture V5 (7 mai 2026) — Fire & Forget + Polling :
 *
 * PROBLÈME RACINE : Cloud Run coupe les connexions HTTP après 60 secondes.
 * L'assemblage de 470 Mo (download S3 + écriture disque + upload S3) prend ~60-90s
 * → timeout systématique → 503 {"error":""}
 *
 * SOLUTION : Ne jamais bloquer la connexion HTTP pendant un traitement long.
 * 1. POST /api/upload-chunk-complete → répond 202 Accepted + jobId en < 1s
 * 2. L'assemblage se fait en arrière-plan (setImmediate → pas de blocage)
 * 3. GET /api/upload-chunk-job-status/:jobId → le client poll toutes les 3s
 * 4. Quand status=completed → transcriptionId disponible → redirection
 *
 * Endpoints :
 *   POST /api/upload-chunk
 *     Body (multipart/form-data) :
 *       - uploadId   : string  — ID unique de l'upload (généré côté client)
 *       - chunkIndex : number  — Index du chunk (0-based)
 *       - totalChunks: number  — Nombre total de chunks
 *       - fileName   : string  — Nom du fichier original
 *       - chunk      : Blob    — Données du chunk
 *
 *   GET /api/upload-chunk-status
 *     Query :
 *       - uploadId   : string  — ID unique de l'upload
 *       - totalChunks: number  — Nombre total de chunks attendus
 *
 *   POST /api/upload-chunk-complete
 *     Body (application/json) :
 *       - uploadId   : string  — ID unique de l'upload
 *       - fileName   : string  — Nom du fichier original
 *       - totalChunks: number  — Nombre total de chunks attendus
 *     Réponse : 202 Accepted + { jobId }
 *
 *   GET /api/upload-chunk-job-status/:jobId
 *     Réponse : { status, transcriptionId?, error? }
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';
import { storagePut, storageGet, storageDelete } from './storage';
import { createTranscription, createAssemblyJob, getAssemblyJobById, updateAssemblyJobStatus } from './db';
import { triggerTranscriptionWorker } from './workers/transcriptionWorker';
import { SUPPORTED_EXTENSIONS } from './audioProcessor';

// ─── Configuration S3 ────────────────────────────────────────────────────────

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// ─── Configuration Multer (memoryStorage) ───────────────────────────────────

const uploadChunkMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 Mo par chunk
    files: 1,
  },
}).single('chunk');

// ─── S3 Helpers pour les chunks ──────────────────────────────────────────────

function getChunkS3Key(uploadId: string, chunkIndex: number): string {
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  return `tmp-chunks/${safeId}/chunk-${String(chunkIndex).padStart(5, '0')}`;
}

async function putChunkToS3(uploadId: string, chunkIndex: number, buffer: Buffer) {
  const key = getChunkS3Key(uploadId, chunkIndex);
  return storagePut(key, buffer, 'application/octet-stream');
}

async function chunkExistsOnS3(uploadId: string, chunkIndex: number): Promise<boolean> {
  try {
    const key = getChunkS3Key(uploadId, chunkIndex);
    const { url } = await storageGet(key);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

async function getMissingChunksFromS3(uploadId: string, totalChunks: number): Promise<number[]> {
  const missing: number[] = [];
  const batchSize = 10;
  for (let batchStart = 0; batchStart < totalChunks; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalChunks);
    const checks = [];
    for (let i = batchStart; i < batchEnd; i++) {
      checks.push(chunkExistsOnS3(uploadId, i).then((exists) => ({ index: i, exists })));
    }
    const results = await Promise.all(checks);
    for (const { index, exists } of results) {
      if (!exists) missing.push(index);
    }
  }
  return missing;
}

async function deleteChunkFromS3(uploadId: string, chunkIndex: number): Promise<void> {
  try {
    const key = getChunkS3Key(uploadId, chunkIndex);
    await storageDelete(key);
  } catch (err) {
    console.warn(`[ChunkedUpload] Failed to delete chunk ${chunkIndex}:`, err);
  }
}

async function cleanupChunksFromS3(uploadId: string, totalChunks: number): Promise<void> {
  const batchSize = 10;
  for (let batchStart = 0; batchStart < totalChunks; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalChunks);
    await Promise.all(
      Array.from({ length: batchEnd - batchStart }, (_, i) =>
        deleteChunkFromS3(uploadId, batchStart + i)
      )
    );
  }
}

// ─── Assemblage streaming vers disque ────────────────────────────────────────

async function downloadChunkToStream(
  uploadId: string,
  chunkIndex: number,
  writeStream: fs.WriteStream
): Promise<number> {
  const key = getChunkS3Key(uploadId, chunkIndex);
  const { url } = await storageGet(key);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download chunk ${chunkIndex} from S3 (${response.status})`);
  }
  if (!response.body) {
    throw new Error(`Chunk ${chunkIndex} response has no body`);
  }
  let bytesWritten = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      bytesWritten += value.length;
      await new Promise<void>((resolve, reject) => {
        writeStream.write(value, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }
  return bytesWritten;
}

async function assembleChunksToDisk(
  uploadId: string,
  totalChunks: number,
  ext: string
): Promise<string> {
  const tmpDir = os.tmpdir();
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  const tmpFilePath = path.join(tmpDir, `assembled-${safeId}.${ext}`);
  const writeStream = fs.createWriteStream(tmpFilePath);
  let totalBytes = 0;
  const startTime = Date.now();
  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkBytes = await downloadChunkToStream(uploadId, i, writeStream);
      totalBytes += chunkBytes;
      if ((i + 1) % 5 === 0 || i === totalChunks - 1) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(
          `[ChunkedUpload] Assembled chunk ${i + 1}/${totalChunks} ` +
          `(${(totalBytes / 1024 / 1024).toFixed(1)} MB, ${elapsed}s)`
        );
      }
    }
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const fileSize = fs.statSync(tmpFilePath).size;
    console.log(
      `[ChunkedUpload] Assembly complete: ${(fileSize / 1024 / 1024).toFixed(1)} MB ` +
      `in ${((Date.now() - startTime) / 1000).toFixed(1)}s`
    );
    return tmpFilePath;
  } catch (err) {
    writeStream.destroy();
    try { fs.unlinkSync(tmpFilePath); } catch { /* ignore */ }
    throw err;
  }
}

async function uploadFileTos3Streaming(
  filePath: string,
  fileKey: string,
  mimeType: string
): Promise<string> {
  console.log(`[ChunkedUpload] Streaming upload to S3: ${fileKey}`);
  const fileStream = fs.createReadStream(filePath);
  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: fileStream,
      ContentType: mimeType,
    },
    partSize: 10 * 1024 * 1024,
    queueSize: 3,
  });
  upload.on('httpUploadProgress', (progress) => {
    if (progress.loaded && progress.total) {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
      console.log(`[ChunkedUpload] S3 upload: ${percent}%`);
    }
  });
  await upload.done();
  const region = process.env.AWS_REGION || 'eu-west-3';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileKey}`;
}

// ─── Worker d'assemblage en arrière-plan ─────────────────────────────────────

/**
 * Traiter un job d'assemblage en arrière-plan.
 * Cette fonction est appelée via setImmediate pour ne pas bloquer la connexion HTTP.
 */
async function processAssemblyJob(
  jobId: string,
  uploadId: string,
  fileName: string,
  totalChunks: number,
  userId: string,
  ext: string
): Promise<void> {
  let tmpFilePath: string | null = null;

  try {
    // Étape 1 : Assemblage
    await updateAssemblyJobStatus(jobId, 'assembling');
    console.log(`[AssemblyJob ${jobId}] Starting assembly of ${totalChunks} chunks...`);
    tmpFilePath = await assembleChunksToDisk(uploadId, totalChunks, ext);

    // Étape 2 : Upload S3
    await updateAssemblyJobStatus(jobId, 'uploading');
    const randomId = randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const fileKey = `transcriptions/${userId}/${timestamp}-${randomId}.${ext}`;
    const mimeType = getMimeType(ext);
    const fileUrl = await uploadFileTos3Streaming(tmpFilePath, fileKey, mimeType);
    console.log(`[AssemblyJob ${jobId}] File uploaded: ${fileUrl}`);

    // Étape 3 : Créer la transcription en BDD
    const result = await createTranscription({
      userId,
      fileName,
      fileUrl,
      fileKey,
      status: 'pending',
    });
    const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;

    // Étape 4 : Déclencher le worker
    await triggerTranscriptionWorker(transcriptionId);

    // Étape 5 : Marquer le job comme terminé
    await updateAssemblyJobStatus(jobId, 'completed', { transcriptionId });
    console.log(`[AssemblyJob ${jobId}] Completed → transcriptionId=${transcriptionId}`);

    // Nettoyage non-bloquant
    cleanupChunksFromS3(uploadId, totalChunks).catch((err) =>
      console.warn(`[AssemblyJob ${jobId}] S3 cleanup failed:`, err)
    );
  } catch (error: any) {
    console.error(`[AssemblyJob ${jobId}] Failed:`, error);
    await updateAssemblyJobStatus(jobId, 'error', {
      errorMessage: error.message || 'Erreur lors de l\'assemblage',
    }).catch(() => { /* ignore */ });
  } finally {
    // Nettoyage du fichier temporaire disque
    if (tmpFilePath) {
      try { fs.unlinkSync(tmpFilePath); } catch { /* ignore */ }
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const chunkedUploadRouter = Router();

/**
 * POST /api/upload-chunk
 * Recevoir un chunk et le stocker sur S3.
 */
chunkedUploadRouter.post(
  '/upload-chunk',
  uploadChunkMiddleware,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { uploadId, chunkIndex, totalChunks, fileName } = req.body;
      if (!uploadId || chunkIndex === undefined || !totalChunks || !fileName) {
        res.status(400).json({ error: 'Paramètres manquants : uploadId, chunkIndex, totalChunks, fileName requis' });
        return;
      }

      const chunkIdx = parseInt(chunkIndex, 10);
      const totalChunksNum = parseInt(totalChunks, 10);
      if (isNaN(chunkIdx) || isNaN(totalChunksNum) || chunkIdx < 0 || chunkIdx >= totalChunksNum) {
        res.status(400).json({ error: `Index de chunk invalide: ${chunkIndex} / ${totalChunks}` });
        return;
      }

      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        res.status(400).json({ error: `Format non supporté: .${ext}` });
        return;
      }

      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        res.status(400).json({ error: 'Aucun chunk reçu ou chunk vide' });
        return;
      }

      const { key } = await putChunkToS3(uploadId, chunkIdx, req.file.buffer);
      console.log(
        `[ChunkedUpload] Chunk ${chunkIdx + 1}/${totalChunksNum} → S3 ` +
        `(${(req.file.buffer.length / 1024 / 1024).toFixed(1)} MB) key=${key}`
      );

      res.json({ success: true, chunkIndex: chunkIdx, size: req.file.buffer.length });
    } catch (error: any) {
      console.error('[ChunkedUpload] Chunk upload error:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la réception du chunk' });
    }
  }
);

/**
 * GET /api/upload-chunk-status
 * Vérifier quels chunks ont été reçus sur S3.
 */
chunkedUploadRouter.get(
  '/upload-chunk-status',
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const uploadId = req.query.uploadId as string;
      const totalChunks = parseInt(req.query.totalChunks as string, 10);
      if (!uploadId || isNaN(totalChunks) || totalChunks <= 0) {
        res.status(400).json({ error: 'Paramètres manquants : uploadId et totalChunks requis' });
        return;
      }

      const missingChunks = await getMissingChunksFromS3(uploadId, totalChunks);
      const receivedCount = totalChunks - missingChunks.length;

      res.json({
        uploadId,
        totalChunks,
        receivedCount,
        missingChunks,
        complete: missingChunks.length === 0,
      });
    } catch (error: any) {
      console.error('[ChunkedUpload] Status check error:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la vérification' });
    }
  }
);

/**
 * POST /api/upload-chunk-complete
 *
 * Répondre IMMÉDIATEMENT avec 202 Accepted + jobId.
 * L'assemblage se fait en arrière-plan via setImmediate.
 * Le client doit ensuite poll GET /api/upload-chunk-job-status/:jobId
 */
chunkedUploadRouter.post(
  '/upload-chunk-complete',
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { uploadId, fileName, totalChunks } = req.body;
      if (!uploadId || !fileName || !totalChunks) {
        res.status(400).json({ error: 'Paramètres manquants : uploadId, fileName, totalChunks requis' });
        return;
      }

      const totalChunksNum = parseInt(totalChunks, 10);
      if (isNaN(totalChunksNum) || totalChunksNum <= 0) {
        res.status(400).json({ error: `Nombre de chunks invalide: ${totalChunks}` });
        return;
      }

      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        res.status(400).json({ error: `Format non supporté: .${ext}` });
        return;
      }

      // Vérification rapide que tous les chunks sont présents (S3 HEAD, ~1s pour 47 chunks)
      const missingChunks = await getMissingChunksFromS3(uploadId, totalChunksNum);
      if (missingChunks.length > 0) {
        res.status(400).json({
          error: `Chunks manquants: [${missingChunks.join(', ')}]`,
          missingChunks,
          canRetry: true,
        });
        return;
      }

      // Créer le job en BDD
      const jobId = `job-${randomBytes(8).toString('hex')}`;
      await createAssemblyJob({
        jobId,
        userId: user.openId,
        uploadId,
        fileName,
        totalChunks: totalChunksNum,
        status: 'pending',
      });

      // ── RÉPONDRE IMMÉDIATEMENT (avant le timeout Cloud Run) ──
      res.status(202).json({ jobId, status: 'pending' });

      // ── Lancer l'assemblage en arrière-plan ──
      setImmediate(() => {
        processAssemblyJob(jobId, uploadId, fileName, totalChunksNum, user.openId, ext)
          .catch((err) => console.error(`[AssemblyJob ${jobId}] Unhandled error:`, err));
      });

      console.log(`[ChunkedUpload] Job ${jobId} created, assembly starting in background`);
    } catch (error: any) {
      console.error('[ChunkedUpload] Complete error:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la création du job' });
    }
  }
);

/**
 * GET /api/upload-chunk-job-status/:jobId
 *
 * Retourner le statut d'un job d'assemblage.
 * Le client poll cet endpoint toutes les 3 secondes.
 *
 * Réponse :
 * - { status: 'pending' | 'assembling' | 'uploading' }  → en cours
 * - { status: 'completed', transcriptionId: number }     → terminé
 * - { status: 'error', error: string }                   → erreur
 */
chunkedUploadRouter.get(
  '/upload-chunk-job-status/:jobId',
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      const { jobId } = req.params;
      if (!jobId) {
        res.status(400).json({ error: 'jobId requis' });
        return;
      }

      const job = await getAssemblyJobById(jobId);
      if (!job) {
        res.status(404).json({ error: `Job ${jobId} introuvable` });
        return;
      }

      // Vérifier que le job appartient à l'utilisateur
      if (job.userId !== user.openId) {
        res.status(403).json({ error: 'Accès refusé' });
        return;
      }

      if (job.status === 'completed') {
        res.json({
          status: 'completed',
          transcriptionId: job.transcriptionId,
        });
      } else if (job.status === 'error') {
        res.json({
          status: 'error',
          error: job.errorMessage || 'Erreur inconnue',
        });
      } else {
        // pending | assembling | uploading
        const statusMessages: Record<string, string> = {
          pending: 'Démarrage de l\'assemblage...',
          assembling: 'Assemblage du fichier en cours...',
          uploading: 'Finalisation de l\'upload...',
        };
        res.json({
          status: job.status,
          message: statusMessages[job.status] || 'Traitement en cours...',
        });
      }
    } catch (error: any) {
      console.error('[ChunkedUpload] Job status error:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de la vérification du job' });
    }
  }
);

// ─── Helper MIME ──────────────────────────────────────────────────────────────

function getMimeType(ext: string): string {
  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return mimeMap[ext] || 'application/octet-stream';
}
