/**
 * Page de progression de transcription
 * 
 * Affiche en temps réel l'avancement du pipeline de transcription :
 * 1. Upload → 2. Téléchargement → 3. Extraction audio → 4. Transcription → 5. Terminé
 * 
 * Fonctionnalités :
 * - Stepper visuel avec icônes et couleurs
 * - Barre de progression globale (0-100%)
 * - Bouton Annuler le traitement
 * - Polling automatique toutes les 2 secondes
 * - Redirection automatique vers /results/:id quand terminé
 */

import { useRoute, useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  AudioWaveform, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Ban,
  Loader2 
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";


// Logo néon symbol
const NEON_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
// Wordmark image
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/transcribe_express_logo_minimal_dark_291fc88b.webp";

/**
 * Définition des étapes du pipeline
 */
const PIPELINE_STEPS = [
  {
    id: "uploading",
    label: "Upload",
    description: "Envoi du fichier vers le serveur",
    icon: Upload,
  },
  {
    id: "downloading",
    label: "Téléchargement",
    description: "Récupération du fichier depuis le stockage",
    icon: Download,
  },
  {
    id: "extracting_audio",
    label: "Extraction audio",
    description: "Conversion et extraction de la piste audio",
    icon: AudioWaveform,
  },
  {
    id: "transcribing",
    label: "Transcription",
    description: "Transcription automatique via IA",
    icon: FileText,
  },
  {
    id: "completed",
    label: "Terminé",
    description: "Transcription prête à consulter",
    icon: CheckCircle,
  },
];

/**
 * Déterminer l'index de l'étape actuelle
 */
function getStepIndex(processingStep: string | null): number {
  if (!processingStep) return 0;
  
  // Gérer les étapes de chunking (transcribing_1/5, transcribing_2/5, etc.)
  const baseStep = processingStep.startsWith("transcribing") ? "transcribing" : processingStep;
  
  const index = PIPELINE_STEPS.findIndex(s => s.id === baseStep);
  return index >= 0 ? index : 0;
}

/**
 * Extraire les infos de chunking depuis l'étape
 */
function getChunkInfo(processingStep: string | null): { current: number; total: number } | null {
  if (!processingStep) return null;
  const match = processingStep.match(/^transcribing_(\d+)\/(\d+)$/);
  if (match) {
    return { current: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return null;
}

export default function ProgressPage() {
  const [, params] = useRoute("/progress/:id");
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const transcriptionId = params?.id ? parseInt(params.id) : 0;

  // Polling toutes les 2 secondes
  const { data: transcription, isLoading } = trpc.transcriptions.getById.useQuery(
    { id: transcriptionId },
    {
      enabled: !!transcriptionId && !!user,
      refetchInterval: 2000,
      refetchIntervalInBackground: true,
    }
  );

  const cancelMutation = trpc.transcriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success("Transcription annulée");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Redirection automatique vers les résultats quand terminé
  useEffect(() => {
    if (transcription?.status === "completed") {
      const timer = setTimeout(() => {
        setLocation(`/results/${transcriptionId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [transcription?.status, transcriptionId, setLocation]);

  // Calcul de l'étape et de la progression
  const currentStepIndex = useMemo(
    () => getStepIndex(transcription?.processingStep ?? null),
    [transcription?.processingStep]
  );
  const chunkInfo = useMemo(
    () => getChunkInfo(transcription?.processingStep ?? null),
    [transcription?.processingStep]
  );
  const progress = transcription?.processingProgress ?? 0;
  const isTerminal = transcription?.status === "completed" || transcription?.status === "error" || transcription?.status === "cancelled";
  const canCancel = transcription?.status === "pending" || transcription?.status === "processing";

  // Auth check
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    const appId = import.meta.env.VITE_APP_ID;
    const portalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    window.location.href = `${portalUrl}?app_id=${appId}`;
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src={NEON_LOGO_URL} alt="Transcribe Express" className="h-9 w-9" />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-6 object-contain" />
          </Link>
        </div>
      </nav>

      <div className="container max-w-3xl py-8">
        {/* Retour */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Retour au dashboard
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !transcription ? (
          <Card>
            <CardContent className="py-12 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-medium">Transcription introuvable</p>
              <Button variant="outline" className="mt-4" onClick={() => setLocation("/dashboard")}>
                Retour au dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* En-tête */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">
                {isTerminal ? (
                  transcription.status === "completed" ? "Transcription terminée" :
                  transcription.status === "cancelled" ? "Transcription annulée" :
                  "Erreur de transcription"
                ) : "Transcription en cours"}
              </h1>
              <p className="text-muted-foreground">
                {transcription.fileName}
              </p>
            </div>

            {/* Barre de progression globale */}
            <Card className="mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Progression globale</span>
                  <span className={`text-2xl font-bold ${
                    transcription.status === "completed" ? "text-green-500" :
                    transcription.status === "error" ? "text-red-500" :
                    transcription.status === "cancelled" ? "text-orange-500" :
                    "bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] bg-clip-text text-transparent"
                  }`}>
                    {progress}%
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressBar 
                  value={progress} 
                  className="h-3 mb-4"
                />
                
                {chunkInfo && (
                  <p className="text-sm text-muted-foreground">
                    Transcription du segment {chunkInfo.current}/{chunkInfo.total}
                  </p>
                )}

                {transcription.status === "completed" && (
                  <p className="text-sm text-green-500 flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4" />
                    Transcription terminée ! Redirection vers les résultats...
                  </p>
                )}

                {transcription.status === "error" && (
                  <p className="text-sm text-red-500 flex items-center gap-2 mt-2">
                    <XCircle className="h-4 w-4" />
                    {transcription.errorMessage || "Une erreur est survenue"}
                  </p>
                )}

                {transcription.status === "cancelled" && (
                  <p className="text-sm text-orange-500 flex items-center gap-2 mt-2">
                    <Ban className="h-4 w-4" />
                    Transcription annulée par l'utilisateur
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stepper visuel */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-base">Étapes du traitement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {PIPELINE_STEPS.map((step, index) => {
                    const isActive = index === currentStepIndex && !isTerminal;
                    const isCompleted = index < currentStepIndex || transcription.status === "completed";
                    const isError = transcription.status === "error" && index === currentStepIndex;
                    const isCancelled = transcription.status === "cancelled" && index === currentStepIndex;
                    const isFuture = index > currentStepIndex && !isTerminal;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className="flex items-start gap-4">
                        {/* Ligne verticale + cercle */}
                        <div className="flex flex-col items-center">
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                            ${isCompleted ? "bg-green-500/20 border-green-500 text-green-500" : ""}
                            ${isActive ? "bg-primary/20 border-primary text-primary animate-pulse" : ""}
                            ${isError ? "bg-red-500/20 border-red-500 text-red-500" : ""}
                            ${isCancelled ? "bg-orange-500/20 border-orange-500 text-orange-500" : ""}
                            ${isFuture ? "bg-muted border-border text-muted-foreground" : ""}
                          `}>
                            {isCompleted ? (
                              <CheckCircle className="h-5 w-5" />
                            ) : isError ? (
                              <XCircle className="h-5 w-5" />
                            ) : isCancelled ? (
                              <Ban className="h-5 w-5" />
                            ) : isActive ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          {/* Ligne de connexion */}
                          {index < PIPELINE_STEPS.length - 1 && (
                            <div className={`w-0.5 h-12 transition-colors duration-300 ${
                              isCompleted ? "bg-green-500" : "bg-border"
                            }`} />
                          )}
                        </div>

                        {/* Texte */}
                        <div className="pt-2 pb-8">
                          <p className={`font-medium ${
                            isCompleted ? "text-green-500" :
                            isActive ? "text-primary" :
                            isError ? "text-red-500" :
                            isCancelled ? "text-orange-500" :
                            "text-muted-foreground"
                          }`}>
                            {step.label}
                            {isActive && step.id === "transcribing" && chunkInfo && (
                              <span className="text-sm font-normal ml-2">
                                (segment {chunkInfo.current}/{chunkInfo.total})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {canCancel && (
                <Button
                  variant="destructive"
                  onClick={() => cancelMutation.mutate({ id: transcriptionId })}
                  disabled={cancelMutation.isPending}
                  className="gap-2"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="h-4 w-4" />
                  )}
                  Arrêter le traitement
                </Button>
              )}

              {transcription.status === "completed" && (
                <Button
                  onClick={() => setLocation(`/results/${transcriptionId}`)}
                  className="gap-2 bg-gradient-to-r from-[#BE34D5] to-[#34D5BE] hover:opacity-90"
                >
                  <FileText className="h-4 w-4" />
                  Voir la transcription
                </Button>
              )}

              {(transcription.status === "error" || transcription.status === "cancelled") && (
                <Button
                  variant="outline"
                  onClick={() => setLocation("/upload")}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Nouvelle transcription
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => setLocation("/dashboard")}
              >
                Retour au dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
