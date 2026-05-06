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
 * Pipeline après assemblage :
 * 1. Réassembler les chunks en un fichier unique sur disque
 * 2. Upload vers S3 via storagePut()
 * 3. Créer l'entrée en BDD
 * 4. Déclencher le worker de transcription (asynchrone)
 * 5. Nettoyer les fichiers temporaires
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

// ─── Configuration Multer pour les chunks ────────────────────────────────────

const chunkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(os.tmpdir(), 'te-chunks');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  },
  filename: (req, _file, cb) => {
    const uploadId = (req.body.uploadId || 'unknown').replace(/[^a-z0-9-]/gi, '_');
    const chunkIndex = req.body.chunkIndex || '0';
    cb(null, `${uploadId}-chunk-${chunkIndex}`);
  },
});

const uploadChunk = multer({
  storage: chunkStorage,
  limits: {
    fileSize: 12 * 1024 * 1024, // 12 Mo par chunk (légèrement supérieur au 10 Mo client)
    files: 1,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Obtenir le répertoire temporaire pour un uploadId donné
 */
function getUploadDir(uploadId: string): string {
  return path.join(os.tmpdir(), 'te-chunks');
}

/**
 * Obtenir le chemin d'un chunk spécifique
 */
function getChunkPath(uploadId: string, chunkIndex: number): string {
  const safeId = uploadId.replace(/[^a-z0-9-]/gi, '_');
  return path.join(getUploadDir(uploadId), `${safeId}-chunk-${chunkIndex}`);
}

/**
 * Vérifier que tous les chunks sont présents
 */
function allChunksPresent(uploadId: string, totalChunks: number): boolean {
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = getChunkPath(uploadId, i);
    if (!fs.existsSync(chunkPath)) {
      console.warn(`[ChunkedUpload] Missing chunk ${i} for uploadId ${uploadId}`);
      return false;
    }
  }
  return true;
}

/**
 * Réassembler les chunks en un fichier unique
 *
 * @param uploadId - ID de l'upload
 * @param totalChunks - Nombre total de chunks
 * @param outputPath - Chemin du fichier de sortie
 * @returns Taille du fichier assemblé en octets
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
      const chunkBuffer = fs.readFileSync(chunkPath);
      totalBytes += chunkBuffer.length;

      writeStream.write(chunkBuffer, (err) => {
        if (err) {
          writeStream.destroy();
          reject(err);
          return;
        }
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
 * Recevoir et stocker un chunk individuel sur le disque temporaire.
 * Répond 200 OK si le chunk est bien reçu.
 */
chunkedUploadRouter.post(
  '/upload-chunk',
  uploadChunk.single('chunk'),
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

      // Vérifier que le chunk a bien été reçu
      if (!req.file) {
        res.status(400).json({ error: 'Aucun chunk reçu' });
        return;
      }

      // Le chunk est déjà sauvegardé par Multer avec le bon nom
      // (uploadId-chunk-chunkIndex) grâce à la configuration diskStorage
      console.log(
        `[ChunkedUpload] Received chunk ${chunkIdx + 1}/${totalChunksNum} ` +
        `for uploadId ${uploadId} (${(req.file.size / 1024 / 1024).toFixed(1)} MB)`
      );

      res.json({ success: true, chunkIndex: chunkIdx });
    } catch (error: any) {
      console.error('[ChunkedUpload] Chunk upload error:', error);

      // Nettoyer le fichier temporaire en cas d'erreur
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }

      res.status(500).json({ error: error.message || 'Erreur lors de la réception du chunk' });
    }
  }
);

/**
 * POST /api/upload-chunk-complete
 *
 * Signaler que tous les chunks ont été uploadés.
 * Le serveur :
 * 1. Vérifie que tous les chunks sont présents
 * 2. Réassemble les chunks en un fichier unique
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

      // Vérifier que tous les chunks sont présents
      if (!allChunksPresent(uploadId, totalChunksNum)) {
        res.status(400).json({
          error: `Chunks manquants pour l'uploadId ${uploadId}. Assurez-vous que tous les chunks ont été uploadés.`,
        });
        return;
      }

      // Réassembler les chunks
      const randomId = randomBytes(8).toString('hex');
      const timestamp = Date.now();
      assembledFilePath = path.join(
        os.tmpdir(),
        'te-chunks',
        `assembled-${timestamp}-${randomId}.${ext}`
      );

      console.log(`[ChunkedUpload] Assembling ${totalChunksNum} chunks for ${fileName}...`);
      const totalBytes = await assembleChunks(uploadId, totalChunksNum, assembledFilePath);
      console.log(`[ChunkedUpload] Assembly complete: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

      // Upload vers S3
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
