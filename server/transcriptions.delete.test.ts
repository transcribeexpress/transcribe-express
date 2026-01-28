/**
 * Tests pour la procédure transcriptions.delete
 * 
 * Vérifie :
 * - Suppression d'une transcription par son propriétaire
 * - Accès refusé pour un non-propriétaire
 * - Transcription inexistante
 */

import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { transcriptions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("transcriptions.delete", () => {
  let testTranscriptionId: number;
  const testUserId = "test-user-delete-123";
  const otherUserId = "other-user-delete-456";

  beforeEach(async () => {
    // Créer une transcription de test avant chaque test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: "test-audio-delete.mp3",
      fileKey: "test-key-delete",
      fileUrl: "https://example.com/test-delete.mp3",
      status: "completed",
      transcriptText: "Ceci est un test de suppression.",
      duration: 60,
    });

    testTranscriptionId = Number(result.insertId);
  });

  it("should delete transcription for owner", async () => {
    const caller = appRouter.createCaller({
      user: { openId: testUserId, email: "test@example.com", name: "Test User" },
    });

    // Attendre la propagation de la création
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = await caller.transcriptions.delete({
      id: testTranscriptionId,
    });

    expect(result.success).toBe(true);

    // Vérifier que la transcription a bien été supprimée
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const deleted = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.id, testTranscriptionId));

    expect(deleted.length).toBe(0);
  });

  it("should throw error for non-owner", async () => {
    // Attendre la propagation de la création
    await new Promise(resolve => setTimeout(resolve, 300));

    const caller = appRouter.createCaller({
      user: { openId: otherUserId, email: "other@example.com", name: "Other User" },
    });

    await expect(
      caller.transcriptions.delete({ id: testTranscriptionId })
    ).rejects.toThrow("Access denied");

    // Vérifier que la transcription n'a pas été supprimée
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stillExists = await db
      .select()
      .from(transcriptions)
      .where(eq(transcriptions.id, testTranscriptionId));

    expect(stillExists.length).toBe(1);
  });

  it("should throw error for invalid ID", async () => {
    const caller = appRouter.createCaller({
      user: { openId: testUserId, email: "test@example.com", name: "Test User" },
    });

    await expect(
      caller.transcriptions.delete({ id: 99999 })
    ).rejects.toThrow("Transcription not found");
  });
});
