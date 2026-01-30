/**
 * Composant Pagination
 * 
 * Navigation entre les pages avec ellipses pour grandes listes
 * Accessibilité clavier (Tab, Enter, Arrow keys)
 */

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo } from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Génère les numéros de page à afficher avec ellipses
 * Exemple : [1, 2, 3, "...", 10] pour currentPage=2, totalPages=10
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  
  if (totalPages <= 7) {
    // Afficher toutes les pages si <= 7
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Toujours afficher la première page
    pages.push(1);
    
    if (currentPage <= 3) {
      // Début : [1, 2, 3, 4, "...", totalPages]
      pages.push(2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      // Fin : [1, "...", totalPages-3, totalPages-2, totalPages-1, totalPages]
      pages.push("...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      // Milieu : [1, "...", currentPage-1, currentPage, currentPage+1, "...", totalPages]
      pages.push("...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
  }
  
  return pages;
}

export const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  const pages = generatePageNumbers(currentPage, totalPages);
  
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };
  
  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, page: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPageChange(page);
    }
  };
  
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`flex items-center justify-center gap-2 ${className}`}
    >
      {/* Bouton Précédent */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Page précédente"
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Précédent</span>
      </Button>
      
      {/* Numéros de page */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
                aria-hidden="true"
              >
                ...
              </span>
            );
          }
          
          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;
          
          return (
            <Button
              key={pageNumber}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNumber)}
              onKeyDown={(e) => handleKeyDown(e, pageNumber)}
              aria-label={`Page ${pageNumber}`}
              aria-current={isActive ? "page" : undefined}
              className={`min-w-[2.5rem] ${
                isActive
                  ? "bg-gradient-to-r from-[#E935C1] to-[#06B6D4] hover:from-[#E935C1]/90 hover:to-[#06B6D4]/90"
                  : ""
              }`}
            >
              {pageNumber}
            </Button>
          );
        })}
      </div>
      
      {/* Bouton Suivant */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Page suivante"
        className="gap-1"
      >
        <span className="hidden sm:inline">Suivant</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
});
