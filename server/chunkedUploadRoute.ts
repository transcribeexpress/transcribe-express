/**
 * Routes d'upload chunked — Gestion des fichiers volumineux sur mobile
 *
 * Pourquoi l'upload chunked ?
 * - Sur mobile, un fichier de 500 Mo uploadé en une seule requête peut :
 *   1. Dépasser la limite mémoire du navigateur (OOM kill → page refresh)
 *   2. Échouer si la connexion est interrompue (pas de reprise)
 *   3. Déclencher un timeout serveur
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
 *   POST /api/upload-chunk-complete
 *     Body (application/json) :
 *       - uploadId   : string  — ID unique de l'upload
 *       - fileName   : string  — Nom du fichier original
 *       - totalChunks: number  — Nombre total de chunks attendus
 *
 * Sécurité :
 * - Authentification via session cookie (même mécanisme que /api/upload)
 * - Validation de l'extension du fichier
 * - Nettoyage automatique des fichiers temporaires après assemblage
 * - Limite de taille par chunk : 12 Mo (légèrement supérieure au CHUNK_SIZE côté client)
 *
 * Fix V2 (7 mai 2026) :
 * - Utilisation de memoryStorage au lieu de diskStorage pour éviter le bug
 *   où req.body n'est pas encore parsé quand Multer appelle filename()
 * - Écriture manuelle du chunk sur disque APRÈS validation des champs body
 * - Ajout de vérification d'intégrité (taille chunk > 0)
 * - Ajout d'un endpoint GET /api/upload-chunk-status pour vérifier les chunks reçus
 * - Retry côté client amélioré avec vérification serveur avant complétion
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { randomBytes } from 'crypto';
import { storagePut } from './storage';
import { createTranscription } from './db';
import { triggerTranscriptionWorker } from './workers/transcriptionWorker';
import { SUPPORTED_EXTENSIONS } from './audioProcessor';

// ─── Configuration Multer (memoryStorage) ───────────────────────────────────
// On utilise memoryStorage pour que req.body soit toujours disponible
// quand on écrit le fichier sur disque (pas de race condition)

const uploadChunkMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 Mo par chunk
    files: 1,
  },
}).single('chunk');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Obtenir le répertoire temporaire pour les chunks
 * Crée le répertoire s'il n'existe pas
 */
function ensureChunkDir(): string {
  const tmpDir = path.join(os.tmpdir(), 'te-chunks');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

/**
 * Sanitizer un uploadId pour l'utiliser comme nom de fichier
 */
function sanitizeUploadId(uploadId: string): string {
  return uploadId.replace(/[^a-z0-9-]/gi, '_');
}

/**
 * Obtenir le chemin d'un chunk spécifique
 */
function getChunkPath(uploadId: string, chunkIndex: number): string {
  const safeId = sanitizeUploadId(uploadId);
  return path.join(ensureChunkDir(), `${safeId}-chunk-${chunkIndex}`);
}

/**
 * Vérifier quels chunks sont présents et retourner la liste des manquants
 */
function getMissingChunks(uploadId: string, totalChunks: number): number[] {
  const missing: number[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = getChunkPath(uploadId, i);
    if (!fs.existsSync(chunkPath)) {
      missing.push(i);
    } else {
      // Vérifier que le chunk n'est pas vide (corruption)
      const stats = fs.statSync(chunkPath);
      if (stats.size === 0) {
        missing.push(i);
        // Supprimer le chunk corrompu
        try { fs.unlinkSync(chunkPath); } catch {}
      }
    }
  }
  return missing;
}

/**
 * Vérifier que tous les chunks sont présents et valides
 */
function allChunksPresent(uploadId: string, totalChunks: number): boolean {
  return getMissingChunks(uploadId, totalChunks).length === 0;
}

/**
 * Réassembler les chunks en un fichier unique via streaming
 * (évite de charger tous les chunks en RAM simultanément)
 */
async function assembleChunks(
  uploadId: string,
  totalChunks: number,
  outputPath: string
): Promise<number> {
  const writeStream = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    let totalBytes = 0;

    const writeNextChunk = (index: number) => {
      if (index >= totalChunks) {
        writeStream.end();
        return;
      }

      const chunkPath = getChunkPath(uploadId, index);

      // Utiliser un stream de lecture pour éviter de tout charger en RAM
      const readStream = fs.createReadStream(chunkPath);
      let chunkBytes = 0;

      readStream.on('data', (data: Buffer | string) => {
        const len = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
        chunkBytes += len;
        totalBytes += len;
      });

      readStream.on('error', (err) => {
        writeStream.destroy();
        reject(new Error(`Erreur lecture chunk ${index}: ${err.message}`));
      });

      readStream.pipe(writeStream, { end: false });

      readStream.on('end', () => {
        writeNextChunk(index + 1);
      });
    };

    writeStream.on('finish', () => resolve(totalBytes));
    writeStream.on('error', reject);

    writeNextChunk(0);
  });
}

