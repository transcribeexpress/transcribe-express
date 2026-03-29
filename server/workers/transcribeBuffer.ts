/**
 * Module transcribeBuffer — Envoyer un buffer audio directement à Groq Whisper
 * 
 * Ce module est un wrapper autour de l'API Whisper qui accepte un Buffer audio
 * au lieu d'une URL. Il est utilisé par le worker après l'extraction audio FFmpeg.
 * 
 * Différence avec voiceTranscription.ts :
 * - voiceTranscription.ts : télécharge depuis une URL, puis envoie à Whisper
 * - transcribeBuffer.ts : reçoit directement un Buffer, l'envoie à Whisper
 */

import { ENV } from '../_core/env';

export interface TranscribeBufferResult {
  text: string;
  language: string;
  duration: number;
}

/**
 * Transcrire un buffer audio via Groq Whisper API
 * 
 * @param audioBuffer - Buffer audio (FLAC, MP3, WAV, etc.)
 * @param mimeType - Type MIME du buffer (ex: 'audio/flac')
 * @param language - Code langue ISO-639-1 (ex: 'fr')
 * @returns Texte transcrit, langue détectée, durée
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType: string = 'audio/flac',
  language: string = 'fr'
): Promise<TranscribeBufferResult> {
  // Vérifier la configuration
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    throw new Error('Voice transcription service is not configured (missing FORGE_API_URL or FORGE_API_KEY)');
  }

  // Vérifier la taille (limite Groq : 25 Mo)
  const sizeMB = audioBuffer.length / (1024 * 1024);
  if (sizeMB > 25) {
    throw new Error(`Audio buffer too large: ${sizeMB.toFixed(1)}MB (max 25MB)`);
  }

  // Déterminer l'extension
  const extMap: Record<string, string> = {
    'audio/flac': 'flac',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  };
  const extension = extMap[mimeType] || 'flac';

  // Construire le FormData
  const formData = new FormData();
  const audioBlob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
  formData.append('file', audioBlob, `audio.${extension}`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'verbose_json');
  formData.append('prompt', 'Transcription audio/vidéo en français');

  if (language) {
    // Note : Groq Whisper ne supporte pas le paramètre language directement
    // mais le prompt aide à guider la détection
  }

  // Appeler l'API Whisper
  const baseUrl = ENV.forgeApiUrl.endsWith('/')
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/`;

  const fullUrl = new URL('v1/audio/transcriptions', baseUrl).toString();

  const response = await fetch(fullUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${ENV.forgeApiKey}`,
      'Accept-Encoding': 'identity',
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Whisper API error ${response.status}: ${errorText.slice(0, 500)}`);
  }

  const result = await response.json() as {
    text: string;
    language: string;
    duration: number;
    segments?: any[];
  };

  if (!result.text || typeof result.text !== 'string') {
    throw new Error('Invalid Whisper API response: missing text field');
  }

  return {
    text: result.text,
    language: result.language || language,
    duration: result.duration || 0,
  };
}
