/**
 * Module audioChunker — Découpe audio intelligente et transcription parallèle
 * 
 * Responsabilités :
 * 1. Découper un fichier audio FLAC en segments de taille <= 20 Mo
 * 2. Ajouter un chevauchement de 2 secondes entre les segments
 * 3. Transcrire chaque segment en parallèle via Groq Whisper
 * 4. Réassembler les transcriptions en supprimant les doublons aux jonctions
 * 
 * Stratégie de chunking :
 * - Calcul de la durée par chunk basé sur le ratio taille/durée du fichier
 * - Chevauchement de 2s pour éviter les coupures de mots
 * - Déduplication par comparaison des derniers mots du chunk N avec les premiers du chunk N+1
 */

import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomBytes } from 'crypto';
import { MAX_AUDIO_CHUNK_SIZE_BYTES } from './audioProcessor';

// Chevauchement entre chunks en secondes
const OVERLAP_SECONDS = 2;

// Taille cible par chunk (18 Mo pour garder de la marge sous la limite de 20 Mo)
const TARGET_CHUNK_SIZE_BYTES = 18 * 1024 * 1024;

// Nombre maximum de chunks en parallèle (pour ne pas surcharger l'API)
const MAX_PARALLEL_CHUNKS = 3;

export interface AudioChunk {
  index: number;
  startSeconds: number;
  endSeconds: number;
  buffer: Buffer;
  filePath: string;
}

export interface ChunkTranscriptionResult {
  index: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
  language: string;
  duration: number;
}

export interface ChunkedTranscriptionResult {
  text: string;
  language: string;
  totalDuration: number;
  chunksCount: number;
  chunkResults: ChunkTranscriptionResult[];
}

/**
 * Déterminer si un fichier audio nécessite un chunking
 * (taille > seuil de 20 Mo)
 */
export function needsChunking(audioBufferSize: number): boolean {
  return audioBufferSize > MAX_AUDIO_CHUNK_SIZE_BYTES;
}

/**
 * Créer un fichier temporaire avec un nom unique
 */
function createTempFilePath(prefix: string, extension: string): string {
  const tmpDir = os.tmpdir();
  const uniqueId = randomBytes(6).toString('hex');
  return path.join(tmpDir, `te-chunk-${prefix}-${uniqueId}.${extension}`);
}

/**
 * Nettoyer les fichiers temporaires
 */
async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`[AudioChunker] Failed to cleanup: ${filePath}`);
    }
  }
}

/**
 * Obtenir la durée d'un fichier audio via FFmpeg
 */
async function getAudioDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-f', 'null',
      '-'
    ];

    const proc = spawn(ffmpegPath!, args);
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', () => {
      // Extraire la durée depuis la sortie FFmpeg
      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (durationMatch) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);
        const centiseconds = parseInt(durationMatch[4]);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        resolve(totalSeconds);
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Extraire un segment audio d'un fichier via FFmpeg
 * 
 * @param inputPath - Chemin du fichier audio source
 * @param startSeconds - Début du segment en secondes
 * @param durationSeconds - Durée du segment en secondes
 * @param outputPath - Chemin du fichier de sortie
 */
