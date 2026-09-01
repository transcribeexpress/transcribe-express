/**
 * Module S3 Direct — Upload direct depuis le frontend via URLs pré-signées
 * 
 * Architecture :
 * 1. Le frontend demande une URL pré-signée au serveur (petite requête JSON)
 * 2. Le frontend upload directement vers S3 via PUT sur l'URL pré-signée
 * 3. Le frontend notifie le serveur que l'upload est terminé
 * 4. Le serveur lance le worker de transcription
 * 
 * Avantages :
 * - Aucune limite de taille (pas de passage par le reverse proxy)
 * - Upload direct navigateur → S3 (bande passante optimale)
 * - Progression d'upload en temps réel côté frontend
 * - Pas de surcharge mémoire côté serveur
 */

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Configuration S3 depuis les variables d'environnement
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

/**
 * Refuse les clés externes au préfixe durable géré par Transcribe Express.
 * Une purge de compte exige en plus que la clé appartienne au propriétaire attendu.
 */
export function getManagedTranscriptionKey(fileKey: string, ownerOpenId?: string): string {
  const key = fileKey.replace(/^\/+/, '');
  if (!key.startsWith('transcriptions/') || key.includes('..')) {
    throw new Error('Unmanaged S3 key: expected a transcription object');
  }

  if (ownerOpenId && !key.startsWith(`transcriptions/${ownerOpenId}/`)) {
    throw new Error('S3 key does not belong to the expected transcription owner');
  }

  return key;
}

/**
 * Normalise une référence S3 historique (clé ou URL) et limite la purge de
 * compte aux répertoires possédés par l’utilisateur dans le bucket courant.
 */
export function getManagedAccountArtifactKey(reference: string, ownerOpenId: string): string {
  let key = reference.trim();
  try {
    const url = new URL(key);
    key = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  } catch {
    key = key.replace(/^\/+/, '');
  }

  if (key.includes('..')) {
    throw new Error('Unsafe S3 key');
  }

  for (const prefix of ['transcriptions', 'results']) {
    if (key.startsWith(`${prefix}/${ownerOpenId}/`)) {
      return key;
    }
  }

  throw new Error('S3 artifact does not belong to the expected account');
}

