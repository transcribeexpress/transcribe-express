/**
 * Composant SortControls
 * 
 * Contrôles de tri pour les en-têtes de tableau
 * Icônes de tri (↑ ↓) avec ordre croissant/décroissant
 */

import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { memo } from "react";

export type SortField = "createdAt" | "fileName" | "duration" | "status";
export type SortOrder = "asc" | "desc";

export interface SortState {
  field: SortField;
  order: SortOrder;
}

export interface SortControlsProps {
  field: SortField;
  label: string;
  currentSort: SortState;
  onSortChange: (field: SortField) => void;
  className?: string;
}

export const SortControls = memo(function SortControls({
  field,
  label,
  currentSort,
  onSortChange,
  className = "",
}: SortControlsProps) {
  const isActive = currentSort.field === field;
  const isAsc = isActive && currentSort.order === "asc";
  const isDesc = isActive && currentSort.order === "desc";
  
  const handleClick = () => {
    onSortChange(field);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSortChange(field);
    }
  };
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`-ml-3 h-8 data-[state=open]:bg-accent ${className}`}
      aria-label={`Trier par ${label} ${
        isActive ? (isAsc ? "décroissant" : "croissant") : ""
      }`}
    >
      <span className="font-medium">{label}</span>
      {!isActive && <ChevronsUpDown className="ml-2 h-4 w-4 text-muted-foreground" />}
      {isAsc && <ArrowUp className="ml-2 h-4 w-4 text-primary" />}
      {isDesc && <ArrowDown className="ml-2 h-4 w-4 text-primary" />}
    </Button>
  );
});

/**
 * Fonction de tri stable pour les transcriptions
 */
export function sortTranscriptions<T extends Record<string, any>>(
  items: T[],
  sortState: SortState
): T[] {
  const { field, order } = sortState;
  
  return [...items].sort((a, b) => {
    let aValue = a[field];
    let bValue = b[field];
    
    // Gestion des dates
    if (field === "createdAt") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }
    
    // Gestion des durées (en secondes)
    if (field === "duration") {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }
    
    // Gestion des strings (fileName, status)
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    // Comparaison
    let comparison = 0;
    if (aValue < bValue) {
      comparison = -1;
    } else if (aValue > bValue) {
      comparison = 1;
    }
    
    // Ordre croissant ou décroissant
    return order === "asc" ? comparison : -comparison;
  });
}
