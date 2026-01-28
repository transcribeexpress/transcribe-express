import { Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export type StatusFilter = "all" | "completed" | "processing" | "pending" | "error";
export type DateFilter = "all" | "today" | "week" | "month" | "custom";

interface FilterPanelProps {
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (filter: DateFilter) => void;
  customDateFrom?: Date;
  customDateTo?: Date;
  onCustomDateChange?: (from: Date | undefined, to: Date | undefined) => void;
}

export function FilterPanel({
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      {/* Status Filter */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="status-filter" className="text-sm font-medium">
          <Filter className="inline h-4 w-4 mr-1" />
          Statut
        </Label>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger id="status-filter" className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="completed">Completé</SelectItem>
            <SelectItem value="processing">En cours</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Filter */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="date-filter" className="text-sm font-medium">
          <Calendar className="inline h-4 w-4 mr-1" />
          Période
        </Label>
        <Select value={dateFilter} onValueChange={onDateFilterChange}>
          <SelectTrigger id="date-filter" className="w-[180px] bg-card border-border">
            <SelectValue placeholder="Toutes les dates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="custom">Personnalisé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Button */}
      {(statusFilter !== "all" || dateFilter !== "all") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onStatusFilterChange("all");
            onDateFilterChange("all");
          }}
          className="md:mb-0.5"
        >
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
