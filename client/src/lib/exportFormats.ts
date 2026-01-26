/**
 * Module d'export de transcriptions dans différents formats
 * Formats supportés : TXT, SRT, VTT
 */

export interface TranscriptionSegment {
  text: string;
  start: number; // en secondes
  end: number; // en secondes
}

export interface TranscriptionData {
  id: number;
  fileName: string;
  transcriptText: string | null;
  duration?: number | null;
  createdAt: Date | string;
}

/**
 * Formater un timestamp en format HH:MM:SS,mmm (pour SRT)
 */
function formatTimestampSRT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Formater un timestamp en format HH:MM:SS.mmm (pour VTT)
 */
function formatTimestampVTT(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

/**
 * Formater la durée en format MM:SS
 */
function formatDuration(seconds?: number | null): string {
  if (!seconds) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Générer le contenu au format TXT
 */
export function generateTXT(transcription: TranscriptionData): string {
  if (!transcription.transcriptText) {
    throw new Error("Transcription text is not available");
  }
  const date = new Date(transcription.createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let content = `Transcription de : ${transcription.fileName}\n`;
  content += `Durée : ${formatDuration(transcription.duration)}\n`;
  content += `Date : ${date}\n`;
  content += `\n`;
  content += `${"=".repeat(60)}\n`;
  content += `\n`;
  content += transcription.transcriptText;
  content += `\n`;

  return content;
}

/**
 * Générer le contenu au format SRT (SubRip Subtitle)
 * 
 * Format :
 * 1
 * 00:00:05,000 --> 00:00:12,000
 * Bonjour et bienvenue dans cette vidéo
 * 
 * 2
 * 00:00:12,000 --> 00:00:25,000
 * Aujourd'hui nous allons parler de transcription
 */
export function generateSRT(
  transcription: TranscriptionData,
  segments?: TranscriptionSegment[]
): string {
  if (!transcription.transcriptText) {
    throw new Error("Transcription text is not available");
  }
  // Si pas de segments, créer un segment unique avec tout le texte
  if (!segments || segments.length === 0) {
    const duration = transcription.duration || 60; // Par défaut 60 secondes
    const lines = transcription.transcriptText.split('\n').filter(line => line.trim());
    const segmentDuration = duration / lines.length;

    let content = "";
    lines.forEach((line, index) => {
      const start = index * segmentDuration;
      const end = (index + 1) * segmentDuration;

      content += `${index + 1}\n`;
      content += `${formatTimestampSRT(start)} --> ${formatTimestampSRT(end)}\n`;
      content += `${line.trim()}\n`;
      content += `\n`;
    });

    return content;
  }

  // Avec segments
  let content = "";
  segments.forEach((segment, index) => {
    content += `${index + 1}\n`;
    content += `${formatTimestampSRT(segment.start)} --> ${formatTimestampSRT(segment.end)}\n`;
    content += `${segment.text.trim()}\n`;
    content += `\n`;
  });

  return content;
}

/**
 * Générer le contenu au format VTT (WebVTT)
 * 
 * Format :
 * WEBVTT
 * 
 * 00:00:05.000 --> 00:00:12.000
 * Bonjour et bienvenue dans cette vidéo
 * 
 * 00:00:12.000 --> 00:00:25.000
 * Aujourd'hui nous allons parler de transcription
 */
export function generateVTT(
  transcription: TranscriptionData,
  segments?: TranscriptionSegment[]
): string {
  if (!transcription.transcriptText) {
    throw new Error("Transcription text is not available");
  }
  
  let content = "WEBVTT\n\n";

  // Si pas de segments, créer un segment unique avec tout le texte
  if (!segments || segments.length === 0) {
    const duration = transcription.duration || 60; // Par défaut 60 secondes
    const lines = transcription.transcriptText.split('\n').filter(line => line.trim());
    const segmentDuration = duration / lines.length;

    lines.forEach((line, index) => {
      const start = index * segmentDuration;
      const end = (index + 1) * segmentDuration;

      content += `${formatTimestampVTT(start)} --> ${formatTimestampVTT(end)}\n`;
      content += `${line.trim()}\n`;
      content += `\n`;
    });

    return content;
  }

  // Avec segments
  segments.forEach((segment) => {
    content += `${formatTimestampVTT(segment.start)} --> ${formatTimestampVTT(segment.end)}\n`;
    content += `${segment.text.trim()}\n`;
    content += `\n`;
  });

  return content;
}

/**
 * Télécharger un fichier via Blob API
 */
export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Extraire le nom de fichier sans extension
 */
export function getFileNameWithoutExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
}
