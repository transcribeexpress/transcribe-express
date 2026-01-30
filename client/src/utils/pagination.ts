/**
 * Utilitaires de pagination
 * 
 * Fonctions pour gérer la pagination côté client
 */

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagine un tableau d'éléments
 */
export function paginateItems<T>(
  items: T[],
  currentPage: number,
  itemsPerPage: number = 20
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Assurer que currentPage est dans les limites
  const safePage = Math.max(1, Math.min(currentPage, totalPages || 1));
  
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);
  
  return {
    items: paginatedItems,
    currentPage: safePage,
    totalPages: totalPages || 1,
    totalItems,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

/**
 * Calcule le numéro de page pour un index donné
 */
export function getPageForIndex(index: number, itemsPerPage: number = 20): number {
  return Math.floor(index / itemsPerPage) + 1;
}

/**
 * Calcule les indices de début et fin pour une page donnée
 */
export function getPageRange(page: number, itemsPerPage: number = 20): { start: number; end: number } {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return { start, end };
}