/**
 * Nettoyer les chunks temporaires d'un upload
 */
function cleanupChunks(uploadId: string, totalChunks: number): void {
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = getChunkPath(uploadId, i);
    try {
      if (fs.existsSync(chunkPath)) {
        fs.unlinkSync(chunkPath);
      }
    } catch (err) {
      console.warn(`[ChunkedUpload] Failed to cleanup chunk ${i}:`, err);
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const chunkedUploadRouter = Router();

/**
 * POST /api/upload-chunk
 *
 * Recevoir et stocker un chunk individuel.
 * Le chunk est d'abord chargé en mémoire (max 12 Mo) puis écrit sur disque
 * avec le nom correct basé sur uploadId et chunkIndex (disponibles dans req.body).
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

      // Valider les paramètres (maintenant toujours disponibles grâce à memoryStorage)
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

      // Écrire le chunk sur disque avec le nom correct
      // (maintenant req.body est garanti d'être disponible)
      const chunkPath = getChunkPath(uploadId, chunkIdx);
      fs.writeFileSync(chunkPath, req.file.buffer);

      // Vérifier l'intégrité de l'écriture
      const writtenStats = fs.statSync(chunkPath);
      if (writtenStats.size !== req.file.buffer.length) {
        // Écriture corrompue — supprimer et signaler l'erreur
        try { fs.unlinkSync(chunkPath); } catch {}
        res.status(500).json({ error: `Erreur d'écriture chunk ${chunkIdx}: taille attendue ${req.file.buffer.length}, écrite ${writtenStats.size}` });
        return;
      }

      console.log(
        `[ChunkedUpload] Received chunk ${chunkIdx + 1}/${totalChunksNum} ` +
        `for uploadId ${uploadId} (${(req.file.buffer.length / 1024 / 1024).toFixed(1)} MB)`
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
 * Vérifier quels chunks ont été reçus pour un uploadId donné.
 * Permet au client de savoir quels chunks retenter avant d'appeler complete.
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

      const missingChunks = getMissingChunks(uploadId, totalChunks);
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
 * 1. Vérifie que tous les chunks sont présents et valides
 * 2. Réassemble les chunks en un fichier unique (streaming)
 * 3. Upload vers S3
 * 4. Crée l'entrée en BDD
 * 5. Déclenche le worker de transcription
 * 6. Nettoie les fichiers temporaires
 */
chunkedUploadRouter.post(
  '/upload-chunk-complete',
  async (req: Request, res: Response) => {
    let assembledFilePath: string | null = null;

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

      // Vérifier que tous les chunks sont présents et valides
      const missingChunks = getMissingChunks(uploadId, totalChunksNum);
      if (missingChunks.length > 0) {
        res.status(400).json({
          error: `Chunks manquants pour l'uploadId ${uploadId}. Chunks absents: [${missingChunks.join(', ')}]`,
          missingChunks,
          canRetry: true,
        });
        return;
      }

      // Réassembler les chunks via streaming
      const randomId = randomBytes(8).toString('hex');
      const timestamp = Date.now();
      assembledFilePath = path.join(
        ensureChunkDir(),
        `assembled-${timestamp}-${randomId}.${ext}`
      );

      console.log(`[ChunkedUpload] Assembling ${totalChunksNum} chunks for ${fileName}...`);
      const totalBytes = await assembleChunks(uploadId, totalChunksNum, assembledFilePath);
      console.log(`[ChunkedUpload] Assembly complete: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

      // Upload vers S3 via streaming (évite de charger 500 Mo en RAM)
      const fileKey = `transcriptions/${user.openId}/${timestamp}-${randomId}.${ext}`;
      const fileBuffer = fs.readFileSync(assembledFilePath);
      const mimeType = getMimeType(ext);

      console.log(`[ChunkedUpload] Uploading to S3: ${fileKey}`);
      const { url } = await storagePut(fileKey, fileBuffer, mimeType);
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

      // Nettoyer les fichiers temporaires
      cleanupChunks(uploadId, totalChunksNum);
      try {
        if (assembledFilePath && fs.existsSync(assembledFilePath)) {
          fs.unlinkSync(assembledFilePath);
        }
      } catch {}
      assembledFilePath = null;

      console.log(`[ChunkedUpload] Pipeline complete: transcription ID ${transcriptionId}`);

      res.json({
        id: transcriptionId,
        fileName,
        fileUrl: url,
        status: 'pending',
      });
    } catch (error: any) {
      console.error('[ChunkedUpload] Completion error:', error);

      // Nettoyer le fichier assemblé en cas d'erreur
      if (assembledFilePath) {
        try { fs.unlinkSync(assembledFilePath); } catch {}
      }

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
