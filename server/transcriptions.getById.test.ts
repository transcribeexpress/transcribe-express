/**
 * Tests pour la procédure transcriptions.getById
 * 
 * Vérifie :
 * - Récupération d'une transcription par son propriétaire
 * - Accès refusé pour un non-propriétaire
 * - Transcription inexistante
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { transcriptions } from "../drizzle/schema";

describe("transcriptions.getById", () => {
  let testTranscriptionId: number;
  const testUserId = "test-user-123";
  const otherUserId = "other-user-456";

  beforeAll(async () => {
    // Créer une transcription de test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: "test-audio.mp3",
      fileKey: "test-key",
      fileUrl: "https://example.com/test.mp3",
      status: "completed",
      transcriptText: "Ceci est un test de transcription.",
      duration: 120,
    });

    testTranscriptionId = Number(result.insertId);
  });

  it("should return transcription for owner", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: "test@example.com", name: "Test User" },
    });

    const transcription = await caller.transcriptions.getById({
      id: testTranscriptionId,
    });

    expect(transcription).toBeDefined();
    expect(transcription.id).toBe(testTranscriptionId);
    expect(transcription.userId).toBe(testUserId);
    expect(transcription.fileName).toBe("test-audio.mp3");
    expect(transcription.transcriptText).toBe("Ceci est un test de transcription.");
  });

  it("should throw error for non-owner", async () => {
    const caller = appRouter.createCaller({
      user: { id: otherUserId, email: "other@example.com", name: "Other User" },
    });

    await expect(
      caller.transcriptions.getById({ id: testTranscriptionId })
    ).rejects.toThrow("Access denied");
  });

  it("should throw error for invalid ID", async () => {
    const caller = appRouter.createCaller({
      user: { id: testUserId, email: "test@example.com", name: "Test User" },
    });

    await expect(
      caller.transcriptions.getById({ id: 99999 })
    ).rejects.toThrow("Transcription not found");
  });
});
