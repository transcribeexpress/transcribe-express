import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16MB (limite Groq API)
const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/mp4': ['.m4a'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

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

    // Gérer les fichiers rejetés
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`Le fichier est trop volumineux. Taille maximale : ${Math.floor(maxSize / 1024 / 1024)}MB`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Format de fichier non supporté. Formats acceptés : MP3, WAV, M4A, OGG, MP4, WEBM');
      } else {
        setError('Erreur lors de la sélection du fichier');
      }
      return;
    }

    // Gérer le fichier accepté
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  }, [onFileSelect, maxSize]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize,
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
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

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

            <div className="text-xs text-gray-500 space-y-1">
              <p>Formats acceptés : MP3, WAV, M4A, OGG, MP4, WEBM</p>
              <p>Taille maximale : {Math.floor(maxSize / 1024 / 1024)}MB</p>
            </div>
          </div>
        )}

        {selectedFile && !error && (
          <div className="flex items-center space-x-4 w-full max-w-md">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#34D5BE]/20 flex items-center justify-center">
              <File className="w-6 h-6 text-[#34D5BE]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">
                {formatFileSize(selectedFile.size)}
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
