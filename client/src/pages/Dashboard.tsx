/**
 * Page Dashboard - Tableau de bord principal
 * 
 * Page protégée accessible uniquement aux utilisateurs connectés.
 * Utilise useClerkSync pour synchroniser la session Clerk → Manus OAuth
 * avant de lancer les requêtes tRPC protégées.
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useClerkSync } from "@/hooks/useClerkSync";
import { UserMenu } from "@/components/UserMenu";
import { TranscriptionList } from "@/components/TranscriptionList";
import { SearchBar } from "@/components/SearchBar";
import { FilterPanel, type StatusFilter, type DateFilter } from "@/components/FilterPanel";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { applyFilters } from "@/utils/filters";
import { Pagination } from "@/components/Pagination";

import { SortControls, sortTranscriptions, type SortState, type SortField } from "@/components/SortControls";
import { paginateItems } from "@/utils/pagination";
import { motion } from "framer-motion";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";
const WORDMARK_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

export default function Dashboard() {
  const { user, isSignedIn, isLoading } = useAuth();
  const { isSessionReady, isSyncing, error: syncError } = useClerkSync();
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
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  
  // Handler for custom date range
  const handleCustomDateChange = useCallback((from: Date | undefined, to: Date | undefined) => {
    setCustomDateFrom(from);
    setCustomDateTo(to);
  }, []);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(initialPage);
  const itemsPerPage = 20;
  
  // Sort state
  const [sortState, setSortState] = useState<SortState>({
    field: initialSortField,
    order: initialSortOrder,
  });

  // Fetch transcriptions - SEULEMENT quand la session Manus est prête
  const { data: transcriptions = [], isLoading: isLoadingTranscriptions } = trpc.transcriptions.list.useQuery(
    undefined,
    {
      enabled: isSignedIn && isSessionReady, // Attendre que la session soit synchronisée
      refetchInterval: isSessionReady ? 5000 : false, // Polling seulement si session prête
      refetchIntervalInBackground: true,
    }
  );

  // Apply filters and sort with useMemo for performance
  const filteredAndSortedTranscriptions = useMemo(() => {
    const filtered = applyFilters(
      transcriptions,
      searchQuery,
      statusFilter,
      dateFilter,
      customDateFrom,
      customDateTo
    );
    return sortTranscriptions(filtered, sortState);
  }, [transcriptions, searchQuery, statusFilter, dateFilter, customDateFrom, customDateTo, sortState]);
  
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
  }, [searchQuery, statusFilter, dateFilter, customDateFrom, customDateTo]);
  
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

  // État de chargement : Clerk charge OU session en cours de sync
  if (isLoading || isSyncing) {
    return <DashboardSkeleton />;
  }

  // Utilisateur non connecté : afficher un message au lieu de rediriger
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
<img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" style={{ mixBlendMode: 'screen' }} />
           <h2 className="text-xl font-semibold">Connexion requise</h2>
          <p className="text-muted-foreground">Veuillez vous connecter pour accéder au dashboard.</p>
          <Button onClick={() => setLocation("/login")}>
            Se connecter
          </Button>
        </div>
      </div>
    );
  }

  // Erreur de synchronisation
  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
<img src={LOGO_URL} alt="Transcribe Express" className="w-12 h-12 mx-auto" style={{ mixBlendMode: 'screen' }} />
           <h2 className="text-xl font-semibold">Erreur de connexion</h2>
          <p className="text-muted-foreground">Impossible de synchroniser votre session. Veuillez réessayer.</p>
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Transcribe Express Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" style={{ mixBlendMode: 'screen' }} />
            <img src={WORDMARK_URL} alt="Transcribe Express" className="h-8 sm:h-10 md:h-12 w-auto max-w-[120px] sm:max-w-[160px] md:max-w-[200px] object-contain" />
          </div>

          {/* User Menu */}
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <motion.main 
        className="container py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Title */}
        <motion.div 
          className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
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
            className="gap-2 w-full md:w-auto"
            onClick={() => setLocation("/upload")}
          >
            <Plus className="w-5 h-5" />
            Nouvelle transcription
          </Button>
        </motion.div>

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
              customDateFrom={customDateFrom}
              customDateTo={customDateTo}
              onCustomDateChange={handleCustomDateChange}
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
        <div className="mb-4 px-4 py-3 bg-muted/30 rounded-lg">
          <span className="block text-sm text-muted-foreground mb-3 md:mb-0 md:inline md:mr-4">Trier par :</span>
          <div className="grid grid-cols-2 gap-2 md:inline-flex md:gap-4">
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
      </motion.main>
    </div>
  );
}
