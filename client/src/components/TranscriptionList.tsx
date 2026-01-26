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
 */

import { trpc } from "@/lib/trpc";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, Eye, Trash2 } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

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

export function TranscriptionList() {
  // Polling automatique toutes les 5 secondes
  const { data: transcriptions, isLoading } = trpc.transcriptions.list.useQuery(undefined, {
    refetchInterval: 5000, // 5 secondes
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!transcriptions || transcriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-xl bg-muted/20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-primary/60"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          Aucune transcription
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          Vous n'avez pas encore de transcription. Commencez par uploader un fichier audio ou vidéo.
        </p>
      </div>
    );
  }

  return (
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
          {transcriptions.map((transcription) => (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
