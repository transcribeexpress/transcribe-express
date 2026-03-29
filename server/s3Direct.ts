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

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

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
 * Utilisé par le worker de transcription pour récupérer les fichiers uploadés
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
  const chunks: Uint8Array[] = [];
  const stream = response.Body as any;
  
  if (typeof stream.transformToByteArray === 'function') {
    // AWS SDK v3 native method
    const byteArray = await stream.transformToByteArray();
    return Buffer.from(byteArray);
  }
  
  // Fallback: read stream manually
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
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
