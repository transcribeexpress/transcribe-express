/**
 * Composant TranscriptionProgress
 * 
 * Affiche un indicateur de progression multi-étapes pour la transcription :
 * 1. Upload → 2. Traitement → 3. Transcription → 4. Terminé
 * 
 * Avec estimation de temps restant basée sur la durée audio
 */

import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export type TranscriptionStep = 'upload' | 'processing' | 'transcription' | 'completed';

export interface TranscriptionProgressProps {
  currentStep: TranscriptionStep;
  progress?: number;          // Progression en % (0-100)
  estimatedTimeSeconds?: number; // Temps estimé restant en secondes
  error?: string;
}

const STEPS: Array<{ id: TranscriptionStep; label: string }> = [
  { id: 'upload', label: 'Upload' },
  { id: 'processing', label: 'Traitement' },
  { id: 'transcription', label: 'Transcription' },
  { id: 'completed', label: 'Terminé' },
];

export const TranscriptionProgress: React.FC<TranscriptionProgressProps> = ({
  currentStep,
  progress = 0,
  estimatedTimeSeconds,
  error,
}) => {
  const currentStepIndex = STEPS.findIndex((step) => step.id === currentStep);

  const getStepStatus = (stepIndex: number): 'completed' | 'current' | 'pending' => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'pending';
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Barre de progression globale */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {STEPS[currentStepIndex]?.label || 'En cours...'}
          </span>
          {estimatedTimeSeconds !== undefined && estimatedTimeSeconds > 0 && (
            <span className="text-muted-foreground">
              Temps estimé : {formatTime(estimatedTimeSeconds)}
            </span>
          )}
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E935C1] to-[#06B6D4] transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {progress}%
        </div>
      </div>

      {/* Étapes */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              {/* Étape */}
              <div className="flex flex-col items-center gap-2">
                {/* Icône */}
                <div
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${
                      status === 'completed'
                        ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-[#06B6D4]'
                        : status === 'current'
                        ? 'border-[#E935C1] bg-[#E935C1]/10 text-[#E935C1]'
                        : 'border-border bg-background text-muted-foreground'
                    }
                  `}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : status === 'current' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-xs font-medium transition-colors
                    ${
                      status === 'completed'
                        ? 'text-[#06B6D4]'
                        : status === 'current'
                        ? 'text-[#E935C1]'
                        : 'text-muted-foreground'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {/* Ligne de connexion */}
              {!isLast && (
                <div
                  className={`
                    flex-1 h-0.5 mx-2 transition-colors
                    ${
                      status === 'completed'
                        ? 'bg-[#06B6D4]'
                        : 'bg-border'
                    }
                  `}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive font-medium">
            ⚠️ {error}
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Hook pour calculer la progression et l'estimation de temps
 * 
 * @param currentStep - Étape actuelle
 * @param audioDurationSeconds - Durée audio en secondes
 * @returns Progression (0-100) et temps estimé restant
 */
export function useTranscriptionProgress(
  currentStep: TranscriptionStep,
  audioDurationSeconds?: number
): { progress: number; estimatedTimeSeconds: number | undefined } {
  const stepProgress: Record<TranscriptionStep, number> = {
    upload: 25,
    processing: 50,
    transcription: 75,
    completed: 100,
  };

  const progress = stepProgress[currentStep] || 0;

  // Estimation de temps : durée audio / 10
  // (Whisper traite environ 10x plus vite que le temps réel)
  let estimatedTimeSeconds: number | undefined;
  if (audioDurationSeconds && currentStep !== 'completed') {
    const baseEstimate = Math.ceil(audioDurationSeconds / 10);
    
    // Ajuster selon l'étape
    if (currentStep === 'upload') {
      estimatedTimeSeconds = baseEstimate + 5; // +5s pour l'upload
    } else if (currentStep === 'processing') {
      estimatedTimeSeconds = baseEstimate + 2; // +2s pour le traitement
    } else if (currentStep === 'transcription') {
      estimatedTimeSeconds = baseEstimate;
    }
  }

  return { progress, estimatedTimeSeconds };
}
