/**
 * Page Upload - Upload de fichiers audio/vidéo
 * 
 * Page protégée accessible uniquement aux utilisateurs connectés.
 * Permet d'uploader un fichier audio/vidéo et de déclencher la transcription.
 */

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { UploadZone } from "@/components/UploadZone";
import { UploadProgress } from "@/components/UploadProgress";
import { TranscriptionProgress, useTranscriptionProgress } from "@/components/TranscriptionProgress";
import { trpc } from "@/lib/trpc";
import { validateAudioFile } from "@/utils/audioValidation";
import { Mic, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
// Toast sera ajouté plus tard

export default function Upload() {
  const { isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  // Toast hook sera ajouté plus tard

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [transcriptionId, setTranscriptionId] = useState<number | null>(null);
  
  // Polling pour suivre l'état de la transcription
  const { data: transcription } = trpc.transcriptions.getById.useQuery(
    { id: transcriptionId! },
    { 
      enabled: transcriptionId !== null,
      refetchInterval: 2000, // Polling toutes les 2 secondes
    }
  );
  
  // Calculer la progression et l'estimation de temps
  const currentStep = transcription?.status === 'completed' ? 'completed' 
    : transcription?.status === 'processing' ? 'transcription'
    : transcription?.status === 'pending' ? 'processing'
    : 'upload';
  
  const { progress: transcriptionProgress, estimatedTimeSeconds } = useTranscriptionProgress(
    currentStep,
    audioDuration
  );

  const createTranscriptionMutation = trpc.transcriptions.create.useMutation({
    onSuccess: (data) => {
      // Success notification
      console.log("Upload réussi ! La transcription va démarrer automatiquement.");
      
      // Stocker l'ID de la transcription pour le polling
      setTranscriptionId(data.id);
    },
    onError: (error) => {
      // Error notification
      console.error("Erreur d'upload:", error.message);
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      setLocation("/login");
    }
  }, [isSignedIn, isLoading, setLocation]);

  const handleFileSelect = async (file: File) => {
    setValidationError(null);
    
    // Valider le fichier (format, taille, durée)
    const validation = await validateAudioFile(file, true);
    
    if (!validation.valid) {
      setValidationError(validation.error || 'Fichier invalide');
      setSelectedFile(null);
      return;
    }
    
    // Stocker la durée pour l'estimation de temps
    if (validation.duration) {
      setAudioDuration(validation.duration);
    }
    
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Convertir le fichier en Base64
      const reader = new FileReader();
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.floor((event.loaded / event.total) * 80) + 10;
          setUploadProgress(progress);
        }
      };

      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        setUploadProgress(90);

        // Envoyer vers le serveur
        await createTranscriptionMutation.mutateAsync({
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          mimeType: selectedFile.type,
          fileBuffer: base64,
        });

        setUploadProgress(100);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Upload error:", error);
      // Error notification
      console.error("Erreur d'upload: Une erreur est survenue lors de l'upload du fichier.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">Transcribe Express</span>
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => setLocation("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au dashboard
        </Button>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Nouvelle Transcription
          </h1>
          <p className="text-muted-foreground mt-1">
            Uploadez un fichier audio ou vidéo pour le transcrire automatiquement
          </p>
        </div>

        {/* Upload Zone */}
        {!isUploading && (
          <div className="space-y-6">
            <UploadZone
              onFileSelect={handleFileSelect}
              disabled={isUploading}
            />

            {selectedFile && (
              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="min-w-[200px]"
                >
                  Commencer la transcription
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && !transcriptionId && selectedFile && (
          <UploadProgress
            progress={uploadProgress}
            fileName={selectedFile.name}
          />
        )}
        
        {/* Transcription Progress */}
        {transcriptionId && transcription && (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-card border border-border">
              <h3 className="font-medium mb-4">Transcription en cours</h3>
              <TranscriptionProgress
                currentStep={currentStep}
                progress={transcriptionProgress}
                estimatedTimeSeconds={estimatedTimeSeconds}
                error={transcription.errorMessage || undefined}
              />
            </div>
            
            {transcription.status === 'completed' && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={() => setLocation(`/results/${transcriptionId}`)}
                  className="min-w-[200px]"
                >
                  Voir les résultats
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              ⚠️ {validationError}
            </p>
          </div>
        )}
        
        {/* Info */}
        {!transcriptionId && (
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-medium mb-2">Formats acceptés</h3>
            <p className="text-sm text-muted-foreground">
              MP3, WAV, M4A, OGG, MP4, WEBM • Taille maximale : 16MB • Durée maximale : 60 min
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
