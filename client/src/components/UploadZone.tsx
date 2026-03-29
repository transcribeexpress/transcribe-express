import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, Film, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVideoFile, SUPPORTED_EXTENSIONS } from '@/utils/audioValidation';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 Mo (V2)

/**
 * Valider un fichier par son extension (pas par MIME type)
 * 
 * Raison : Sur iOS/Safari, les fichiers .mov sont souvent envoyés avec
 * un MIME type vide ou 'application/octet-stream' au lieu de 'video/quicktime'.
 * react-dropzone rejette ces fichiers si on utilise la validation MIME stricte.
 * 
 * Solution : On désactive la validation `accept` de react-dropzone et on
 * valide manuellement par extension de fichier.
 */
function isAcceptedFile(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return SUPPORTED_EXTENSIONS.includes(ext);
}

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  maxSize?: number;
  disabled?: boolean;
}

export function UploadZone({ 
  onFileSelect, 
  maxSize = MAX_FILE_SIZE,
  disabled = false 
}: UploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    // Combiner tous les fichiers (acceptés + rejetés par MIME) pour validation manuelle
    const allFiles = [
      ...acceptedFiles,
      ...rejectedFiles.map((r: any) => r.file).filter(Boolean),
    ];

    if (allFiles.length === 0) {
      setError('Aucun fichier sélectionné');
      return;
    }

    const file = allFiles[0];

    // Validation manuelle par extension
    if (!isAcceptedFile(file)) {
      setError('Format non supporté. Formats acceptés : MP3, WAV, M4A, OGG, FLAC, MP4, MOV, AVI, MKV, WEBM');
      return;
    }

    // Validation de taille
    if (file.size > maxSize) {
      setError(`Le fichier est trop volumineux (${(file.size / 1024 / 1024).toFixed(0)} Mo). Taille maximale : ${Math.floor(maxSize / 1024 / 1024)} Mo`);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  }, [onFileSelect, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // NE PAS utiliser `accept` pour éviter le rejet MIME sur iOS/Safari
    // La validation est faite manuellement dans onDrop par extension
    maxSize: undefined, // Désactivé, géré manuellement
    multiple: false,
    disabled,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  };

  const isVideo = selectedFile ? isVideoFile(selectedFile) : false;

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center w-full min-h-[280px] p-8',
          'border-2 border-dashed rounded-xl transition-all duration-200',
          'cursor-pointer',
          isDragActive && 'border-[#BE34D5] bg-[#BE34D5]/10',
          !isDragActive && !error && 'border-gray-600 hover:border-[#BE34D5] hover:bg-[#BE34D5]/5',
          error && 'border-red-500 bg-red-500/5',
          disabled && 'opacity-50 cursor-not-allowed',
          selectedFile && 'border-[#34D5BE] bg-[#34D5BE]/5'
        )}
      >
        <input {...getInputProps()} />

        {!selectedFile && !error && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-[#BE34D5]/20 to-[#34D5BE]/20',
              'border border-[#BE34D5]/30'
            )}>
              <Upload className="w-8 h-8 text-[#BE34D5]" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-200">
                {isDragActive ? 'Déposez le fichier ici' : 'Glissez-déposez votre fichier'}
              </p>
              <p className="text-sm text-gray-400">
                ou cliquez pour sélectionner
              </p>
            </div>

            <div className="text-xs text-gray-500 space-y-1.5">
              <div className="flex items-center gap-2 justify-center">
                <Music className="w-3.5 h-3.5" />
                <span>Audio : MP3, WAV, M4A, OGG, FLAC, WEBM</span>
              </div>
              <div className="flex items-center gap-2 justify-center">
                <Film className="w-3.5 h-3.5" />
                <span>Vidéo : MP4, MOV, AVI, MKV, WEBM</span>
              </div>
              <p className="text-gray-600 mt-1">Taille max : {Math.floor(maxSize / 1024 / 1024)} Mo • Durée max : 120 min</p>
            </div>
          </div>
        )}

        {selectedFile && !error && (
          <div className="flex items-center space-x-4 w-full max-w-md">
            <div className={cn(
              'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
              isVideo ? 'bg-[#BE34D5]/20' : 'bg-[#34D5BE]/20'
            )}>
              {isVideo ? (
                <Film className="w-6 h-6 text-[#BE34D5]" />
              ) : (
                <Music className="w-6 h-6 text-[#34D5BE]" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatFileSize(selectedFile.size)}
                {isVideo && (
                  <span className="ml-2 text-[#BE34D5]">• Vidéo — l'audio sera extrait automatiquement</span>
                )}
              </p>
            </div>

            <button
              onClick={handleRemove}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
              type="button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/20 border border-red-500/30">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-400">
                Erreur de validation
              </p>
              <p className="text-sm text-gray-400 max-w-md">
                {error}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(null);
              }}
              className="text-sm text-[#BE34D5] hover:text-[#BE34D5]/80 transition-colors"
              type="button"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
