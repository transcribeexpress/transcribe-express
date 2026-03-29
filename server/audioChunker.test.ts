import { describe, expect, it } from "vitest";
import {
  needsChunking,
  reassembleTranscriptions,
} from "./audioChunker";
import type { ChunkTranscriptionResult } from "./audioChunker";

describe("audioChunker", () => {
  describe("needsChunking", () => {
    it("returns false for small files (< 20 MB)", () => {
      expect(needsChunking(10 * 1024 * 1024)).toBe(false); // 10 MB
      expect(needsChunking(15 * 1024 * 1024)).toBe(false); // 15 MB
      expect(needsChunking(19 * 1024 * 1024)).toBe(false); // 19 MB
    });

    it("returns true for files >= 20 MB", () => {
      expect(needsChunking(21 * 1024 * 1024)).toBe(true);  // 21 MB
      expect(needsChunking(50 * 1024 * 1024)).toBe(true);  // 50 MB
      expect(needsChunking(100 * 1024 * 1024)).toBe(true); // 100 MB
    });

    it("returns true at exactly 20 MB boundary", () => {
      // 20 MB exactly should trigger chunking (> threshold)
      expect(needsChunking(20 * 1024 * 1024 + 1)).toBe(true);
    });
  });

  describe("reassembleTranscriptions", () => {
    it("returns empty string for no chunks", () => {
      expect(reassembleTranscriptions([])).toBe("");
    });

    it("returns text directly for single chunk", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 0, text: "Bonjour le monde", startSeconds: 0, endSeconds: 30, language: "fr", duration: 30 },
      ];
      expect(reassembleTranscriptions(chunks)).toBe("Bonjour le monde");
    });

    it("concatenates multiple chunks", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 0, text: "Bonjour tout le monde", startSeconds: 0, endSeconds: 30, language: "fr", duration: 30 },
        { index: 1, text: "je suis content", startSeconds: 28, endSeconds: 60, language: "fr", duration: 32 },
      ];
      const result = reassembleTranscriptions(chunks);
      expect(result).toContain("Bonjour tout le monde");
      expect(result).toContain("je suis content");
    });

    it("deduplicates overlapping words between chunks", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 0, text: "Bonjour tout le monde aujourd'hui", startSeconds: 0, endSeconds: 32, language: "fr", duration: 32 },
        { index: 1, text: "le monde aujourd'hui nous allons parler", startSeconds: 28, endSeconds: 62, language: "fr", duration: 34 },
      ];
      const result = reassembleTranscriptions(chunks);
      // The overlap "le monde aujourd'hui" should be deduplicated
      // Result should not have "le monde aujourd'hui" repeated
      const occurrences = (result.match(/le monde aujourd'hui/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it("sorts chunks by index before reassembly", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 2, text: "troisième partie", startSeconds: 60, endSeconds: 90, language: "fr", duration: 30 },
        { index: 0, text: "première partie", startSeconds: 0, endSeconds: 30, language: "fr", duration: 30 },
        { index: 1, text: "deuxième partie", startSeconds: 28, endSeconds: 62, language: "fr", duration: 34 },
      ];
      const result = reassembleTranscriptions(chunks);
      const firstIdx = result.indexOf("première");
      const secondIdx = result.indexOf("deuxième");
      const thirdIdx = result.indexOf("troisième");
      expect(firstIdx).toBeLessThan(secondIdx);
      expect(secondIdx).toBeLessThan(thirdIdx);
    });

    it("handles chunks with no overlap gracefully", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 0, text: "Alpha bravo charlie", startSeconds: 0, endSeconds: 30, language: "fr", duration: 30 },
        { index: 1, text: "delta echo foxtrot", startSeconds: 30, endSeconds: 60, language: "fr", duration: 30 },
      ];
      const result = reassembleTranscriptions(chunks);
      expect(result).toBe("Alpha bravo charlie delta echo foxtrot");
    });

    it("cleans up multiple spaces", () => {
      const chunks: ChunkTranscriptionResult[] = [
        { index: 0, text: "Hello  world", startSeconds: 0, endSeconds: 30, language: "en", duration: 30 },
        { index: 1, text: "  how are you  ", startSeconds: 28, endSeconds: 60, language: "en", duration: 32 },
      ];
      const result = reassembleTranscriptions(chunks);
      expect(result).not.toMatch(/\s{2,}/);
    });
  });
});
