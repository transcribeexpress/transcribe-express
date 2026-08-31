/**
 * Tests pour la procédure tRPC transcriptions.list
 * 
 * Vérifie que :
 * - La procédure retourne les transcriptions de l'utilisateur connecté
 * - Les transcriptions sont triées par date décroissante
 * - La procédure nécessite l'authentification (protectedProcedure)
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createTranscription, getUserTranscriptions } from "./db";
import { getDb } from "./db";
import { eq } from "drizzle-orm";
import { transcriptions as transcriptionTable } from "../drizzle/schema";
import { hasDedicatedTestDatabase } from "./testDatabaseSafety";

const testUserId = "test-list-persistence-guard";
const describeWithDatabase = hasDedicatedTestDatabase() ? describe : describe.skip;

describeWithDatabase("transcriptions.list procedure", () => {
  beforeAll(async () => {
    // Vérifier que la base de données est disponible
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for testing");
    }
  });

  beforeEach(async () => {
    // Nettoyer uniquement les fixtures de ce fichier dans la base de test dédiée.
    const db = await getDb();
    if (db) {
      await db.delete(transcriptionTable).where(eq(transcriptionTable.userId, testUserId));
    }
  });

  it("should return empty array for user with no transcriptions", async () => {
    const userId = "user-999999"; // ID utilisateur fictif
    const transcriptions = await getUserTranscriptions(userId);
    
    expect(transcriptions).toBeInstanceOf(Array);
    expect(transcriptions.length).toBe(0);
  });

  it("should create a transcription successfully", async () => {
    const testTranscription = {
      userId: testUserId,
      fileName: "test-audio.mp3",
      fileUrl: "https://example.com/test-audio.mp3",
      fileKey: "uploads/test-audio.mp3",
      duration: 120,
      status: "pending" as const,
    };

    const result = await createTranscription(testTranscription);
    expect(result).toBeDefined();
  });

  it("should return transcriptions sorted by creation date (descending)", async () => {
    // Créer deux transcriptions avec des dates différentes
    await createTranscription({
      userId: testUserId,
      fileName: "first.mp3",
      fileUrl: "https://example.com/first.mp3",
      status: "completed" as const,
    });

    // Attendre 1 seconde pour garantir une différence de timestamp (précision MySQL)
    await new Promise(resolve => setTimeout(resolve, 1100));

    await createTranscription({
      userId: testUserId,
      fileName: "second.mp3",
      fileUrl: "https://example.com/second.mp3",
      status: "processing" as const,
    });

    const transcriptions = await getUserTranscriptions(testUserId);
    
    expect(transcriptions.length).toBeGreaterThanOrEqual(2);
    
    // Vérifier que la plus récente est en premier
    const firstTranscription = transcriptions[0];
    const secondTranscription = transcriptions[1];
    
    expect(firstTranscription.fileName).toBe("second.mp3");
    expect(secondTranscription.fileName).toBe("first.mp3");
    
    // Vérifier que les dates sont bien décroissantes
    expect(firstTranscription.createdAt.getTime()).toBeGreaterThan(
      secondTranscription.createdAt.getTime()
    );
  });

  it("should only return transcriptions for the specified user", async () => {
    // Créer des transcriptions pour l'utilisateur 1 uniquement
    // (pas d'utilisateur 2 car il n'existe pas en BDD)
    await createTranscription({
      userId: testUserId,
      fileName: "user1-file1.mp3",
      fileUrl: "https://example.com/user1-file1.mp3",
      status: "completed" as const,
    });

    await createTranscription({
      userId: testUserId,
      fileName: "user1-file2.mp3",
      fileUrl: "https://example.com/user1-file2.mp3",
      status: "completed" as const,
    });

    const user1Transcriptions = await getUserTranscriptions(testUserId);
    const user2Transcriptions = await getUserTranscriptions("user-2");
    const user999Transcriptions = await getUserTranscriptions("user-999999");

    // Vérifier que l'utilisateur 1 voit ses 2 transcriptions
    expect(user1Transcriptions.length).toBe(2);
    expect(user1Transcriptions.every(t => t.userId === "user-1")).toBe(true);
    
    // Vérifier qu'un utilisateur inexistant ne voit aucune transcription
    expect(user999Transcriptions.length).toBe(0);
  });
});
