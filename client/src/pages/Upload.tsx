/**
 * Page Upload - Upload de fichiers audio/vidéo
 * 
 * V3 : Upload direct vers S3 via URL pré-signée
 * 
 * Architecture :
 * 1. Le frontend demande une URL pré-signée au serveur (petite requête tRPC)
 * 2. Le frontend upload directement vers S3 via PUT (pas de limite proxy)
 * 3. Le frontend confirme l'upload au serveur (petite requête tRPC)
 * 4. Le serveur lance le worker de transcription
 * 
 * Avantages :
 * - AUCUNE limite de taille (pas de passage par le reverse proxy)
 * - Progression d'upload en temps réel
 * - Pas de surcharge mémoire côté serveur
 */

import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { UploadZone } from "@/components/UploadZone";
import { UploadProgress } from "@/components/UploadProgress";
import { TranscriptionProgress, useTranscriptionProgress } from "@/components/TranscriptionProgress";
import { trpc } from "@/lib/trpc";
import { validateFormat } from "@/utils/audioValidation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { UploadSkeleton } from "@/components/UploadSkeleton";
import { toast } from "@/components/Toast";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_d91b011d.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/assets/transcribe-express-wordmark-transparent-e5f6g7h8.png";

export default function Upload() {
  const { isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
  const [, setLocation] = useLocation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [transcriptionId, setTranscriptionId] = useState<number | null>(null);
  
  // Mutations tRPC pour l'upload direct S3
  const getUploadUrl = trpc.transcriptions.getUploadUrl.useMutation();
  const confirmUpload = trpc.transcriptions.confirmUpload.useMutation();
  
  // Polling pour suivre l'état de la transcription
  const { data: transcription } = trpc.transcriptions.getById.useQuery(
    { id: transcriptionId! },
    { 
      enabled: transcriptionId !== null && isSessionReady,
      refetchInterval: 2000,
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

  const handleFileSelect = useCallback(async (file: File) => {
    setValidationError(null);
    
    // Valider uniquement le format (plus de limite de taille)
    if (!validateFormat(file)) {
      const errorMsg = 'Format non supporté. Formats acceptés : MP3, WAV, M4A, OGG, FLAC, WEBM, MP4, MOV, AVI, MKV';
      setValidationError(errorMsg);
      toast.error("Format non supporté", {
        description: errorMsg,
      });
      setSelectedFile(null);
      return;
    }
    
    setSelectedFile(file);
  }, []);

  /**
   * Upload direct vers S3 via URL pré-signée
   * 
   * Étapes :
   * 1. Obtenir l'URL pré-signée depuis le serveur
   * 2. Upload direct vers S3 via PUT + XHR (progression)
   * 3. Confirmer l'upload au serveur pour lancer la transcription
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Étape 1 : Obtenir l'URL pré-signée
      toast.info("Préparation de l'upload...");
      
      const { uploadUrl, fileKey, fileUrl } = await getUploadUrl.mutateAsync({
        fileName: selectedFile.name,
        contentType: selectedFile.type || 'application/octet-stream',
      });

      // Étape 2 : Upload direct vers S3 via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = Math.floor((event.loaded / event.total) * 90);
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(95);
            resolve();
          } else {
            reject(new Error(`Erreur S3 (${xhr.status}): ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Erreur réseau. Vérifiez votre connexion.'));
        };

        xhr.ontimeout = () => {
          reject(new Error('Le transfert a expiré. Vérifiez votre connexion.'));
        };

        // Timeout de 30 minutes pour les très gros fichiers
        xhr.timeout = 30 * 60 * 1000;

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
        xhr.send(selectedFile);
      });

      // Étape 3 : Confirmer l'upload et lancer la transcription
      setUploadProgress(98);
      
      const result = await confirmUpload.mutateAsync({
        fileName: selectedFile.name,
        fileKey,
        fileUrl,
      });

      setUploadProgress(100);

      toast.success("Upload réussi !", {
        description: "La transcription va démarrer automatiquement.",
      });

      setTranscriptionId(result.id);

    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Erreur d'upload", {
        description: error.message || "Une erreur est survenue lors de l'upload du fichier.",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFile, getUploadUrl, confirmUpload]);

  // État de chargement
  if (isLoading || isSyncing) {
    return <UploadSkeleton />;
  }

  // Utilisateur non connecté
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" style={{ mixBlendMode: 'screen' }} />
          <h2 className="text-xl font-semibold">Connexion requise</h2>
          <p className="text-muted-foreground">Veuillez vous connecter pour uploader un fichier.</p>
          <Button onClick={() => setLocation("/login")}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  // Erreur de synchronisation
  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" style={{ mixBlendMode: 'screen' }} />
          <h2 className="text-xl font-semibold">Erreur de connexion</h2>
          <p className="text-muted-foreground">Impossible de synchroniser votre session.</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Transcribe Express Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" style={{ mixBlendMode: 'screen' }} />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[160px] md:max-w-[200px] object-contain" />
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <motion.main 
        className="container py-8 max-w-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
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
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">
            Nouvelle Transcription
          </h1>
          <p className="text-muted-foreground mt-1">
            Uploadez un fichier audio ou vidéo pour le transcrire automatiquement
          </p>
        </motion.div>

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
              {validationError}
            </p>
          </div>
        )}
        
        {/* Info */}
        {!transcriptionId && (
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-medium mb-2">Formats acceptés</h3>
            <p className="text-sm text-muted-foreground">
              Audio : MP3, WAV, M4A, OGG, FLAC, WEBM
            </p>
            <p className="text-sm text-muted-foreground">
              Vidéo : MP4, MOV, AVI, MKV, WEBM
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Aucune limite de taille. L'audio est extrait automatiquement des fichiers vidéo. Les fichiers volumineux sont découpés et transcrits en parallèle.
            </p>
          </div>
        )}
      </motion.main>
    </div>
  );
}
