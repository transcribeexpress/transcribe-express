/**
 * Module d'upload chunked pour fichiers volumineux sur mobile
 *
 * Pourquoi l'upload chunked ?
 * - Sur mobile, un fichier de 500 Mo uploadé en une seule requête peut :
 *   1. Dépasser la limite mémoire du navigateur (OOM kill)
 *   2. Échouer si la connexion est interrompue (pas de reprise)
 *   3. Déclencher un timeout serveur (Express limite par défaut)
 *
 * Stratégie :
 * - Découper le fichier en chunks de CHUNK_SIZE_BYTES (10 Mo par défaut)
 * - Uploader chaque chunk séquentiellement via POST /api/upload-chunk
 * - Le serveur réassemble les chunks et déclenche le worker
 *
 * Fallback :
 * - Si l'upload chunked échoue → retenter le chunk jusqu'à MAX_RETRIES fois
 * - Si tous les retries échouent → propager l'erreur
 *
 * Architecture :
 * - Client → POST /api/upload-chunk (chunk N/total + uploadId)
 * - Serveur → stocke les chunks temporairement sur disque
 * - Client → POST /api/upload-chunk-complete (uploadId)
 * - Serveur → réassemble, upload S3, déclenche worker
 */

export type ChunkedUploadProgressCallback = (progress: {
  stage: 'uploading' | 'assembling' | 'done';
  percent: number;
  message: string;
  chunkIndex?: number;
  totalChunks?: number;
}) => void;

export interface ChunkedUploadResult {
  success: boolean;
  /** ID de la transcription créée (si success=true) */
  transcriptionId?: number;
  /** URL du fichier sur S3 */
  fileUrl?: string;
  /** Message d'erreur (si success=false) */
  error?: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Taille de chaque chunk : 10 Mo (équilibre entre nombre de requêtes et mémoire) */
const CHUNK_SIZE_BYTES = 10 * 1024 * 1024;

/** Nombre maximum de retries par chunk en cas d'échec réseau */
const MAX_RETRIES = 3;

/** Délai de base entre les retries (exponentiel : 1s, 2s, 4s) */
const RETRY_BASE_DELAY_MS = 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Générer un ID d'upload unique côté client
 */
function generateUploadId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `upload-${timestamp}-${random}`;
}

/**
 * Attendre un délai (pour les retries exponentiels)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formater une taille en octets
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

// ─── Upload d'un chunk individuel ────────────────────────────────────────────

/**
 * Uploader un seul chunk avec retry automatique
 *
 * @param uploadId - ID unique de l'upload (partagé entre tous les chunks)
 * @param chunkIndex - Index du chunk (0-based)
 * @param totalChunks - Nombre total de chunks
 * @param chunkBlob - Données du chunk
 * @param fileName - Nom du fichier original
 * @param retries - Nombre de retries restants
 */
async function uploadChunk(
  uploadId: string,
  chunkIndex: number,
  totalChunks: number,
  chunkBlob: Blob,
  fileName: string,
  retries: number = MAX_RETRIES
): Promise<void> {
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('totalChunks', totalChunks.toString());
  formData.append('fileName', fileName);
  formData.append('chunk', chunkBlob, `chunk-${chunkIndex}`);

  try {
    const response = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData,
      credentials: 'include', // Inclure le cookie de session
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Chunk ${chunkIndex} upload failed (${response.status}): ${errorText}`);
    }
  } catch (error: any) {
    if (retries > 0) {
      const waitMs = RETRY_BASE_DELAY_MS * Math.pow(2, MAX_RETRIES - retries);
      console.warn(
        `[ChunkedUploader] Chunk ${chunkIndex} failed, retrying in ${waitMs}ms... (${retries} retries left)`,
        error.message
      );
      await delay(waitMs);
      return uploadChunk(uploadId, chunkIndex, totalChunks, chunkBlob, fileName, retries - 1);
    }
    throw error;
  }
}

// ─── Complétion de l'upload ───────────────────────────────────────────────────

/**
 * Signaler au serveur que tous les chunks ont été uploadés
 * Le serveur réassemble, upload sur S3 et déclenche le worker
 */
async function completeChunkedUpload(
  uploadId: string,
  fileName: string,
  totalChunks: number
): Promise<{ id: number; fileUrl: string; status: string }> {
  const response = await fetch('/api/upload-chunk-complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ uploadId, fileName, totalChunks }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Upload completion failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

/**
 * Uploader un fichier volumineux par chunks de 10 Mo
 *
 * Pipeline :
 * 1. Découper le fichier en chunks de CHUNK_SIZE_BYTES
 * 2. Uploader chaque chunk séquentiellement (avec retry automatique)
 * 3. Signaler la complétion au serveur
 * 4. Retourner l'ID de transcription créé
 *
 * @param file - Fichier à uploader
 * @param onProgress - Callback de progression (optionnel)
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: ChunkedUploadProgressCallback
): Promise<ChunkedUploadResult> {
  const uploadId = generateUploadId();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE_BYTES);

  console.log(
    `[ChunkedUploader] Starting chunked upload: ${file.name} ` +
    `(${formatSize(file.size)}, ${totalChunks} chunks of ${formatSize(CHUNK_SIZE_BYTES)})`
  );

  try {
    // ─── Étape 1 : Uploader les chunks séquentiellement ───────────
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE_BYTES;
      const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
      const chunkBlob = file.slice(start, end);

      const uploadedBytes = start + chunkBlob.size;
      const percent = Math.round((uploadedBytes / file.size) * 85); // 0% → 85%

      onProgress?.({
        stage: 'uploading',
        percent,
        message: `Upload en cours... ${i + 1}/${totalChunks} (${formatSize(uploadedBytes)} / ${formatSize(file.size)})`,
        chunkIndex: i,
        totalChunks,
      });

      await uploadChunk(uploadId, i, totalChunks, chunkBlob, file.name);

      console.log(
        `[ChunkedUploader] Chunk ${i + 1}/${totalChunks} uploaded ` +
        `(${formatSize(chunkBlob.size)})`
      );
    }

    // ─── Étape 2 : Compléter l'upload ─────────────────────────────
    onProgress?.({
      stage: 'assembling',
      percent: 88,
      message: 'Assemblage du fichier sur le serveur...',
    });

    const result = await completeChunkedUpload(uploadId, file.name, totalChunks);

    onProgress?.({
      stage: 'done',
      percent: 100,
      message: 'Upload terminé !',
    });

    console.log(`[ChunkedUploader] Upload complete: transcription ID ${result.id}`);

    return {
      success: true,
      transcriptionId: result.id,
      fileUrl: result.fileUrl,
    };
  } catch (error: any) {
    console.error('[ChunkedUploader] Upload failed:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'upload chunked',
    };
  }
}

/**
 * Calculer le nombre de chunks pour un fichier donné
 */
export function getChunkCount(fileSize: number): number {
  return Math.ceil(fileSize / CHUNK_SIZE_BYTES);
}

/**
 * Estimer le temps d'upload en secondes pour une connexion donnée
 *
 * @param fileSize - Taille du fichier en octets
 * @param bandwidthMbps - Bande passante estimée en Mbps (défaut : 10 Mbps = connexion mobile 4G moyenne)
 */
export function estimateUploadTime(fileSize: number, bandwidthMbps: number = 10): number {
  const fileSizeMb = fileSize / (1024 * 1024);
  return Math.ceil(fileSizeMb / bandwidthMbps);
}
