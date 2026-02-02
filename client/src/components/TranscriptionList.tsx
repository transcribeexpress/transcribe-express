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
import { EmptyState } from "@/components/EmptyState";
import { Mic, Upload } from "lucide-react";
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
    status: "pending" | "processing" | "completed" | "error";
    duration: number | null;
    createdAt: Date;
  }>;
  isLoading?: boolean;
}

export function TranscriptionList({ transcriptions, isLoading }: TranscriptionListProps = {}) {
  // Fallback to fetching if no props provided (backward compatibility)
  const query = trpc.transcriptions.list.useQuery(undefined, {
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    enabled: transcriptions === undefined,
  });

  const data = transcriptions ?? query.data;
  const loading = isLoading ?? query.isLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const [, setLocation] = useLocation();

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
