import axios from "axios";
import { getTranscriptionById, updateTranscriptionStatus } from "./db";
import { transcribeAudio, convertToSRT, convertToVTT } from "./groq";
import { uploadToS3, extractFileKeyFromUrl } from "./s3";
import { nanoid } from "nanoid";

/**
 * Process a transcription job
 */
export async function processTranscription(transcriptionId: number): Promise<void> {
  try {
    // Update status to processing
    await updateTranscriptionStatus(transcriptionId, "processing");

    // Get transcription details
    const transcription = await getTranscriptionById(transcriptionId);
    if (!transcription) {
      throw new Error(`Transcription ${transcriptionId} not found`);
    }

    console.log(`[Worker] Processing transcription ${transcriptionId}: ${transcription.fileName}`);

    // Download audio file from S3
    const audioResponse = await axios.get(transcription.fileUrl, {
      responseType: "arraybuffer",
      timeout: 300000, // 5 minutes
    });

    const audioBuffer = Buffer.from(audioResponse.data);

    // Transcribe audio using Groq API
    console.log(`[Worker] Transcribing audio with Groq API...`);
    const result = await transcribeAudio(audioBuffer, transcription.fileName);

    console.log(`[Worker] Transcription completed. Duration: ${result.duration}s`);

    // Generate SRT and VTT formats
    const srtContent = convertToSRT(result.text, result.duration || 0);
    const vttContent = convertToVTT(result.text, result.duration || 0);
    const txtContent = result.text;

    // Upload results to S3
    const resultKey = `results/${transcription.userId}/${nanoid()}`;

    const srtUrl = await uploadToS3(
      `${resultKey}.srt`,
      Buffer.from(srtContent, "utf-8"),
      "text/srt"
    );

    const vttUrl = await uploadToS3(
      `${resultKey}.vtt`,
      Buffer.from(vttContent, "utf-8"),
      "text/vtt"
    );

    const txtUrl = await uploadToS3(
      `${resultKey}.txt`,
      Buffer.from(txtContent, "utf-8"),
      "text/plain"
    );

    console.log(`[Worker] Results uploaded to S3`);

    // Update transcription with results
    await updateTranscriptionStatus(transcriptionId, "completed", {
      duration: result.duration ? Math.floor(result.duration) : undefined,
      resultUrl: srtUrl, // Main result URL (SRT)
      resultSrt: srtContent,
      resultVtt: vttContent,
      resultTxt: txtContent,
    });

    console.log(`[Worker] Transcription ${transcriptionId} completed successfully`);
  } catch (error: any) {
    console.error(`[Worker] Error processing transcription ${transcriptionId}:`, error);

    // Update status to error
    await updateTranscriptionStatus(transcriptionId, "error", {
      errorMessage: error.message || "Unknown error",
    });
  }
}

/**
 * Start the worker to process pending transcriptions
 * This is a simple polling implementation
 * For production, consider using a proper job queue (Bull, BullMQ, etc.)
 */
export function startWorker(intervalMs: number = 5000): NodeJS.Timeout {
  console.log(`[Worker] Starting transcription worker (polling every ${intervalMs}ms)`);

  return setInterval(async () => {
    try {
      // Get pending transcriptions from database
      const db = await import("./db").then((m) => m.getDb());
      if (!db) return;

      const { transcriptions } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const pending = await db
        .select()
        .from(transcriptions)
        .where(eq(transcriptions.status, "pending"))
        .limit(1);

      if (pending.length > 0) {
        const transcription = pending[0];
        console.log(`[Worker] Found pending transcription: ${transcription.id}`);
        await processTranscription(transcription.id);
      }
    } catch (error) {
      console.error("[Worker] Error in worker loop:", error);
    }
  }, intervalMs);
}
