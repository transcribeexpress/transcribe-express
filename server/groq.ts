import axios from "axios";
import FormData from "form-data";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export interface TranscriptionResult {
  text: string;
  duration?: number;
  language?: string;
}

/**
 * Transcribe audio file using Groq API (Whisper Large v3-turbo)
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string,
  language: string = "fr"
): Promise<TranscriptionResult> {
  const formData = new FormData();
  formData.append("file", audioBuffer, fileName);
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("language", language);
  formData.append("response_format", "verbose_json"); // Get detailed response with timestamps

  try {
    const response = await axios.post(GROQ_API_URL, formData, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        ...formData.getHeaders(),
      },
      timeout: 300000, // 5 minutes timeout for large files
    });

    return {
      text: response.data.text,
      duration: response.data.duration,
      language: response.data.language,
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(`Groq API error: ${error.response.data.error?.message || error.message}`);
    }
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

/**
 * Convert transcription text to SRT format
 */
export function convertToSRT(text: string, duration: number): string {
  // Simple implementation: split text into chunks of ~10 words
  const words = text.split(" ");
  const chunks: string[] = [];
  const wordsPerChunk = 10;

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }

  const chunkDuration = duration / chunks.length;

  let srt = "";
  chunks.forEach((chunk, index) => {
    const startTime = index * chunkDuration;
    const endTime = (index + 1) * chunkDuration;

    srt += `${index + 1}\n`;
    srt += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srt += `${chunk}\n\n`;
  });

  return srt;
}

/**
 * Convert transcription text to VTT format
 */
export function convertToVTT(text: string, duration: number): string {
  const srt = convertToSRT(text, duration);
  const vtt = "WEBVTT\n\n" + srt.replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2");
  return vtt;
}

/**
 * Format time in SRT format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
}
