/**
 * Routes d'upload chunked — Gestion des fichiers volumineux sur mobile
 *
 * Architecture V3 (7 mai 2026) — Cloud Run compatible :
 * - Les chunks sont stockés directement sur S3 (pas sur le disque local)
 * - Chaque instance Cloud Run peut recevoir n'importe quel chunk
 * - La vérification des chunks se fait via S3 (HEAD object)
 * - L'assemblage télécharge les chunks depuis S3, les concatène, et uploade le fichier final
 *
 * Pourquoi S3 au lieu du disque local ?
 * - Cloud Run est stateless : chaque requête peut être routée vers une instance différente
 * - Le disque local est éphémère et non partagé entre instances
 * - S3 est partagé, persistant, et accessible depuis toutes les instances
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
import { storagePut, storageGet, storageDelete } from './storage';
import { createTranscription } from './db';
import { triggerTranscriptionWorker } from './workers/transcriptionWorker';
import { SUPPORTED_EXTENSIONS } from './audioProcessor';
import { ENV } from './_core/env';

// ─── Configuration Multer (memoryStorage) ───────────────────────────────────
// memoryStorage : le chunk est en RAM (max 12 Mo) le temps de l'uploader sur S3

const uploadChunkMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 Mo par chunk
    files: 1,
  },
}).single('chunk');

// ─── S3 Helpers pour les chunks ─────────────────────────────────────────────

/**
 * Clé S3 pour un chunk spécifique
 * Format : tmp-chunks/{uploadId}/chunk-{index}
 */
function getChunkS3Key(uploadId: string, chunkIndex: number): string {
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  return `tmp-chunks/${safeId}/chunk-${String(chunkIndex).padStart(5, '0')}`;
}

/**
 * Uploader un chunk sur S3
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
 * Télécharger un chunk depuis S3
 */
async function downloadChunkFromS3(uploadId: string, chunkIndex: number): Promise<Buffer> {
  const key = getChunkS3Key(uploadId, chunkIndex);
  const { url } = await storageGet(key);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download chunk ${chunkIndex} from S3 (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
 * Assembler tous les chunks depuis S3 en un seul Buffer
 * Pour les fichiers de 500 Mo, on télécharge et concatène par lots
 */
async function assembleChunksFromS3(
  uploadId: string,
  totalChunks: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for (let i = 0; i < totalChunks; i++) {
    const chunkBuffer = await downloadChunkFromS3(uploadId, i);
    chunks.push(chunkBuffer);
    totalBytes += chunkBuffer.length;

    if ((i + 1) % 10 === 0 || i === totalChunks - 1) {
      console.log(
        `[ChunkedUpload] Downloaded chunk ${i + 1}/${totalChunks} ` +
        `(total: ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`
      );
    }
  }

  return Buffer.concat(chunks);
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
 * 2. Télécharge et réassemble les chunks depuis S3
 * 3. Upload le fichier assemblé vers S3 (clé finale)
 * 4. Crée l'entrée en BDD
 * 5. Déclenche le worker de transcription
 * 6. Nettoie les chunks temporaires sur S3
 */
chunkedUploadRouter.post(
  '/upload-chunk-complete',
  async (req: Request, res: Response) => {
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

      // Télécharger et assembler les chunks depuis S3
      console.log(`[ChunkedUpload] Assembling ${totalChunksNum} chunks from S3 for ${fileName}...`);
      const assembledBuffer = await assembleChunksFromS3(uploadId, totalChunksNum);
      console.log(`[ChunkedUpload] Assembly complete: ${(assembledBuffer.length / 1024 / 1024).toFixed(1)} MB`);

      // Upload le fichier assemblé vers S3 (clé finale)
      const randomId = randomBytes(8).toString('hex');
      const timestamp = Date.now();
      const fileKey = `transcriptions/${user.openId}/${timestamp}-${randomId}.${ext}`;
      const mimeType = getMimeType(ext);

      console.log(`[ChunkedUpload] Uploading assembled file to S3: ${fileKey}`);
      const { url } = await storagePut(fileKey, assembledBuffer, mimeType);
      console.log(`[ChunkedUpload] S3 upload complete: ${url}`);

      // Créer l'entrée en BDD
      const result = await createTranscription({
        userId: user.openId,
        fileName,
        fileUrl: url,
        fileKey,
        status: 'pending',
      });

      const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;

      // Déclencher le worker asynchrone
      await triggerTranscriptionWorker(transcriptionId);

      // Nettoyer les chunks temporaires sur S3 (non-bloquant)
      cleanupChunksFromS3(uploadId, totalChunksNum).catch((err) => {
        console.warn('[ChunkedUpload] Cleanup failed (non-blocking):', err);
      });

      console.log(`[ChunkedUpload] Pipeline complete: transcription ID ${transcriptionId}`);

      res.json({
        id: transcriptionId,
        fileName,
        fileUrl: url,
        status: 'pending',
      });
    } catch (error: any) {
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
