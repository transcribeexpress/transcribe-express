import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Download, Copy, Trash2, FileText, Clock, Calendar, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { generateTXT, generateSRT, generateVTT, downloadFile, getFileNameWithoutExtension } from "@/lib/exportFormats";
import { motion } from "framer-motion";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";
import { toast } from "@/components/Toast";

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mutation pour supprimer une transcription
  const deleteMutation = trpc.transcriptions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transcription supprimée", {
        description: "La transcription a été supprimée avec succès.",
      });
      // Rediriger vers le dashboard après suppression
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error("Erreur de suppression", {
        description: error.message,
      });
    },
  });

  const handleDelete = async () => {
    if (!transcription) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: transcription.id });
    } finally {
      setIsDeleting(false);
    }
  };

  const { data: transcription, isLoading, error } = trpc.transcriptions.getById.useQuery({
    id: parseInt(id || "0"),
  });

  // Fonctions d'export
  const handleExportTXT = () => {
    if (!transcription?.transcriptText) return;
    const content = generateTXT(transcription);
    const fileName = `${getFileNameWithoutExtension(transcription.fileName)}.txt`;
    downloadFile(content, fileName, "text/plain");
    toast.success("Export TXT réussi", {
      description: `Fichier ${fileName} téléchargé.`,
    });
  };

  const handleExportSRT = () => {
    if (!transcription?.transcriptText) return;
    const content = generateSRT(transcription);
    const fileName = `${getFileNameWithoutExtension(transcription.fileName)}.srt`;
    downloadFile(content, fileName, "text/plain");
    toast.success("Export SRT réussi", {
      description: `Fichier ${fileName} téléchargé.`,
    });
  };

  const handleExportVTT = () => {
    if (!transcription?.transcriptText) return;
    const content = generateVTT(transcription);
    const fileName = `${getFileNameWithoutExtension(transcription.fileName)}.vtt`;
    downloadFile(content, fileName, "text/vtt");
    toast.success("Export VTT réussi", {
      description: `Fichier ${fileName} téléchargé.`,
    });
  };

  // Fonction pour copier le texte dans le presse-papiers
  const handleCopy = async () => {
    if (!transcription?.transcriptText) return;
    
    try {
      await navigator.clipboard.writeText(transcription.transcriptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Texte copié", {
        description: "Le texte a été copié dans le presse-papiers.",
      });
    } catch (err) {
      toast.error("Erreur de copie", {
        description: "Impossible de copier le texte.",
      });
    }
  };

  // Fonction pour formater la durée (secondes → MM:SS)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Fonction pour formater la date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // États de chargement et d'erreur
  if (isLoading) {
    return <ResultsSkeleton />;
  }

  if (error || !transcription) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-500">Transcription non trouvée</h1>
          <p className="text-muted-foreground">
            {error?.message || "Cette transcription n'existe pas ou vous n'avez pas accès."}
          </p>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour au dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{transcription.fileName}</h1>
                <p className="text-sm text-muted-foreground">
                  Transcription #{transcription.id}
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer cette transcription ?
                    Cette action est irréversible et supprimera à la fois le fichier audio et la transcription.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Suppression..." : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Card 1 : Informations */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#BE34D5]" />
                Informations
              </CardTitle>
              <CardDescription>Détails de la transcription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Statut */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <div className="flex items-center gap-2">
                  {transcription.status === "completed" && (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-500">Terminé</span>
                    </>
                  )}
                  {transcription.status === "processing" && (
                    <span className="text-sm font-medium text-yellow-500">En cours...</span>
                  )}
                  {transcription.status === "error" && (
                    <span className="text-sm font-medium text-red-500">Erreur</span>
                  )}
                </div>
              </div>

              {/* Durée */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Durée
                </span>
                <span className="text-sm font-medium">{formatDuration(transcription.duration || undefined)}</span>
              </div>

              {/* Date de création */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Créé le
                </span>
                <span className="text-sm font-medium">{formatDate(transcription.createdAt)}</span>
              </div>

              {/* Nom du fichier */}
              <div className="pt-4 border-t">
                <span className="text-sm text-muted-foreground">Fichier source</span>
                <p className="text-sm font-medium mt-1 break-all">{transcription.fileName}</p>
              </div>

              {/* Message d'erreur si présent */}
              {transcription.errorMessage && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-red-500">Erreur</span>
                  <p className="text-sm text-red-400 mt-1">{transcription.errorMessage}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2 : Téléchargement */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5 text-[#34D5BE]" />
                Téléchargement
              </CardTitle>
              <CardDescription>Exportez votre transcription dans différents formats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Bouton TXT */}
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6"
                  disabled={!transcription.transcriptText}
                  onClick={handleExportTXT}
                >
                  <FileText className="w-8 h-8 text-[#BE34D5]" />
                  <div className="text-center">
                    <div className="font-semibold">Format TXT</div>
                    <div className="text-xs text-muted-foreground">Texte brut</div>
                  </div>
                </Button>

                {/* Bouton SRT */}
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6"
                  disabled={!transcription.transcriptText}
                  onClick={handleExportSRT}
                >
                  <FileText className="w-8 h-8 text-[#34D5BE]" />
                  <div className="text-center">
                    <div className="font-semibold">Format SRT</div>
                    <div className="text-xs text-muted-foreground">Sous-titres</div>
                  </div>
                </Button>

                {/* Bouton VTT */}
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-6"
                  disabled={!transcription.transcriptText}
                  onClick={handleExportVTT}
                >
                  <FileText className="w-8 h-8 text-[#BE34D5]" />
                  <div className="text-center">
                    <div className="font-semibold">Format VTT</div>
                    <div className="text-xs text-muted-foreground">WebVTT</div>
                  </div>
                </Button>
              </div>

              {!transcription.transcriptText && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  La transcription n'est pas encore disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Card 3 : Transcription (Prévisualisation) */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transcription</CardTitle>
                  <CardDescription>Prévisualisation du texte transcrit</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={!transcription.transcriptText}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transcription.transcriptText ? (
                <div className="bg-muted/30 rounded-lg p-6 max-h-[600px] overflow-y-auto">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {transcription.transcriptText}
                  </p>
                </div>
              ) : (
                <div className="bg-muted/30 rounded-lg p-12 text-center">
                  <p className="text-muted-foreground">
                    {transcription.status === "processing"
                      ? "Transcription en cours... Veuillez patienter."
                      : "Aucune transcription disponible"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </motion.div>
  );
}
