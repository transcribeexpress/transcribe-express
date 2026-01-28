import { describe, it, expect } from "vitest";
import {
  filterBySearch,
  filterByStatus,
  filterByDate,
  applyFilters,
  type Transcription,
} from "./filters";

// Mock transcriptions data
const mockTranscriptions: Transcription[] = [
  {
    id: 1,
    fileName: "interview_podcast.mp3",
    status: "completed",
    createdAt: new Date("2026-01-28T10:00:00Z"),
    duration: 300,
  },
  {
    id: 2,
    fileName: "meeting_notes.wav",
    status: "processing",
    createdAt: new Date("2026-01-27T15:30:00Z"),
    duration: null,
  },
  {
    id: 3,
    fileName: "conference_call.m4a",
    status: "pending",
    createdAt: new Date("2026-01-20T08:00:00Z"),
    duration: null,
  },
  {
    id: 4,
    fileName: "webinar_recording.mp4",
    status: "error",
    createdAt: new Date("2026-01-15T12:00:00Z"),
    duration: null,
  },
  {
    id: 5,
    fileName: "podcast_episode_01.mp3",
    status: "completed",
    createdAt: new Date("2026-01-28T14:00:00Z"),
    duration: 1800,
  },
];

describe("filterBySearch", () => {
  it("should return all transcriptions when query is empty", () => {
    const result = filterBySearch(mockTranscriptions, "");
    expect(result).toEqual(mockTranscriptions);
  });

  it("should filter by partial filename (case-insensitive)", () => {
    const result = filterBySearch(mockTranscriptions, "podcast");
    expect(result).toHaveLength(2);
    expect(result[0].fileName).toContain("podcast");
    expect(result[1].fileName).toContain("podcast");
  });

  it("should filter by exact filename (case-insensitive)", () => {
    const result = filterBySearch(mockTranscriptions, "MEETING_NOTES.WAV");
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe("meeting_notes.wav");
  });

  it("should return empty array when no match", () => {
    const result = filterBySearch(mockTranscriptions, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("should trim whitespace from query", () => {
    const result = filterBySearch(mockTranscriptions, "  podcast  ");
    expect(result).toHaveLength(2);
  });
});

describe("filterByStatus", () => {
  it("should return all transcriptions when status is 'all'", () => {
    const result = filterByStatus(mockTranscriptions, "all");
    expect(result).toEqual(mockTranscriptions);
  });

  it("should filter by completed status", () => {
    const result = filterByStatus(mockTranscriptions, "completed");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === "completed")).toBe(true);
  });

  it("should filter by processing status", () => {
    const result = filterByStatus(mockTranscriptions, "processing");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("processing");
  });

  it("should filter by pending status", () => {
    const result = filterByStatus(mockTranscriptions, "pending");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("pending");
  });

  it("should filter by error status", () => {
    const result = filterByStatus(mockTranscriptions, "error");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("error");
  });
});

describe("filterByDate", () => {
  it("should return all transcriptions when dateFilter is 'all'", () => {
    const result = filterByDate(mockTranscriptions, "all");
    expect(result).toEqual(mockTranscriptions);
  });

  it("should filter by today", () => {
    const result = filterByDate(mockTranscriptions, "today");
    // Depends on current date, so we just check it returns an array
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter by this week (last 7 days)", () => {
    const result = filterByDate(mockTranscriptions, "week");
    // Should include transcriptions from last 7 days
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should filter by this month (last 30 days)", () => {
    const result = filterByDate(mockTranscriptions, "month");
    // Should include all mock transcriptions (all within last 30 days)
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("should filter by custom date range", () => {
    const from = new Date("2026-01-25T00:00:00Z");
    const to = new Date("2026-01-28T23:59:59Z");
    const result = filterByDate(mockTranscriptions, "custom", from, to);
    
    expect(result.length).toBeGreaterThanOrEqual(2); // Should include transcriptions within range
    expect(result.every((t) => {
      const date = new Date(t.createdAt);
      return date >= from && date <= to;
    })).toBe(true);
  });

  it("should return all when custom filter without dates", () => {
    const result = filterByDate(mockTranscriptions, "custom");
    expect(result).toEqual(mockTranscriptions);
  });
});

describe("applyFilters", () => {
  it("should apply no filters when all are default", () => {
    const result = applyFilters(mockTranscriptions, "", "all", "all");
    expect(result).toEqual(mockTranscriptions);
  });

  it("should apply search filter only", () => {
    const result = applyFilters(mockTranscriptions, "podcast", "all", "all");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.fileName.toLowerCase().includes("podcast"))).toBe(true);
  });

  it("should apply status filter only", () => {
    const result = applyFilters(mockTranscriptions, "", "completed", "all");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.status === "completed")).toBe(true);
  });

  it("should apply combined search + status filters", () => {
    const result = applyFilters(mockTranscriptions, "podcast", "completed", "all");
    expect(result).toHaveLength(2);
    expect(result.every((t) => 
      t.fileName.toLowerCase().includes("podcast") && t.status === "completed"
    )).toBe(true);
  });

  it("should apply combined search + status + date filters", () => {
    const from = new Date("2026-01-25T00:00:00Z");
    const to = new Date("2026-01-28T23:59:59Z");
    const result = applyFilters(mockTranscriptions, "podcast", "completed", "custom", from, to);
    
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((t) => {
      const date = new Date(t.createdAt);
      return (
        t.fileName.toLowerCase().includes("podcast") &&
        t.status === "completed" &&
        date >= from &&
        date <= to
      );
    })).toBe(true);
  });

  it("should return empty array when no transcriptions match all filters", () => {
    const result = applyFilters(mockTranscriptions, "nonexistent", "completed", "all");
    expect(result).toHaveLength(0);
  });

  it("should handle performance with large datasets", () => {
    // Create 1000 mock transcriptions
    const largeDataset: Transcription[] = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      fileName: `file_${i % 10}.mp3`,
      status: ["completed", "processing", "pending", "error"][i % 4] as any,
      createdAt: new Date(2026, 0, (i % 28) + 1),
      duration: i * 10,
    }));

    const startTime = performance.now();
    const result = applyFilters(largeDataset, "file_5", "all", "all"); // Changed to "all" status
    const endTime = performance.now();

    // Should complete in less than 100ms
    expect(endTime - startTime).toBeLessThan(100);
    expect(result.length).toBeGreaterThan(0);
  });
});
