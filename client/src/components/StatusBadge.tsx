/**
 * Composant StatusBadge - Badge coloré pour les statuts de transcription
 * 
 * Affiche un badge avec icône et texte selon le statut :
 * - pending : Gris (En attente)
 * - processing : Jaune avec animation pulse (En cours)
 * - completed : Vert (Terminé)
 * - error : Rouge (Erreur)
 */

import { CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "pending" | "processing" | "completed" | "error";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    iconClassName: "",
  },
  processing: {
    label: "En cours",
    icon: Loader2,
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse",
    iconClassName: "animate-spin",
  },
  completed: {
    label: "Terminé",
    icon: CheckCircle,
    className: "bg-green-500/10 text-green-500 border-green-500/20",
    iconClassName: "",
  },
  error: {
    label: "Erreur",
    icon: XCircle,
    className: "bg-red-500/10 text-red-500 border-red-500/20",
    iconClassName: "",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        config.className,
        className
      )}
    >
      <Icon className={cn("w-3.5 h-3.5", config.iconClassName)} />
      {config.label}
    </Badge>
  );
}
