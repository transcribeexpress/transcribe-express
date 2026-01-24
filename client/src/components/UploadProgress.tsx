import { Progress } from '@/components/ui/progress';
import { Loader2, FileAudio } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  progress: number; // 0-100
  fileName: string;
  onCancel?: () => void;
}

export function UploadProgress({ progress, fileName, onCancel }: UploadProgressProps) {
  const getStatusText = (progress: number): string => {
    if (progress < 10) return 'Préparation de l\'upload...';
    if (progress < 90) return 'Upload en cours...';
    return 'Finalisation...';
  };

  const statusText = getStatusText(progress);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#BE34D5]/20 flex items-center justify-center">
          <FileAudio className="w-6 h-6 text-[#BE34D5]" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">
            {fileName}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {statusText}
          </p>
        </div>

        <div className="flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-5 h-5 text-[#BE34D5] animate-spin" />
            <span className="text-lg font-semibold text-gray-200">
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress 
          value={progress} 
          className="h-2 bg-gray-800/50"
        />
        
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            {progress < 100 ? 'Upload en cours...' : 'Upload terminé'}
          </span>
          {onCancel && progress < 100 && (
            <button
              onClick={onCancel}
              className="text-red-400 hover:text-red-300 transition-colors"
              type="button"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Info message */}
      {progress >= 100 && (
        <div className="mt-4 p-3 rounded-lg bg-[#34D5BE]/10 border border-[#34D5BE]/20">
          <p className="text-sm text-[#34D5BE]">
            ✓ Fichier uploadé avec succès. La transcription va démarrer automatiquement.
          </p>
        </div>
      )}
    </div>
  );
}
