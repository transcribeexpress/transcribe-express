/**
 * Composant TranscriptionList - Liste des transcriptions de l'utilisateur
 * 
 * Affiche une table avec les colonnes :
 * - Nom du fichier
 * - Durée
 * - Statut (badge coloré)
 * - Actions (Télécharger, Voir, Supprimer)
 * 
 * Utilise le polling automatique pour mise à jour en temps réel.
 * 
 * IMPORTANT: Tous les hooks sont appelés AVANT les returns conditionnels
 * pour respecter les règles React (Rules of Hooks).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2, Loader2, Ban, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Mic } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * Formater la durée en secondes vers format MM:SS
 */
function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--:--";
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formater la date de création
 */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

interface TranscriptionListProps {
  transcriptions?: Array<{
    id: number;
    fileName: string;
    status: "pending" | "processing" | "completed" | "error" | "cancelled";
    duration: number | null;
    createdAt: Date;
  }>;
  isLoading?: boolean;
}

export function TranscriptionList({ transcriptions, isLoading }: TranscriptionListProps = {}) {
  // ============================================================
  // TOUS LES HOOKS DOIVENT ÊTRE APPELÉS ICI, AVANT TOUT RETURN
  // ============================================================
  
  // Hook 1: useLocation (pour navigation)
  const [, setLocation] = useLocation();
  
  // Hook 2: État du dialog de confirmation de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transcriptionToDelete, setTranscriptionToDelete] = useState<{ id: number; fileName: string } | null>(null);

  // Hook 3: tRPC utils pour invalidation du cache
  const utils = trpc.useUtils();

  // Hook 4: tRPC query (fallback si pas de props)
  const query = trpc.transcriptions.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    enabled: transcriptions === undefined,
  });

  // Hook 5: Mutation d'annulation
  const cancelMutation = trpc.transcriptions.cancel.useMutation({
    onSuccess: () => {
      toast.success("Transcription annulée");
      query.refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Hook 6: Mutation de suppression
  const deleteMutation = trpc.transcriptions.delete.useMutation({
    onSuccess: () => {
      toast.success("Transcription supprimée");
      setDeleteDialogOpen(false);
      setTranscriptionToDelete(null);
      // Invalider le cache pour rafraîchir la liste
      utils.transcriptions.list.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression : ${error.message}`);
      setDeleteDialogOpen(false);
    },
  });

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleDeleteClick = (id: number, fileName: string) => {
    setTranscriptionToDelete({ id, fileName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (transcriptionToDelete) {
      deleteMutation.mutate({ id: transcriptionToDelete.id });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTranscriptionToDelete(null);
  };

  // ============================================================
  // LOGIQUE DÉRIVÉE (pas de hooks après ce point)
  // ============================================================
  
  const data = transcriptions ?? query.data;
  const loading = isLoading ?? query.isLoading;

  // ============================================================
  // RETURNS CONDITIONNELS (safe car tous les hooks sont déjà appelés)
  // ============================================================

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="border-2 border-dashed border-border rounded-xl bg-muted/20">
        <EmptyState
          icon={Mic}
          title="Aucune transcription"
          description="Vous n'avez pas encore de transcription. Commencez par uploader un fichier audio ou vidéo pour le transcrire automatiquement."
          actionLabel="Uploader un fichier"
          onAction={() => setLocation("/upload")}
        />
      </div>
    );
  }

  return (
    <>
      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la transcription ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La transcription{" "}
              <span className="font-medium text-foreground">
                "{transcriptionToDelete?.fileName}"
              </span>{" "}
              et son fichier audio seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} disabled={deleteMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression...
                </span>
              ) : (
                "Supprimer définitivement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Table des transcriptions */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nom du fichier</TableHead>
              <TableHead className="w-[15%]">Durée</TableHead>
              <TableHead className="w-[15%]">Statut</TableHead>
              <TableHead className="w-[20%]">Date</TableHead>
              <TableHead className="w-[10%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((transcription) => (
              <TableRow key={transcription.id}>
                <TableCell className="font-medium">
                  {transcription.fileName}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDuration(transcription.duration)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={transcription.status} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(transcription.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Transcription en cours : lien vers la progression */}
                    {(transcription.status === "pending" || transcription.status === "processing") && (
                      <>
                        <Link href={`/progress/${transcription.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            title="Voir la progression"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-orange-500 hover:text-orange-500"
                          title="Arrêter le traitement"
                          onClick={() => cancelMutation.mutate({ id: transcription.id })}
                          disabled={cancelMutation.isPending}
                        >
                          {cancelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}

                    {/* Transcription terminée : voir + télécharger */}
                    {transcription.status === "completed" && (
                      <>
                        <Link href={`/results/${transcription.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Voir la transcription"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}

                    {/* Supprimer (visible pour completed, error, cancelled) */}
                    {(transcription.status === "completed" ||
                      transcription.status === "error" ||
                      transcription.status === "cancelled") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                        onClick={() => handleDeleteClick(transcription.id, transcription.fileName)}
                        disabled={deleteMutation.isPending && transcriptionToDelete?.id === transcription.id}
                      >
                        {deleteMutation.isPending && transcriptionToDelete?.id === transcription.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
