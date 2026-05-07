/**
 * Routes d'upload chunked — Gestion des fichiers volumineux sur mobile
 *
 * Architecture V4 (7 mai 2026) — Cloud Run compatible + Zero OOM :
 * - Les chunks sont stockés directement sur S3 (pas sur le disque local)
 * - Chaque instance Cloud Run peut recevoir n'importe quel chunk
 * - L'assemblage se fait par STREAMING vers le disque (pas de Buffer.concat en RAM)
 * - L'upload final vers S3 se fait via @aws-sdk/lib-storage (multipart streaming)
 * - Empreinte mémoire : ~10 Mo max (un chunk à la fois) au lieu de 470 Mo
 *
 * Pourquoi streaming au lieu de Buffer.concat ?
 * - Buffer.concat(47 chunks × 10 Mo) = 470 Mo en RAM → OOM kill Cloud Run → 503
 * - Streaming : chaque chunk est écrit sur disque puis lu en stream → ~10 Mo RAM max
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
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { S3Client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { storagePut, storageGet, storageDelete } from './storage';
import { createTranscription } from './db';
import { triggerTranscriptionWorker } from './workers/transcriptionWorker';
import { SUPPORTED_EXTENSIONS } from './audioProcessor';

// ─── Configuration S3 (même config que s3Direct.ts) ──────────────────────────

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

// ─── Configuration Multer (memoryStorage) ───────────────────────────────────
// memoryStorage : le chunk est en RAM (max 12 Mo) le temps de l'uploader sur S3

const uploadChunkMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 Mo par chunk
    files: 1,
  },
}).single('chunk');

// ─── S3 Helpers pour les chunks (stockage intermédiaire) ─────────────────────

/**
 * Clé S3 pour un chunk spécifique
 * Format : tmp-chunks/{uploadId}/chunk-{index}
 */
function getChunkS3Key(uploadId: string, chunkIndex: number): string {
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  return `tmp-chunks/${safeId}/chunk-${String(chunkIndex).padStart(5, '0')}`;
}

/**
 * Uploader un chunk sur S3 via le proxy Manus (storagePut)
 */
async function putChunkToS3(
  uploadId: string,
  chunkIndex: number,
  buffer: Buffer
): Promise<{ key: string; url: string }> {
  const key = getChunkS3Key(uploadId, chunkIndex);
  return storagePut(key, buffer, 'application/octet-stream');
}

/**
 * Vérifier si un chunk existe sur S3 en tentant de récupérer son URL
 * Retourne true si le chunk existe, false sinon
 */
async function chunkExistsOnS3(uploadId: string, chunkIndex: number): Promise<boolean> {
  try {
    const key = getChunkS3Key(uploadId, chunkIndex);
    const { url } = await storageGet(key);
    // Faire un HEAD request pour vérifier que le fichier existe réellement
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Supprimer un chunk de S3
 */
async function deleteChunkFromS3(uploadId: string, chunkIndex: number): Promise<void> {
  try {
    const key = getChunkS3Key(uploadId, chunkIndex);
    await storageDelete(key);
  } catch (err) {
    // Non-bloquant : le nettoyage peut échouer sans impact fonctionnel
    console.warn(`[ChunkedUpload] Failed to delete chunk ${chunkIndex} from S3:`, err);
  }
}

/**
 * Vérifier quels chunks sont manquants sur S3
 */
async function getMissingChunksFromS3(uploadId: string, totalChunks: number): Promise<number[]> {
  const missing: number[] = [];

  // Vérifier en parallèle par lots de 10 pour ne pas surcharger
  const batchSize = 10;
  for (let batchStart = 0; batchStart < totalChunks; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalChunks);
    const checks = [];
    for (let i = batchStart; i < batchEnd; i++) {
      checks.push(
        chunkExistsOnS3(uploadId, i).then((exists) => ({ index: i, exists }))
      );
    }
    const results = await Promise.all(checks);
    for (const { index, exists } of results) {
      if (!exists) {
        missing.push(index);
      }
    }
  }

  return missing;
}

/**
 * Nettoyer tous les chunks temporaires d'un upload sur S3
 */
async function cleanupChunksFromS3(uploadId: string, totalChunks: number): Promise<void> {
  console.log(`[ChunkedUpload] Cleaning up ${totalChunks} chunks from S3...`);

  // Supprimer en parallèle par lots de 10
  const batchSize = 10;
  for (let batchStart = 0; batchStart < totalChunks; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, totalChunks);
    const deletions = [];
    for (let i = batchStart; i < batchEnd; i++) {
      deletions.push(deleteChunkFromS3(uploadId, i));
    }
    await Promise.all(deletions);
  }

  console.log(`[ChunkedUpload] Cleanup complete for uploadId ${uploadId}`);
}

