/**
 * Module de validation audio/vidéo — V3
 * 
 * V3 : Upload direct vers S3 via URL pré-signée
 * - Aucune limite de taille (upload direct navigateur → S3)
 * - Aucune limite de durée (chunking automatique côté serveur)
 * - Validation par extension uniquement (pas de MIME type pour compatibilité iOS)
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  duration?: number;
  size?: number;
}

// Extensions supportées (audio + vidéo)
export const SUPPORTED_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm',  // audio
  'mp4', 'mov', 'avi', 'mkv',                    // vidéo
];

// Types MIME (pour référence, la validation se fait par extension)
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 
  'audio/x-m4a', 'audio/ogg', 'audio/flac', 'audio/webm',
];

export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 
  'video/x-matroska', 'video/webm',
];

export const SUPPORTED_FORMATS = [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS];

/**
 * Valide le format du fichier par extension
 */
export function validateFormat(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Détermine si un fichier est un format vidéo
 */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
}

/**
 * Détermine si un fichier est un format audio
 */
export function isAudioFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext);
}

/**
 * Obtient la durée d'un fichier audio/vidéo via HTMLMediaElement
 * (utilisé pour l'estimation de temps, non bloquant)
 */
export async function getDurationFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const isVideo = file.type.startsWith('video/') || 
        ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(file.name.split('.').pop()?.toLowerCase() || '');
      const mediaElement = document.createElement(isVideo ? 'video' : 'audio');
      const objectUrl = URL.createObjectURL(file);
      
      mediaElement.addEventListener('loadedmetadata', () => {
        const duration = mediaElement.duration;
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        
        if (isFinite(duration) && duration > 0) {
          resolve(Math.floor(duration));
        } else {
          resolve(null);
        }
      });
      
      mediaElement.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        resolve(null);
      });
      
      mediaElement.src = objectUrl;
      mediaElement.load();
      
      // Timeout après 15 secondes
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        resolve(null);
      }, 15000);
      
    } catch {
      resolve(null);
    }
  });
}

/**
 * Validation complète d'un fichier audio/vidéo
 * 
 * V3 : Seul le format est validé. Pas de limite de taille ni de durée.
 */
export async function validateAudioFile(
  file: File,
  checkDuration: boolean = true
): Promise<AudioValidationResult> {
  // Valider le format
  if (!validateFormat(file)) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'inconnu';
    return {
      valid: false,
      error: `Format .${ext} non supporté. Formats acceptés : ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`,
      size: file.size,
    };
  }
  
  // Tenter de lire la durée (pour l'estimation de temps, non bloquant)
  let duration: number | undefined;
  if (checkDuration) {
    const d = await getDurationFromFile(file);
    if (d !== null) {
      duration = d;
    }
  }
  
  return {
    valid: true,
    duration,
    size: file.size,
  };
}

/**
 * Formate la durée en minutes:secondes
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Formate la taille en unités lisibles
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}
