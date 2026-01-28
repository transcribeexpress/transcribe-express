/**
 * Page Dashboard - Tableau de bord principal
 * 
 * Page protégée accessible uniquement aux utilisateurs connectés.
 * Affiche le header avec logo et UserMenu.
 * 
 * Note : Le contenu complet du dashboard (TranscriptionList, etc.)
 * sera implémenté au Jour 12.
 */

import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
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

export default function Dashboard() {
  const { user, isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  // Fetch transcriptions
  const { data: transcriptions = [], isLoading: isLoadingTranscriptions } = trpc.transcriptions.list.useQuery(
    undefined,
    {
      enabled: isSignedIn,
      refetchInterval: 5000,
      refetchIntervalInBackground: true,
    }
  );

  // Apply filters with useMemo for performance
  const filteredTranscriptions = useMemo(() => {
    return applyFilters(
      transcriptions,
      searchQuery,
      statusFilter,
      dateFilter
    );
  }, [transcriptions, searchQuery, statusFilter, dateFilter]);

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
                {filteredTranscriptions.length} résultat{filteredTranscriptions.length !== 1 ? "s" : ""}
              </Badge>
              {filteredTranscriptions.length === 0 && transcriptions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Aucune transcription ne correspond aux filtres
                </span>
              )}
            </div>
          )}
        </div>

        {/* Liste des transcriptions avec polling automatique */}
        <TranscriptionList 
          transcriptions={filteredTranscriptions}
          isLoading={isLoadingTranscriptions}
        />
      </main>
    </div>
  );
}