// ─── Assemblage streaming vers disque ────────────────────────────────────────

/**
 * Télécharger un chunk depuis S3 (via URL signée) et l'écrire en streaming sur disque
 * Empreinte mémoire : ~10 Mo max (un chunk à la fois)
 */
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

  // Écrire le stream de réponse directement sur disque
  let bytesWritten = 0;
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      bytesWritten += value.length;
      // Écriture synchrone dans le stream
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

/**
 * Assembler tous les chunks depuis S3 vers un fichier temporaire sur disque
 * STREAMING : empreinte mémoire ~10 Mo max (un chunk à la fois)
 *
 * @returns Chemin du fichier temporaire assemblé
 */
async function assembleChunksToDisk(
  uploadId: string,
  totalChunks: number,
  ext: string
): Promise<string> {
  const tmpDir = os.tmpdir();
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  const tmpFilePath = path.join(tmpDir, `assembled-${safeId}.${ext}`);

  console.log(`[ChunkedUpload] Assembling ${totalChunks} chunks to disk: ${tmpFilePath}`);

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
          `(total: ${(totalBytes / 1024 / 1024).toFixed(1)} MB, ${elapsed}s)`
        );
      }
    }

    // Fermer le stream d'écriture
    await new Promise<void>((resolve, reject) => {
      writeStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const fileSize = fs.statSync(tmpFilePath).size;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[ChunkedUpload] Assembly complete: ${(fileSize / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`
    );

    return tmpFilePath;
  } catch (err) {
    // Nettoyer le fichier partiel en cas d'erreur
    writeStream.destroy();
    try { fs.unlinkSync(tmpFilePath); } catch { /* ignore */ }
    throw err;
  }
}

/**
 * Uploader un fichier depuis le disque vers S3 via multipart streaming
 * Utilise @aws-sdk/lib-storage pour un upload en streaming (pas de chargement en RAM)
 *
 * @returns URL publique du fichier uploadé
 */
async function uploadFileTos3Streaming(
  filePath: string,
  fileKey: string,
  mimeType: string
): Promise<string> {
  console.log(`[ChunkedUpload] Streaming upload to S3: ${fileKey}`);
  const startTime = Date.now();

  const fileStream = fs.createReadStream(filePath);
  const fileSize = fs.statSync(filePath).size;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: fileStream,
      ContentType: mimeType,
    },
    // Taille de chaque partie multipart : 10 Mo (minimum AWS = 5 Mo)
    partSize: 10 * 1024 * 1024,
    // Nombre de parties en parallèle
    queueSize: 3,
  });

  // Suivre la progression
  upload.on('httpUploadProgress', (progress) => {
    if (progress.loaded && progress.total) {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
      console.log(`[ChunkedUpload] S3 upload progress: ${percent}%`);
    }
  });

  await upload.done();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[ChunkedUpload] S3 upload complete: ${(fileSize / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`
  );

  // Construire l'URL publique
  const region = process.env.AWS_REGION || 'eu-west-3';
  const url = `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${fileKey}`;
  return url;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const chunkedUploadRouter = Router();

/**
 * POST /api/upload-chunk
 *
 * Recevoir un chunk et le stocker directement sur S3.
 * Le chunk est en mémoire (max 12 Mo) le temps de l'upload S3.
 */
chunkedUploadRouter.post(
  '/upload-chunk',
  uploadChunkMiddleware,
  async (req: Request, res: Response) => {
    try {
      // Vérifier l'authentification
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
      }

      // Valider les paramètres
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

      // Valider l'extension du fichier
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        res.status(400).json({ error: `Format non supporté: .${ext}` });
        return;
      }

      // Vérifier que le chunk a bien été reçu en mémoire
      if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        res.status(400).json({ error: 'Aucun chunk reçu ou chunk vide' });
        return;
      }

      // Uploader le chunk directement sur S3
      const { key } = await putChunkToS3(uploadId, chunkIdx, req.file.buffer);

      console.log(
        `[ChunkedUpload] Chunk ${chunkIdx + 1}/${totalChunksNum} stored on S3 ` +
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
 *
 * Vérifier quels chunks ont été reçus sur S3 pour un uploadId donné.
 */
chunkedUploadRouter.get(
  '/upload-chunk-status',
  async (req: Request, res: Response) => {
    try {
      // Vérifier l'authentification
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
 * Signaler que tous les chunks ont été uploadés.
 * Le serveur :
 * 1. Vérifie que tous les chunks sont présents sur S3
 * 2. Télécharge les chunks depuis S3 et les assemble en STREAMING vers le disque
 * 3. Upload le fichier assemblé vers S3 via multipart streaming (pas de RAM)
 * 4. Crée l'entrée en BDD
 * 5. Déclenche le worker de transcription
 * 6. Nettoie les chunks temporaires sur S3 et le fichier disque
 */
chunkedUploadRouter.post(
  '/upload-chunk-complete',
  async (req: Request, res: Response) => {
    let tmpFilePath: string | null = null;

    try {
      // Vérifier l'authentification
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

      // Valider l'extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        res.status(400).json({ error: `Format non supporté: .${ext}` });
        return;
      }

      // Vérifier que tous les chunks sont présents sur S3
      const missingChunks = await getMissingChunksFromS3(uploadId, totalChunksNum);
      if (missingChunks.length > 0) {
        res.status(400).json({
          error: `Chunks manquants pour l'uploadId ${uploadId}. Chunks absents: [${missingChunks.join(', ')}]`,
          missingChunks,
          canRetry: true,
        });
        return;
      }

      // ── ÉTAPE 1 : Assembler les chunks depuis S3 vers le disque (streaming) ──
      // Empreinte mémoire : ~10 Mo max (un chunk à la fois)
      tmpFilePath = await assembleChunksToDisk(uploadId, totalChunksNum, ext);

      // ── ÉTAPE 2 : Upload le fichier assemblé vers S3 via multipart streaming ──
      // Empreinte mémoire : ~10 Mo max (buffer interne @aws-sdk/lib-storage)
      const randomId = randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const fileKey = `transcriptions/${user.openId}/${timestamp}-${randomId}.${ext}`;
      const mimeType = getMimeType(ext);

      const fileUrl = await uploadFileTos3Streaming(tmpFilePath, fileKey, mimeType);
      console.log(`[ChunkedUpload] Final file available at: ${fileUrl}`);

      // ── ÉTAPE 3 : Créer l'entrée en BDD ──
      const result = await createTranscription({
        userId: user.openId,
        fileName,
        fileUrl,
        fileKey,
        status: 'pending',
      });

      const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;

      // ── ÉTAPE 4 : Déclencher le worker asynchrone ──
      await triggerTranscriptionWorker(transcriptionId);

      // ── ÉTAPE 5 : Nettoyage non-bloquant ──
      // Supprimer les chunks temporaires sur S3
      cleanupChunksFromS3(uploadId, totalChunksNum).catch((err) => {
        console.warn('[ChunkedUpload] S3 cleanup failed (non-blocking):', err);
      });

      // Supprimer le fichier temporaire sur disque
      if (tmpFilePath) {
        const fileToDelete = tmpFilePath;
        setImmediate(() => {
          try { fs.unlinkSync(fileToDelete); } catch { /* ignore */ }
        });
      }

      console.log(`[ChunkedUpload] Pipeline complete: transcription ID ${transcriptionId}`);

      res.json({
        id: transcriptionId,
        fileName,
        fileUrl,
        status: 'pending',
      });
    } catch (error: any) {
      // Nettoyage d'urgence du fichier temporaire
      if (tmpFilePath) {
        try { fs.unlinkSync(tmpFilePath); } catch { /* ignore */ }
      }

      console.error('[ChunkedUpload] Completion error:', error);
      res.status(500).json({ error: error.message || 'Erreur lors de l\'assemblage' });
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
