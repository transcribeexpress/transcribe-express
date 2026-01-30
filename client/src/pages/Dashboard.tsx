/**
 * Page Dashboard - Tableau de bord principal
 * 
 * Page protégée accessible uniquement aux utilisateurs connectés.
 * Affiche le header avec logo et UserMenu.
 * 
 * Note : Le contenu complet du dashboard (TranscriptionList, etc.)
 * sera implémenté au Jour 12.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/UserMenu";
import { TranscriptionList } from "@/components/TranscriptionList";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel, type StatusFilter, type DateFilter } from "@/components/FilterPanel";
import { Mic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { applyFilters } from "@/utils/filters";
import { Pagination } from "@/components/Pagination";
import { SortControls, sortTranscriptions, type SortState, type SortField } from "@/components/SortControls";
import { paginateItems } from "@/utils/pagination";

export default function Dashboard() {
  const { user, isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Get URL search params
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  
  // Parse URL params for initial state
  const initialPage = parseInt(urlParams.get("page") || "1", 10);
  const initialSortField = (urlParams.get("sort") as SortField) || "createdAt";
  const initialSortOrder = (urlParams.get("order") as "asc" | "desc") || "desc";
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 20;
  
  // Sort state
  const [sortState, setSortState] = useState<SortState>({
    field: initialSortField,
    order: initialSortOrder,
  });

  // Fetch transcriptions
  const { data: transcriptions = [], isLoading: isLoadingTranscriptions } = trpc.transcriptions.list.useQuery(
    undefined,
    {
      enabled: isSignedIn,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    }
  );

  // Apply filters and sort with useMemo for performance
  const filteredAndSortedTranscriptions = useMemo(() => {
    const filtered = applyFilters(
      transcriptions,
      searchQuery,
      statusFilter,
      dateFilter
    );
    return sortTranscriptions(filtered, sortState);
  }, [transcriptions, searchQuery, statusFilter, dateFilter, sortState]);
  
  // Apply pagination
  const paginatedResult = useMemo(() => {
    return paginateItems(filteredAndSortedTranscriptions, currentPage, itemsPerPage);
  }, [filteredAndSortedTranscriptions, currentPage]);
  
  // Update URL when pagination or sort changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set("page", currentPage.toString());
    if (sortState.field !== "createdAt") params.set("sort", sortState.field);
    if (sortState.order !== "desc") params.set("order", sortState.order);
    
    const newSearch = params.toString();
    const newUrl = newSearch ? `?${newSearch}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [currentPage, sortState]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter]);
  
  // Handle sort change
  const handleSortChange = useCallback((field: SortField) => {
    setSortState((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
  }, []);
  
  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Rediriger vers login si non connecté
  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      setLocation("/login");
    }
  }, [isSignedIn, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mic className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-lg">Transcribe Express</span>
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Mes Transcriptions
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue, {user?.firstName || user?.fullName || "Utilisateur"} !
            </p>
          </div>
          
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => setLocation("/upload")}
          >
            <Plus className="w-5 h-5" />
            Nouvelle transcription
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher une transcription..."
            />
            <FilterPanel
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
            />
          </div>

          {/* Results Counter */}
          {(searchQuery || statusFilter !== "all" || dateFilter !== "all") && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm">
                {paginatedResult.totalItems} résultat{paginatedResult.totalItems !== 1 ? "s" : ""}
              </Badge>
              {paginatedResult.totalItems === 0 && transcriptions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Aucune transcription ne correspond aux filtres
                </span>
              )}
            </div>
          )}
        </div>

        {/* Sort Controls */}
        <div className="mb-4 flex items-center gap-4 px-4 py-2 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Trier par :</span>
          <SortControls
            field="createdAt"
            label="Date"
            currentSort={sortState}
            onSortChange={handleSortChange}
          />
          <SortControls
            field="fileName"
            label="Nom"
            currentSort={sortState}
            onSortChange={handleSortChange}
          />
          <SortControls
            field="duration"
            label="Durée"
            currentSort={sortState}
            onSortChange={handleSortChange}
          />
          <SortControls
            field="status"
            label="Statut"
            currentSort={sortState}
            onSortChange={handleSortChange}
          />
        </div>
        
        {/* Liste des transcriptions avec polling automatique */}
        <TranscriptionList 
          transcriptions={paginatedResult.items}
          isLoading={isLoadingTranscriptions}
        />
        
        {/* Pagination */}
        {paginatedResult.totalPages > 1 && (
          <div className="mt-8">
            <Pagination
              currentPage={paginatedResult.currentPage}
              totalPages={paginatedResult.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </main>
    </div>
  );
}
