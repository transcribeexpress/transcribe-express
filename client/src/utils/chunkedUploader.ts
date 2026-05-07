/**
 * Module d'upload chunked pour fichiers volumineux sur mobile
 *
 * Pourquoi l'upload chunked ?
 * - Sur mobile, un fichier de 500 Mo uploadé en une seule requête peut :
 *   1. Dépasser la limite mémoire du navigateur (OOM kill)
 *   2. Échouer si la connexion est interrompue (pas de reprise)
 *   3. Déclencher un timeout serveur (Express limite par défaut)
 *
 * Stratégie V2 (corrigée 7 mai 2026) :
 * - Découper le fichier en chunks de CHUNK_SIZE_BYTES (10 Mo par défaut)
 * - Uploader chaque chunk séquentiellement via POST /api/upload-chunk
 * - AVANT de compléter : vérifier côté serveur quels chunks sont reçus
 * - Si des chunks manquent → les retenter automatiquement
 * - Seulement quand TOUS les chunks sont confirmés → appeler complete
 *
 * Améliorations V2 :
 * - Vérification serveur (GET /api/upload-chunk-status) avant complétion
 * - Retry automatique des chunks manquants détectés par le serveur
 * - Timeout par chunk configurable (60s par défaut)
 * - Meilleure gestion des erreurs réseau mobile (AbortController)
 */

export type ChunkedUploadProgressCallback = (progress: {
  stage: 'uploading' | 'verifying' | 'retrying' | 'assembling' | 'done';
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
const MAX_RETRIES = 5;

/** Délai de base entre les retries (exponentiel : 1s, 2s, 4s, 8s, 16s) */
const RETRY_BASE_DELAY_MS = 1000;

/** Timeout par requête de chunk (60 secondes — connexion mobile lente) */
const CHUNK_UPLOAD_TIMEOUT_MS = 60_000;

/** Nombre max de cycles de vérification/retry après l'upload initial */
const MAX_VERIFICATION_CYCLES = 3;

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
 * Uploader un seul chunk avec retry automatique et timeout
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
): Promise<{ success: boolean; size: number }> {
  const formData = new FormData();
  formData.append('uploadId', uploadId);
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('totalChunks', totalChunks.toString());
  formData.append('fileName', fileName);
  formData.append('chunk', chunkBlob, `chunk-${chunkIndex}`);

  // AbortController pour timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHUNK_UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch('/api/upload-chunk', {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Chunk ${chunkIndex} upload failed (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    return { success: true, size: result.size || chunkBlob.size };
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Distinguer les erreurs réseau des erreurs serveur
    const isNetworkError = error.name === 'AbortError' ||
      error.name === 'TypeError' ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('network');

    if (retries > 0) {
      const waitMs = RETRY_BASE_DELAY_MS * Math.pow(2, MAX_RETRIES - retries);
      console.warn(
        `[ChunkedUploader] Chunk ${chunkIndex} failed (${isNetworkError ? 'network' : 'server'}), ` +
        `retrying in ${waitMs}ms... (${retries} retries left)`,
        error.message
      );
      await delay(waitMs);
      return uploadChunk(uploadId, chunkIndex, totalChunks, chunkBlob, fileName, retries - 1);
    }

    throw new Error(
      `Chunk ${chunkIndex} a échoué après ${MAX_RETRIES} tentatives: ${error.message}`
    );
  }
}

// ─── Vérification côté serveur ──────────────────────────────────────────────

/**
 * Demander au serveur quels chunks ont été reçus
 */
async function checkChunkStatus(
  uploadId: string,
  totalChunks: number
): Promise<{ receivedCount: number; missingChunks: number[]; complete: boolean }> {
  const response = await fetch(
    `/api/upload-chunk-status?uploadId=${encodeURIComponent(uploadId)}&totalChunks=${totalChunks}`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error(`Status check failed (${response.status})`);
  }

  return response.json();
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
    const errorData = await response.json().catch(() => ({ error: response.statusText }));

    // Si le serveur indique des chunks manquants, propager l'info
    if (errorData.missingChunks && errorData.canRetry) {
      const err = new Error(errorData.error) as any;
      err.missingChunks = errorData.missingChunks;
      err.canRetry = true;
      throw err;
    }

    throw new Error(`Upload completion failed (${response.status}): ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

/**
 * Uploader un fichier volumineux par chunks de 10 Mo
 *
 * Pipeline V2 :
 * 1. Découper le fichier en chunks de CHUNK_SIZE_BYTES
 * 2. Uploader chaque chunk séquentiellement (avec retry + timeout)
 * 3. Vérifier côté serveur que tous les chunks sont reçus
 * 4. Si des chunks manquent → les retenter
 * 5. Signaler la complétion au serveur
 * 6. Retourner l'ID de transcription créé
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

      const percent = Math.round(((i + 1) / totalChunks) * 80); // 0% → 80%

      onProgress?.({
        stage: 'uploading',
        percent,
        message: `Upload en cours... ${i + 1}/${totalChunks} (${formatSize(end)} / ${formatSize(file.size)})`,
        chunkIndex: i,
        totalChunks,
      });

      await uploadChunk(uploadId, i, totalChunks, chunkBlob, file.name);

      console.log(
        `[ChunkedUploader] Chunk ${i + 1}/${totalChunks} uploaded ` +
        `(${formatSize(chunkBlob.size)})`
      );
    }

    // ─── Étape 2 : Vérifier côté serveur que tous les chunks sont reçus ───
    onProgress?.({
      stage: 'verifying',
      percent: 82,
      message: 'Vérification des segments reçus...',
    });

    let verificationCycle = 0;
    while (verificationCycle < MAX_VERIFICATION_CYCLES) {
      const status = await checkChunkStatus(uploadId, totalChunks);

      if (status.complete) {
        console.log(`[ChunkedUploader] All ${totalChunks} chunks verified on server`);
        break;
      }

      // Des chunks manquent → les retenter
      console.warn(
        `[ChunkedUploader] Server reports ${status.missingChunks.length} missing chunks: [${status.missingChunks.join(', ')}]`
      );

      onProgress?.({
        stage: 'retrying',
        percent: 83,
        message: `Renvoi de ${status.missingChunks.length} segment(s) manquant(s)...`,
      });

      for (const missingIdx of status.missingChunks) {
        const start = missingIdx * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, file.size);
        const chunkBlob = file.slice(start, end);

        console.log(`[ChunkedUploader] Retrying missing chunk ${missingIdx}...`);
        await uploadChunk(uploadId, missingIdx, totalChunks, chunkBlob, file.name);
      }

      verificationCycle++;
    }

    // Vérification finale
    if (verificationCycle >= MAX_VERIFICATION_CYCLES) {
      const finalStatus = await checkChunkStatus(uploadId, totalChunks);
      if (!finalStatus.complete) {
        throw new Error(
          `Impossible de compléter l'upload après ${MAX_VERIFICATION_CYCLES} cycles de vérification. ` +
          `Chunks manquants: [${finalStatus.missingChunks.join(', ')}]`
        );
      }
    }

    // ─── Étape 3 : Compléter l'upload ─────────────────────────────
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
