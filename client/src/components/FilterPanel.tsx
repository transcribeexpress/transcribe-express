import { useState } from "react";
import { Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

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
  customDateFrom,
  customDateTo,
  onCustomDateChange,
}: FilterPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: customDateFrom,
    to: customDateTo,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to && onCustomDateChange) {
      onCustomDateChange(range.from, range.to);
      setIsCalendarOpen(false);
    }
  };

  const handleDateFilterChange = (value: DateFilter) => {
    onDateFilterChange(value);
    if (value === "custom") {
      setIsCalendarOpen(true);
    } else {
      // Reset custom dates when switching to predefined filters
      setDateRange(undefined);
      if (onCustomDateChange) {
        onCustomDateChange(undefined, undefined);
      }
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) return "Sélectionner une période";
    if (!dateRange.to) return format(dateRange.from, "dd MMM yyyy", { locale: fr });
    return `${format(dateRange.from, "dd MMM", { locale: fr })} - ${format(dateRange.to, "dd MMM yyyy", { locale: fr })}`;
  };

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
          <CalendarIcon className="inline h-4 w-4 mr-1" />
          Période
        </Label>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={handleDateFilterChange}>
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

          {/* Custom Date Range Picker */}
          {dateFilter === "custom" && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[280px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 max-h-[80vh] overflow-y-auto" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={window.innerWidth < 768 ? 1 : 2}
                  locale={fr}
                  disabled={(date) => date > new Date()}
                />
                <div className="p-3 border-t border-border flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateRange(undefined);
                      if (onCustomDateChange) {
                        onCustomDateChange(undefined, undefined);
                      }
                    }}
                  >
                    Effacer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setIsCalendarOpen(false)}
                    disabled={!dateRange?.from || !dateRange?.to}
                  >
                    Appliquer
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

      {/* Reset Button */}
      {(statusFilter !== "all" || dateFilter !== "all") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onStatusFilterChange("all");
            onDateFilterChange("all");
            setDateRange(undefined);
            if (onCustomDateChange) {
              onCustomDateChange(undefined, undefined);
            }
          }}
          className="md:mb-0.5"
        >
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
