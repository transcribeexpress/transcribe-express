import type { StatusFilter, DateFilter } from "@/components/FilterPanel";

export interface Transcription {
  id: number;
  fileName: string;
  status: "pending" | "processing" | "completed" | "error";
  createdAt: Date;
  duration: number | null;
}

/**
 * Filter transcriptions by search query (case-insensitive)
 */
export function filterBySearch(
  transcriptions: Transcription[],
  query: string
): Transcription[] {
  if (!query.trim()) return transcriptions;

  const lowerQuery = query.toLowerCase().trim();
  return transcriptions.filter((t) =>
    t.fileName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter transcriptions by status
 */
export function filterByStatus(
  transcriptions: Transcription[],
  status: StatusFilter
): Transcription[] {
  if (status === "all") return transcriptions;
  return transcriptions.filter((t) => t.status === status);
}

/**
 * Filter transcriptions by date range
 */
export function filterByDate(
  transcriptions: Transcription[],
  dateFilter: DateFilter,
  customFrom?: Date,
  customTo?: Date
): Transcription[] {
  if (dateFilter === "all") return transcriptions;

  const now = new Date();
  let startDate: Date;

  switch (dateFilter) {
    case "today":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "custom":
      if (!customFrom) return transcriptions;
      startDate = customFrom;
      break;
    default:
      return transcriptions;
  }

  return transcriptions.filter((t) => {
    const createdAt = new Date(t.createdAt);
    if (dateFilter === "custom" && customTo) {
      return createdAt >= startDate && createdAt <= customTo;
    }
    return createdAt >= startDate;
  });
}

/**
 * Apply all filters (search + status + date)
 */
export function applyFilters(
  transcriptions: Transcription[],
  searchQuery: string,
  statusFilter: StatusFilter,
  dateFilter: DateFilter,
  customDateFrom?: Date,
  customDateTo?: Date
): Transcription[] {
  let filtered = transcriptions;

  // Apply search filter
  filtered = filterBySearch(filtered, searchQuery);

  // Apply status filter
  filtered = filterByStatus(filtered, statusFilter);

  // Apply date filter
  filtered = filterByDate(filtered, dateFilter, customDateFrom, customDateTo);

  return filtered;
}