export function isOwnedTranscriptionKey(fileKey: string, ownerOpenId: string): boolean {
  try {
    getManagedTranscriptionKey(fileKey, ownerOpenId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Générer une URL pré-signée pour upload direct depuis le frontend
 * 
 * @param userId - ID de l'utilisateur (pour organiser les fichiers)
 * @param fileName - Nom original du fichier
 * @param contentType - Type MIME du fichier
 * @returns URL pré-signée + clé S3 du fichier
 */
export async function generatePresignedUploadUrl(
  userId: string,
  fileName: string,
  contentType: string
): Promise<{ uploadUrl: string; fileKey: string; fileUrl: string }> {
  const randomId = randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const extension = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const fileKey = `transcriptions/${userId}/${timestamp}-${randomId}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  });

  // URL pré-signée valide 30 minutes (pour les gros fichiers sur connexion lente)
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 1800 });

  // URL publique du fichier après upload
  const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, fileUrl };
}

/**
 * Charge un fichier local temporaire dans le même bucket et préfixe durable que
 * les URLs pré-signées. Le flux évite de recopier le média en mémoire.
 */
export async function uploadFileToS3(
  fileKey: string,
  ownerOpenId: string,
  localPath: string,
  contentType: string
): Promise<{ fileKey: string; fileUrl: string }> {
  const key = getManagedTranscriptionKey(fileKey, ownerOpenId);
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(localPath),
    ContentType: contentType,
  }));

  return {
    fileKey: key,
    fileUrl: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${key}`,
  };
}

/**
 * Vérifier qu'un fichier existe bien sur S3 après upload
 */
export async function verifyFileExists(fileKey: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Télécharger un fichier depuis S3 via AWS SDK (avec credentials)
 * Charge le fichier entier en mémoire — utiliser downloadFileFromS3ToFile pour les gros fichiers
 */
export async function downloadFileFromS3(fileKey: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`S3 GetObject returned empty body for key: ${fileKey}`);
  }

  // Convertir le stream en Buffer
  const stream = response.Body as any;
  
  if (typeof stream.transformToByteArray === 'function') {
    // AWS SDK v3 native method
    const byteArray = await stream.transformToByteArray();
    return Buffer.from(byteArray);
  }
  
  // Fallback: read stream manually
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Télécharger un fichier depuis S3 directement vers le disque (streaming)
 * 
 * IMPORTANT : Cette méthode est optimisée pour les gros fichiers (> 100 Mo).
 * Elle utilise le streaming pour éviter de charger le fichier entier en mémoire,
 * ce qui prévient les OOM kills en production.
 * 
 * @param fileKey - Clé S3 du fichier
 * @param destPath - Chemin local où écrire le fichier
 * @returns Taille du fichier téléchargé en bytes
 */
export async function downloadFileFromS3ToFile(fileKey: string, destPath: string): Promise<number> {
  console.log(`[S3Direct] Streaming download: ${fileKey} → ${destPath}`);
  const startTime = Date.now();

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`S3 GetObject returned empty body for key: ${fileKey}`);
  }

  const contentLength = response.ContentLength || 0;
  console.log(`[S3Direct] Content-Length: ${(contentLength / 1024 / 1024).toFixed(1)} MB`);

  // Stream S3 body directement vers le fichier
  const writeStream = fs.createWriteStream(destPath);
  const s3Stream = response.Body as Readable;

  let bytesWritten = 0;
  let lastLogTime = Date.now();

  // Wrapper pour suivre la progression
  s3Stream.on('data', (chunk: Buffer) => {
    bytesWritten += chunk.length;
    const now = Date.now();
    // Log toutes les 5 secondes
    if (now - lastLogTime > 5000) {
      const percent = contentLength > 0 ? ((bytesWritten / contentLength) * 100).toFixed(1) : '?';
      const elapsed = ((now - startTime) / 1000).toFixed(1);
      console.log(`[S3Direct] Download progress: ${(bytesWritten / 1024 / 1024).toFixed(1)} MB (${percent}%) in ${elapsed}s`);
      lastLogTime = now;
    }
  });

  await pipeline(s3Stream, writeStream);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSize = fs.statSync(destPath).size;
  console.log(`[S3Direct] Download complete: ${(fileSize / 1024 / 1024).toFixed(1)} MB in ${elapsed}s`);

  return fileSize;
}

/**
 * Générer une URL pré-signée pour téléchargement (lecture)
 */
export async function generatePresignedDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Masque l’objet courant dans un bucket versionné en créant un delete marker.
 * Les versions restent récupérables jusqu’à leur échéance Lifecycle.
 */
export async function markS3ObjectDeleted(fileKey: string, ownerOpenId?: string): Promise<void> {
  const key = getManagedTranscriptionKey(fileKey, ownerOpenId);
  await s3Client.send(new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Purge irréversiblement toutes les versions et delete markers d’un unique média.
 * À réserver à la procédure explicite et authentifiée de suppression de compte.
 */
export async function permanentlyDeleteS3ObjectVersions(
  fileKey: string,
  ownerOpenId: string
): Promise<number> {
  const key = getManagedAccountArtifactKey(fileKey, ownerOpenId);
  let keyMarker: string | undefined;
  let versionIdMarker: string | undefined;
  let deletedCount = 0;

  do {
    const page = await s3Client.send(new ListObjectVersionsCommand({
      Bucket: BUCKET_NAME,
      Prefix: key,
      KeyMarker: keyMarker,
      VersionIdMarker: versionIdMarker,
    }));

    const versions = [...(page.Versions ?? []), ...(page.DeleteMarkers ?? [])]
      .filter((entry) => entry.Key === key && entry.VersionId)
      .map((entry) => ({ Key: key, VersionId: entry.VersionId! }));

    if (versions.length > 0) {
      const response = await s3Client.send(new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: versions, Quiet: true },
      }));

      if (response.Errors?.length) {
        throw new Error(`Unable to permanently delete ${response.Errors.length} S3 object version(s)`);
      }
      deletedCount += versions.length;
    }

    keyMarker = page.NextKeyMarker;
    versionIdMarker = page.NextVersionIdMarker;
  } while (keyMarker || versionIdMarker);

  return deletedCount;
}