async function extractAudioSegment(
  inputPath: string,
  startSeconds: number,
  durationSeconds: number,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', startSeconds.toFixed(2),
      '-i', inputPath,
      '-t', durationSeconds.toFixed(2),
      '-acodec', 'flac',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      outputPath,
    ];

    const proc = spawn(ffmpegPath!, args);
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg segment extraction failed (code ${code}): ${stderr.slice(-300)}`));
      }
    });

    proc.on('error', reject);
  });
}

/**
 * Découper un fichier audio en chunks avec chevauchement
 * 
 * Algorithme :
 * 1. Calculer la durée totale du fichier
 * 2. Estimer la durée par chunk basée sur le ratio taille/durée
 * 3. Créer les segments avec chevauchement de 2 secondes
 * 4. Extraire chaque segment via FFmpeg
 */
export async function splitAudioIntoChunks(
  audioBuffer: Buffer,
  extension: string = 'flac'
): Promise<{ chunks: AudioChunk[]; totalDuration: number; tempFiles: string[] }> {
  const inputPath = createTempFilePath('input', extension);
  const tempFiles: string[] = [inputPath];

  try {
    // 1. Écrire le buffer dans un fichier temporaire
    fs.writeFileSync(inputPath, audioBuffer);

    // 2. Obtenir la durée totale
    const totalDuration = await getAudioDuration(inputPath);
    console.log(`[AudioChunker] Total duration: ${totalDuration.toFixed(1)}s, size: ${(audioBuffer.length / 1024 / 1024).toFixed(1)}MB`);

    // 3. Calculer la durée par chunk
    // Ratio : bytes par seconde d'audio
    const bytesPerSecond = audioBuffer.length / totalDuration;
    // Durée cible par chunk pour rester sous TARGET_CHUNK_SIZE_BYTES
    const targetChunkDuration = Math.floor(TARGET_CHUNK_SIZE_BYTES / bytesPerSecond);
    // Minimum 30 secondes par chunk, maximum la durée totale
    const chunkDuration = Math.max(30, Math.min(targetChunkDuration, totalDuration));

    console.log(`[AudioChunker] Bytes/sec: ${bytesPerSecond.toFixed(0)}, chunk duration: ${chunkDuration}s`);

    // 4. Calculer les segments
    const chunks: AudioChunk[] = [];
    let currentStart = 0;
    let index = 0;

    while (currentStart < totalDuration) {
      const effectiveEnd = Math.min(currentStart + chunkDuration, totalDuration);
      const effectiveDuration = effectiveEnd - currentStart;

      // Ajouter le chevauchement pour le prochain chunk (sauf le dernier)
      const segmentDuration = effectiveEnd < totalDuration
        ? effectiveDuration + OVERLAP_SECONDS
        : effectiveDuration;

      const outputPath = createTempFilePath(`chunk-${index}`, extension);
      tempFiles.push(outputPath);

      // Extraire le segment
      await extractAudioSegment(inputPath, currentStart, segmentDuration, outputPath);

      const chunkBuffer = fs.readFileSync(outputPath);
      
      chunks.push({
        index,
        startSeconds: currentStart,
        endSeconds: Math.min(currentStart + segmentDuration, totalDuration),
        buffer: chunkBuffer,
        filePath: outputPath,
      });

      console.log(`[AudioChunker] Chunk ${index}: ${currentStart.toFixed(1)}s → ${(currentStart + segmentDuration).toFixed(1)}s (${(chunkBuffer.length / 1024 / 1024).toFixed(1)}MB)`);

      // Avancer au prochain segment (sans le chevauchement)
      currentStart = effectiveEnd;
      index++;
    }

    console.log(`[AudioChunker] Split into ${chunks.length} chunks`);
    return { chunks, totalDuration, tempFiles };

  } catch (error) {
    // Nettoyer en cas d'erreur
    await cleanupTempFiles(tempFiles);
    throw error;
  }
}

/**
 * Supprimer les mots dupliqués aux jonctions entre chunks
 * 
 * Stratégie : comparer les derniers N mots du chunk précédent
 * avec les premiers N mots du chunk suivant.
 * Supprimer le préfixe dupliqué du chunk suivant.
 */
function deduplicateOverlap(previousText: string, currentText: string): string {
  if (!previousText || !currentText) return currentText;

  const prevWords = previousText.trim().split(/\s+/);
  const currWords = currentText.trim().split(/\s+/);

  if (prevWords.length === 0 || currWords.length === 0) return currentText;

  // Chercher le chevauchement maximal (jusqu'à 30 mots)
  const maxOverlap = Math.min(30, prevWords.length, currWords.length);
  let bestOverlap = 0;

  for (let overlapLen = 1; overlapLen <= maxOverlap; overlapLen++) {
    // Comparer les derniers `overlapLen` mots du texte précédent
    // avec les premiers `overlapLen` mots du texte courant
    const prevSuffix = prevWords.slice(-overlapLen).join(' ').toLowerCase();
    const currPrefix = currWords.slice(0, overlapLen).join(' ').toLowerCase();

    if (prevSuffix === currPrefix) {
      bestOverlap = overlapLen;
    }
  }

  if (bestOverlap > 0) {
    console.log(`[AudioChunker] Deduplicated ${bestOverlap} overlapping words`);
    return currWords.slice(bestOverlap).join(' ');
  }

  return currentText;
}

/**
 * Réassembler les transcriptions des chunks en un texte cohérent
 */
export function reassembleTranscriptions(
  chunkResults: ChunkTranscriptionResult[]
): string {
  if (chunkResults.length === 0) return '';
  if (chunkResults.length === 1) return chunkResults[0].text;

  // Trier par index
  const sorted = [...chunkResults].sort((a, b) => a.index - b.index);

  let fullText = sorted[0].text;

  for (let i = 1; i < sorted.length; i++) {
    const deduplicatedText = deduplicateOverlap(
      sorted[i - 1].text,
      sorted[i].text
    );
    fullText += ' ' + deduplicatedText;
  }

  // Nettoyer les espaces multiples
  return fullText.replace(/\s+/g, ' ').trim();
}

/**
 * Transcrire un chunk audio via la fonction de transcription fournie
 * 
 * @param chunk - Le chunk audio à transcrire
 * @param transcribeFn - Fonction de transcription (injection de dépendance)
 */
export async function transcribeChunk(
  chunk: AudioChunk,
  transcribeFn: (audioBuffer: Buffer, mimeType: string) => Promise<{ text: string; language: string; duration: number }>
): Promise<ChunkTranscriptionResult> {
  console.log(`[AudioChunker] Transcribing chunk ${chunk.index} (${(chunk.buffer.length / 1024 / 1024).toFixed(1)}MB)`);

  const result = await transcribeFn(chunk.buffer, 'audio/flac');

  return {
    index: chunk.index,
    text: result.text,
    startSeconds: chunk.startSeconds,
    endSeconds: chunk.endSeconds,
    language: result.language,
    duration: result.duration,
  };
}

/**
 * Transcrire des chunks en parallèle avec contrôle de concurrence
 */
export async function transcribeChunksParallel(
  chunks: AudioChunk[],
  transcribeFn: (audioBuffer: Buffer, mimeType: string) => Promise<{ text: string; language: string; duration: number }>,
  maxParallel: number = MAX_PARALLEL_CHUNKS
): Promise<ChunkTranscriptionResult[]> {
  const results: ChunkTranscriptionResult[] = [];

  // Traiter par lots de maxParallel
  for (let i = 0; i < chunks.length; i += maxParallel) {
    const batch = chunks.slice(i, i + maxParallel);
    console.log(`[AudioChunker] Processing batch ${Math.floor(i / maxParallel) + 1}/${Math.ceil(chunks.length / maxParallel)} (${batch.length} chunks)`);

    const batchResults = await Promise.all(
      batch.map(chunk => transcribeChunk(chunk, transcribeFn))
    );

    results.push(...batchResults);
  }

  return results;
}
