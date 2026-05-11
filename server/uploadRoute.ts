/**
 * Route d'upload multipart — Gestion des fichiers volumineux
 * 
 * Pourquoi une route dédiée au lieu de tRPC ?
 * - tRPC utilise JSON body → un fichier de 160 Mo en base64 = ~213 Mo JSON
 * - Cela cause des timeouts, des erreurs mémoire, et des erreurs de parsing
 * - Multer gère le streaming multipart nativement, sans surcharge mémoire
 * - Le fichier est streamé directement vers le disque temporaire puis vers S3
 * 
 * Endpoint : POST /api/upload
 * Content-Type: multipart/form-data
 * Body: file (fichier audio/vidéo), fileName (string)
 * Auth: Session cookie (même auth que tRPC)
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

// Configuration Multer : stockage temporaire sur disque
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const tmpDir = path.join(os.tmpdir(), 'te-uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = randomBytes(8).toString('hex');
    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
    cb(null, `upload-${uniqueId}.${ext}`);
  },
});

// Filtre de fichier par extension
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
  if (SUPPORTED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Format non supporté: .${ext}. Formats acceptés: ${SUPPORTED_EXTENSIONS.join(', ')}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 Mo
    files: 1,
  },
});

export const uploadRouter = Router();

/**
 * POST /api/upload
 * 
 * Upload multipart d'un fichier audio/vidéo.
 * Le fichier est stocké sur S3, une entrée est créée en BDD,
 * et le worker de transcription est déclenché.
 */
uploadRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // 1. Vérifier l'authentification (ctx.user est injecté par le middleware auth)
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: 'Non authentifié' });
      return;
    }

    // 2. Vérifier que le fichier est présent
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    // 3. Lire le fichier temporaire
    const fileBuffer = fs.readFileSync(file.path);
    const fileName = req.body.fileName || file.originalname;
    const mimeType = file.mimetype || 'application/octet-stream';

    // 4. Upload vers S3
    const randomId = randomBytes(8).toString('hex');
    const timestamp = Date.now();
    const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
    const fileKey = `transcriptions/${user.openId}/${timestamp}-${randomId}.${extension}`;

    const { url } = await storagePut(fileKey, fileBuffer, mimeType);

    // 5. Créer l'entrée en BDD
    const result = await createTranscription({
      userId: user.openId,
      fileName,
      fileUrl: url,
      fileKey,
      status: 'pending',
    });

    const transcriptionId = (result as any).insertId || (result as any)[0]?.insertId;

    // 6. Déclencher le worker asynchrone
    await triggerTranscriptionWorker(transcriptionId);

    // 7. Nettoyer le fichier temporaire
    try {
      fs.unlinkSync(file.path);
    } catch {}

    // 8. Répondre
    res.json({
      id: transcriptionId,
      fileName,
      fileUrl: url,
      status: 'pending',
    });

  } catch (error: any) {
    console.error('[Upload] Error:', error);
    
    // Nettoyer le fichier temporaire en cas d'erreur
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }

    res.status(500).json({ 
      error: error.message || 'Erreur lors de l\'upload' 
    });
  }
});
