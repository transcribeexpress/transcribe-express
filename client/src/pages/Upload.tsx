/**
 * Page Upload - Upload de fichiers audio/vidéo
 * 
 * V4 : Architecture hybride avec extraction audio côté client
 * 
 * Pipeline vidéo (MP4, MOV, AVI, MKV, WebM) :
 * 1. Extraction audio côté client via FFmpeg WASM (stream copy, quasi-instantané)
 * 2. Upload de l'audio léger (~5-8 Mo au lieu de 500+ Mo) vers S3
 * 3. Transcription serveur (pas besoin d'extraction FFmpeg côté serveur)
 * 
 * Pipeline audio (MP3, WAV, M4A, OGG, FLAC) :
 * 1. Upload direct vers S3
 * 2. Transcription serveur
 * 
 * Fallback :
 * Si FFmpeg WASM échoue → upload vidéo brute + extraction serveur (pipeline V3)
 * 
 * Avantages :
 * - Vidéo 550 Mo → audio ~5 Mo = upload 100x plus rapide
 * - Coûts S3 divisés par 100
 * - Pas de timeout serveur pour les gros fichiers
 * - 100% des utilisateurs couverts (fallback automatique)
 */

import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { UploadZone } from "@/components/UploadZone";
import { UploadProgress } from "@/components/UploadProgress";
import { TranscriptionProgress, useTranscriptionProgress } from "@/components/TranscriptionProgress";
import { trpc } from "@/lib/trpc";
import { validateFormat, isVideoFile } from "@/utils/audioValidation";
import { needsAudioExtraction, extractAudioFromVideo, isFFmpegSupported } from "@/utils/audioExtractor";
import type { ExtractionProgressCallback } from "@/utils/audioExtractor";
import { ArrowLeft, Wand2, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { UploadSkeleton } from "@/components/UploadSkeleton";
import { toast } from "@/components/Toast";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/transcribe_express_logo_minimal_dark_291fc88b.webp";

/** Étapes du pipeline côté client */
type ClientPipelineStage = 
  | 'idle'
  | 'extracting'      // Extraction audio WASM en cours
  | 'uploading'        // Upload vers S3
  | 'confirming'       // Confirmation au serveur
  | 'done';            // Redirection vers /progress/:id

interface ExtractionState {
  stage: string;
  percent: number;
  message: string;
}

/** Formater une taille en octets */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}

