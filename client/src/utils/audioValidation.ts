/**
 * Module de validation audio/vidéo — V2
 * 
 * Valide les fichiers audio/vidéo avant upload :
 * - Format (mp3, wav, m4a, webm, ogg, mp4, mov, avi, mkv, flac)
 * - Taille (< 500 Mo — l'extraction audio côté serveur réduit la taille)
 * - Durée (< 120 minutes)
 */

export interface AudioValidationResult {
  valid: boolean;
  error?: string;
  duration?: number; // Durée en secondes
  size?: number;     // Taille en bytes
}

// Formats audio supportés
export const SUPPORTED_AUDIO_FORMATS = [
  'audio/mpeg',      // mp3
  'audio/wav',       // wav
  'audio/x-wav',     // wav
  'audio/x-m4a',     // m4a
  'audio/mp4',       // m4a
  'audio/ogg',       // ogg
  'audio/flac',      // flac
  'audio/webm',      // webm
];

// Formats vidéo supportés (nouveauté V2 : MOV, AVI, MKV)
export const SUPPORTED_VIDEO_FORMATS = [
  'video/mp4',           // mp4
  'video/webm',          // webm
  'video/quicktime',     // mov (iPhone natif)
  'video/x-msvideo',    // avi
  'video/x-matroska',   // mkv
];

export const SUPPORTED_FORMATS = [...SUPPORTED_AUDIO_FORMATS, ...SUPPORTED_VIDEO_FORMATS];

// Extensions supportées (V2 : ajout mov, avi, mkv, flac)
export const SUPPORTED_EXTENSIONS = [
  'mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm',  // audio
  'mp4', 'mov', 'avi', 'mkv',                    // vidéo
];

// Taille maximale : 500 Mo (V2 : le serveur extrait l'audio et réduit la taille)
export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Durée maximale : 120 minutes (V2 : chunking automatique côté serveur)
export const MAX_DURATION_MINUTES = 120;
export const MAX_DURATION_SECONDS = MAX_DURATION_MINUTES * 60;

/**
 * Valide le format du fichier
 */
export function validateFormat(file: File): boolean {
  // Vérifier le MIME type
  if (SUPPORTED_FORMATS.includes(file.type)) {
    return true;
  }
  
  // Fallback : vérifier l'extension (important pour .mov sur certains navigateurs)
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS.includes(extension) : false;
}

/**
 * Valide la taille du fichier
 */
export function validateSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Obtient la durée d'un fichier audio/vidéo via HTMLMediaElement
 * 
 * @param file - Fichier audio/vidéo
 * @returns Durée en secondes, ou null si impossible de déterminer
 */
export async function getDurationFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      // Créer un élément audio/vidéo temporaire
      const isVideo = file.type.startsWith('video/') || 
        ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(file.name.split('.').pop()?.toLowerCase() || '');
      const mediaElement = document.createElement(isVideo ? 'video' : 'audio');
      
      // Créer une URL object pour le fichier
      const objectUrl = URL.createObjectURL(file);
      
      // Écouter l'événement loadedmetadata pour obtenir la durée
      mediaElement.addEventListener('loadedmetadata', () => {
        const duration = mediaElement.duration;
        
        // Nettoyer
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        
        // Vérifier si la durée est valide
        if (isFinite(duration) && duration > 0) {
          resolve(Math.floor(duration));
        } else {
          resolve(null);
        }
      });
      
      // Gérer les erreurs
      mediaElement.addEventListener('error', () => {
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        resolve(null);
      });
      
      // Charger le fichier
      mediaElement.src = objectUrl;
      mediaElement.load();
      
      // Timeout après 15 secondes (plus long pour les gros fichiers)
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        mediaElement.remove();
        resolve(null);
      }, 15000);
      
    } catch (error) {
      console.error('[AudioValidation] Error getting duration:', error);
      resolve(null);
    }
  });
}

/**
 * Valide la durée du fichier
 */
export function validateDuration(durationSeconds: number): boolean {
  return durationSeconds <= MAX_DURATION_SECONDS;
}

/**
 * Valide un fichier audio/vidéo complet
 * 
 * @param file - Fichier à valider
 * @param checkDuration - Si true, vérifie aussi la durée (plus lent)
 * @returns Résultat de validation avec détails
 */
export async function validateAudioFile(
  file: File,
  checkDuration: boolean = true
): Promise<AudioValidationResult> {
  // 1. Valider le format
  if (!validateFormat(file)) {
    return {
      valid: false,
      error: `Format non supporté. Formats acceptés : ${SUPPORTED_EXTENSIONS.join(', ').toUpperCase()}`,
    };
  }
  
  // 2. Valider la taille
  if (!validateSize(file)) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `Fichier trop volumineux (${sizeMB} Mo). Taille maximale : ${MAX_FILE_SIZE_MB} Mo`,
      size: file.size,
    };
  }
  
  // 3. Valider la durée (optionnel, plus lent)
  if (checkDuration) {
    const duration = await getDurationFromFile(file);
    
    if (duration === null) {
      // Impossible de déterminer la durée — on laisse passer
      // Le serveur gérera la validation finale
      console.warn('[AudioValidation] Could not determine duration, skipping validation');
      return {
        valid: true,
        size: file.size,
      };
    }
    
    if (!validateDuration(duration)) {
      const durationMinutes = Math.floor(duration / 60);
      return {
        valid: false,
        error: `Durée trop longue (${durationMinutes} min). Durée maximale : ${MAX_DURATION_MINUTES} min`,
        duration,
        size: file.size,
      };
    }
    
    return {
      valid: true,
      duration,
      size: file.size,
    };
  }
  
  // Validation rapide sans durée
  return {
    valid: true,
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
 * Formate la taille en Mo
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' Ko';
  }
  return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
}

/**
 * Détermine si un fichier est un format vidéo
 */
export function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
}
