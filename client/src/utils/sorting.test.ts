/**
 * Tests pour les utilitaires de tri
 */

import { describe, it, expect } from "vitest";
import { sortTranscriptions, type SortState } from "../components/SortControls";

describe("sortTranscriptions", () => {
  const mockTranscriptions = [
    {
      id: 1,
      fileName: "zebra.mp3",
      createdAt: new Date("2024-01-15"),
      duration: 120,
      status: "completed" as const,
    },
    {
      id: 2,
      fileName: "apple.mp3",
      createdAt: new Date("2024-01-20"),
      duration: 60,
      status: "processing" as const,
    },
    {
      id: 3,
      fileName: "banana.mp3",
      createdAt: new Date("2024-01-10"),
      duration: 180,
      status: "error" as const,
    },
  ];

  describe("Sort by createdAt", () => {
    it("should sort by createdAt descending (newest first)", () => {
      const sortState: SortState = { field: "createdAt", order: "desc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].id).toBe(2); // 2024-01-20
      expect(result[1].id).toBe(1); // 2024-01-15
      expect(result[2].id).toBe(3); // 2024-01-10
    });

    it("should sort by createdAt ascending (oldest first)", () => {
      const sortState: SortState = { field: "createdAt", order: "asc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].id).toBe(3); // 2024-01-10
      expect(result[1].id).toBe(1); // 2024-01-15
      expect(result[2].id).toBe(2); // 2024-01-20
    });
  });

  describe("Sort by fileName", () => {
    it("should sort by fileName ascending (A-Z)", () => {
      const sortState: SortState = { field: "fileName", order: "asc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].fileName).toBe("apple.mp3");
      expect(result[1].fileName).toBe("banana.mp3");
      expect(result[2].fileName).toBe("zebra.mp3");
    });

    it("should sort by fileName descending (Z-A)", () => {
      const sortState: SortState = { field: "fileName", order: "desc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].fileName).toBe("zebra.mp3");
      expect(result[1].fileName).toBe("banana.mp3");
      expect(result[2].fileName).toBe("apple.mp3");
    });

    it("should be case-insensitive", () => {
      const items = [
        { id: 1, fileName: "ZEBRA.mp3", createdAt: new Date(), duration: 0, status: "completed" as const },
        { id: 2, fileName: "apple.mp3", createdAt: new Date(), duration: 0, status: "completed" as const },
      ];
      const sortState: SortState = { field: "fileName", order: "asc" };
      const result = sortTranscriptions(items, sortState);

      expect(result[0].fileName).toBe("apple.mp3");
      expect(result[1].fileName).toBe("ZEBRA.mp3");
    });
  });

  describe("Sort by duration", () => {
    it("should sort by duration ascending (shortest first)", () => {
      const sortState: SortState = { field: "duration", order: "asc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].duration).toBe(60);
      expect(result[1].duration).toBe(120);
      expect(result[2].duration).toBe(180);
    });

    it("should sort by duration descending (longest first)", () => {
      const sortState: SortState = { field: "duration", order: "desc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].duration).toBe(180);
      expect(result[1].duration).toBe(120);
      expect(result[2].duration).toBe(60);
    });

    it("should handle null/undefined duration", () => {
      const items = [
        { id: 1, fileName: "a.mp3", createdAt: new Date(), duration: 100, status: "completed" as const },
        { id: 2, fileName: "b.mp3", createdAt: new Date(), duration: null as any, status: "pending" as const },
        { id: 3, fileName: "c.mp3", createdAt: new Date(), duration: undefined as any, status: "pending" as const },
      ];
      const sortState: SortState = { field: "duration", order: "asc" };
      const result = sortTranscriptions(items, sortState);

      // null/undefined should be treated as 0 and come first when ascending
      // L'ordre peut varier entre null et undefined car ils sont tous deux traités comme 0
      const firstTwo = [result[0].duration, result[1].duration];
      expect(firstTwo).toContain(null);
      expect(firstTwo).toContain(undefined);
      expect(result[2].duration).toBe(100);
    });
  });

  describe("Sort by status", () => {
    it("should sort by status ascending", () => {
      const sortState: SortState = { field: "status", order: "asc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].status).toBe("completed");
      expect(result[1].status).toBe("error");
      expect(result[2].status).toBe("processing");
    });

    it("should sort by status descending", () => {
      const sortState: SortState = { field: "status", order: "desc" };
      const result = sortTranscriptions(mockTranscriptions, sortState);

      expect(result[0].status).toBe("processing");
      expect(result[1].status).toBe("error");
      expect(result[2].status).toBe("completed");
    });
  });

  describe("Stability", () => {
    it("should maintain original order for equal values", () => {
      const items = [
        { id: 1, fileName: "a.mp3", createdAt: new Date("2024-01-15"), duration: 100, status: "completed" as const },
        { id: 2, fileName: "b.mp3", createdAt: new Date("2024-01-15"), duration: 100, status: "completed" as const },
        { id: 3, fileName: "c.mp3", createdAt: new Date("2024-01-15"), duration: 100, status: "completed" as const },
      ];
      const sortState: SortState = { field: "duration", order: "asc" };
      const result = sortTranscriptions(items, sortState);

      // Should maintain original order since all durations are equal
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[2].id).toBe(3);
    });
  });

  describe("Immutability", () => {
    it("should not mutate the original array", () => {
      const original = [...mockTranscriptions];
      const sortState: SortState = { field: "fileName", order: "asc" };
      sortTranscriptions(mockTranscriptions, sortState);

      expect(mockTranscriptions).toEqual(original);
    });
  });
});