export default function Upload() {
  const { isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
  const [, setLocation] = useLocation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStage, setPipelineStage] = useState<ClientPipelineStage>('idle');
  const [extractionState, setExtractionState] = useState<ExtractionState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{ original: number; extracted: number; ratio: number } | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  
  // Mutations tRPC pour l'upload direct S3
  const getUploadUrl = trpc.transcriptions.getUploadUrl.useMutation();
  const confirmUpload = trpc.transcriptions.confirmUpload.useMutation();

  const handleFileSelect = useCallback(async (file: File) => {
    setValidationError(null);
    setCompressionInfo(null);
    setUsedFallback(false);
    
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
   * Upload un fichier vers S3 via URL pré-signée avec progression XHR
   */
  const uploadToS3 = useCallback(async (file: File): Promise<{ fileKey: string; fileUrl: string }> => {
    // Obtenir l'URL pré-signée
    const { uploadUrl, fileKey, fileUrl } = await getUploadUrl.mutateAsync({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    });

    // Upload direct vers S3 via XHR
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

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

      xhr.onerror = () => reject(new Error('Erreur réseau. Vérifiez votre connexion.'));
      xhr.ontimeout = () => reject(new Error('Le transfert a expiré. Vérifiez votre connexion.'));
      xhr.timeout = 30 * 60 * 1000; // 30 minutes

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });

    xhrRef.current = null;
    return { fileKey, fileUrl };
  }, [getUploadUrl]);

  /**
   * Pipeline principal : extraction audio côté client + upload + transcription
   * 
   * Décision automatique :
   * - Vidéo → extraction WASM → upload audio léger
   * - Audio → upload direct
   * - Fallback → si WASM échoue → upload vidéo brute
   */
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setPipelineStage('idle');
    setExtractionState(null);
    setCompressionInfo(null);
    setUsedFallback(false);

    try {
      let fileToUpload = selectedFile;
      const isVideo = needsAudioExtraction(selectedFile);

      // ═══════════════════════════════════════════════════════════
      // ÉTAPE 1 : Extraction audio côté client (vidéos uniquement)
      // ═══════════════════════════════════════════════════════════
      if (isVideo && isFFmpegSupported()) {
        setPipelineStage('extracting');
        
        toast.info("Extraction audio en cours...", {
          description: `Optimisation de ${formatSize(selectedFile.size)} pour un upload ultra-rapide`,
        });

        const onProgress: ExtractionProgressCallback = (progress) => {
          setExtractionState({
            stage: progress.stage,
            percent: progress.percent,
            message: progress.message,
          });
        };

        const result = await extractAudioFromVideo(selectedFile, onProgress);

        if (result.success && result.audioFile) {
          // Extraction réussie ! On upload l'audio léger
          fileToUpload = result.audioFile;
          setCompressionInfo({
            original: result.originalSize,
            extracted: result.extractedSize!,
            ratio: result.compressionRatio!,
          });

          toast.success("Audio extrait avec succès !", {
            description: `${formatSize(result.originalSize)} → ${formatSize(result.extractedSize!)} (${result.compressionRatio!.toFixed(0)}x plus léger)`,
          });
        } else if (result.useFallback) {
          // WASM a échoué → fallback vers upload vidéo brute
          setUsedFallback(true);
          fileToUpload = selectedFile;
          
          toast.info("Mode alternatif activé", {
            description: "L'extraction locale n'est pas disponible. Le fichier vidéo sera traité côté serveur.",
          });
        }
      } else if (isVideo && !isFFmpegSupported()) {
        // Navigateur ne supporte pas WASM → fallback direct
        setUsedFallback(true);
        toast.info("Mode alternatif activé", {
          description: "Votre navigateur ne supporte pas l'extraction locale. Le fichier sera traité côté serveur.",
        });
      }

      // ═══════════════════════════════════════════════════════════
      // ÉTAPE 2 : Upload vers S3
      // ═══════════════════════════════════════════════════════════
      setPipelineStage('uploading');
      setUploadProgress(0);

      const uploadSizeMsg = isVideo && !usedFallback && fileToUpload !== selectedFile
        ? `Upload de l'audio optimisé (${formatSize(fileToUpload.size)})`
        : `Upload de ${formatSize(fileToUpload.size)}`;
      
      toast.info(uploadSizeMsg);

      const { fileKey, fileUrl } = await uploadToS3(fileToUpload);

      // ═══════════════════════════════════════════════════════════
      // ÉTAPE 3 : Confirmer et lancer la transcription
      // ═══════════════════════════════════════════════════════════
      setPipelineStage('confirming');
      setUploadProgress(98);

      // IMPORTANT : envoyer le nom du fichier RÉELLEMENT uploadé
      // Si extraction client réussie : fileToUpload.name = "video.m4a" (audio)
      // Si fallback ou audio direct : fileToUpload.name = nom original
      // Le serveur utilise l'extension pour router vers le bon pipeline
      const result = await confirmUpload.mutateAsync({
        fileName: fileToUpload.name,
        fileKey,
        fileUrl,
      });

      setUploadProgress(100);
      setPipelineStage('done');

      toast.success("Upload réussi !", {
        description: "La transcription va démarrer automatiquement.",
      });

      // Rediriger vers la page de progression
      setLocation(`/progress/${result.id}`);

    } catch (error: any) {
      console.error("Pipeline error:", error);
      toast.error("Erreur", {
        description: error.message || "Une erreur est survenue.",
      });
      setIsProcessing(false);
      setUploadProgress(0);
      setPipelineStage('idle');
      setExtractionState(null);
    }
  }, [selectedFile, uploadToS3, confirmUpload, usedFallback, setLocation]);

  /** Annuler le processus en cours */
  const handleCancel = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    setIsProcessing(false);
    setUploadProgress(0);
    setPipelineStage('idle');
    setExtractionState(null);
    setCompressionInfo(null);
    toast.info("Opération annulée");
  }, []);

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

        {/* Upload Zone — visible quand pas en cours de traitement */}
        <AnimatePresence mode="wait">
          {!isProcessing && (
            <motion.div
              key="upload-zone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <UploadZone
                onFileSelect={handleFileSelect}
                disabled={isProcessing}
              />

              {selectedFile && (
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleUpload}
                    disabled={isProcessing}
                    className="min-w-[200px]"
                  >
                    {isVideoFile(selectedFile) ? (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Extraire et transcrire
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Commencer la transcription
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Pipeline en cours */}
          {isProcessing && selectedFile && (
            <motion.div
              key="pipeline-progress"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Étape d'extraction audio WASM */}
              {pipelineStage === 'extracting' && extractionState && (
                <div className="w-full max-w-2xl mx-auto p-6 rounded-xl bg-gray-900/50 border border-[#BE34D5]/30 backdrop-blur-sm">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#BE34D5]/20 flex items-center justify-center">
                      <Wand2 className="w-6 h-6 text-[#BE34D5] animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">
                        Extraction audio côté client
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {extractionState.message}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="text-lg font-semibold text-[#BE34D5]">
                        {Math.round(extractionState.percent)}%
                      </span>
                    </div>
                  </div>

                  <Progress 
                    value={extractionState.percent} 
                    className="h-2 bg-gray-800/50"
                  />

                  <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#BE34D5]/5 border border-[#BE34D5]/10">
                    <Zap className="w-4 h-4 text-[#BE34D5] mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-400">
                      L'audio est extrait directement dans votre navigateur. Seul l'audio sera uploadé, 
                      réduisant considérablement le temps de transfert.
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={handleCancel}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      type="button"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Compression réussie — info */}
              {compressionInfo && pipelineStage === 'uploading' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-2xl mx-auto p-4 rounded-lg bg-[#34D5BE]/10 border border-[#34D5BE]/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#34D5BE]/20 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-[#34D5BE]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#34D5BE]">
                        Optimisation réussie — {compressionInfo.ratio.toFixed(0)}x plus léger
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatSize(compressionInfo.original)} → {formatSize(compressionInfo.extracted)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Fallback warning */}
              {usedFallback && (pipelineStage === 'uploading' || pipelineStage === 'confirming') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-2xl mx-auto p-4 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-300/80">
                      Mode alternatif : le fichier vidéo complet est uploadé. L'extraction audio sera effectuée côté serveur.
                      Le traitement sera plus long que d'habitude.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Upload Progress (S3) */}
              {(pipelineStage === 'uploading' || pipelineStage === 'confirming' || pipelineStage === 'done') && (
                <UploadProgress
                  progress={uploadProgress}
                  fileName={compressionInfo ? `${selectedFile.name} (audio optimisé)` : selectedFile.name}
                  onCancel={pipelineStage === 'uploading' ? handleCancel : undefined}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">
              {validationError}
            </p>
          </div>
        )}
        
        {/* Info */}
        {!isProcessing && (
          <div className="mt-8 p-4 rounded-lg bg-muted/50 border border-border">
            <h3 className="font-medium mb-2">Formats acceptés</h3>
            <p className="text-sm text-muted-foreground">
              Audio : MP3, WAV, M4A, OGG, FLAC, WEBM
            </p>
            <p className="text-sm text-muted-foreground">
              Vidéo : MP4, MOV, AVI, MKV, WEBM
            </p>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-[#BE34D5] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground/70">
                  <span className="text-[#BE34D5] font-medium">Optimisation intelligente</span> — Les fichiers vidéo sont automatiquement 
                  convertis en audio dans votre navigateur avant l'upload, réduisant le temps de transfert jusqu'à 100x.
                  Aucune limite de taille.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.main>
    </div>
  );
}
