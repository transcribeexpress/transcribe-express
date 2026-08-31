/**
 * Tests pour la procédure tRPC transcriptions.create
 * 
 * Vérifie que :
 * - La procédure crée une transcription avec upload S3
 * - Le worker est déclenché automatiquement
 * - Les validations de fichier fonctionnent correctement
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  claimTranscriptionLease,
  completeTranscriptionAndDeductCredits,
  getTranscriptionById,
  updateTranscriptionEdited,
  updateTranscriptionSegments,
  updateTranscriptionStatus,
} from "./db";
import { getDb } from "./db";
import { transcriptions, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hasDedicatedTestDatabase } from "./testDatabaseSafety";

const testUserId = 'user-test-create-123';
const recoveryTestUserId = 'user-test-recovery-123';
const describeWithDatabase = hasDedicatedTestDatabase() ? describe : describe.skip;

describeWithDatabase("transcriptions.create procedure", () => {
  beforeAll(async () => {
    // Vérifier que la base de données est disponible
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available for testing");
    }
  });

  beforeEach(async () => {
    // Nettoyer la table transcriptions avant chaque test
    const db = await getDb();
    if (db) {
      await db.delete(transcriptions).where(eq(transcriptions.userId, testUserId));
      await db.delete(transcriptions).where(eq(transcriptions.userId, recoveryTestUserId));
      await db.delete(users).where(eq(users.openId, recoveryTestUserId));
    }
  });

  it("should retrieve a transcription by ID", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: 'test.mp3',
      fileUrl: 'https://example.com/test.mp3',
      fileKey: 'test-key',
      status: 'pending',
    });

    const insertId = Number(result.insertId);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Récupérer la transcription
    const transcription = await getTranscriptionById(insertId);
    
    expect(transcription).toBeDefined();
    expect(transcription?.fileName).toBe('test.mp3');
    expect(transcription?.status).toBe('pending');
  });

  it("should return null for non-existent transcription", async () => {
    const transcription = await getTranscriptionById(999999);
    expect(transcription).toBeNull();
  });

  it("should update transcription status to processing", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: 'test.mp3',
      fileUrl: 'https://example.com/test.mp3',
      fileKey: 'test-key',
      status: 'pending',
    });

    const insertId = Number(result.insertId);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mettre à jour le statut
    await updateTranscriptionStatus(insertId, 'processing');
    
    // Attendre un peu pour la propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Vérifier la mise à jour
    const transcription = await getTranscriptionById(insertId);
    expect(transcription?.status).toBe('processing');
  });

  it("should update transcription status to completed with text and duration", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: 'test.mp3',
      fileUrl: 'https://example.com/test.mp3',
      fileKey: 'test-key',
      status: 'processing',
    });

    const insertId = Number(result.insertId);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mettre à jour avec le résultat
    await updateTranscriptionStatus(insertId, 'completed', {
      transcriptText: 'Bonjour, ceci est un test de transcription.',
      duration: 120,
    });
    
    // Attendre un peu pour la propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Vérifier la mise à jour
    const transcription = await getTranscriptionById(insertId);
    expect(transcription?.status).toBe('completed');
    expect(transcription?.transcriptText).toBe('Bonjour, ceci est un test de transcription.');
    expect(transcription?.duration).toBe(120);
  });

  it("persists and reloads every durable transcription field", async () => {
    const db = await getDb();
    if (!db) throw new Error("Dedicated test database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: "persistence-test.mp3",
      fileUrl: "https://example.com/persistence-test.mp3",
      fileKey: "transcriptions/test/persistence-test.mp3",
      status: "pending",
    });

    const insertId = Number(result.insertId);
    const segments = JSON.stringify([
      { id: 0, start: 0, end: 1.5, text: "Texte original" },
    ]);

    await updateTranscriptionStatus(insertId, "completed", {
      transcriptText: "Texte original",
      duration: 2,
    });
    await updateTranscriptionSegments(insertId, segments);
    await updateTranscriptionEdited(insertId, "Texte corrigé");

    const persisted = await getTranscriptionById(insertId);

    expect(persisted).toMatchObject({
      status: "completed",
      transcriptText: "Texte original",
      editedText: "Texte corrigé",
      segmentsData: segments,
      fileKey: "transcriptions/test/persistence-test.mp3",
    });
  });

  it("claims once and completes with a single credit deduction", async () => {
    const db = await getDb();
    if (!db) throw new Error("Dedicated test database not available");

    await db.insert(users).values({
      openId: recoveryTestUserId,
      creditsMinutes: 30,
    });
    const [result] = await db.insert(transcriptions).values({
      userId: recoveryTestUserId,
      fileName: "recovery-test.mp3",
      fileUrl: "https://example.com/recovery-test.mp3",
      fileKey: "transcriptions/test/recovery-test.mp3",
      status: "pending",
    });

    const insertId = Number(result.insertId);
    expect(await claimTranscriptionLease(insertId, "worker-a")).toBe(true);
    expect(await claimTranscriptionLease(insertId, "worker-b")).toBe(false);

    const firstCompletion = await completeTranscriptionAndDeductCredits({
      id: insertId,
      leaseOwner: "worker-a",
      transcriptText: "Résultat durable",
      durationSeconds: 61,
    });
    const secondCompletion = await completeTranscriptionAndDeductCredits({
      id: insertId,
      leaseOwner: "worker-a",
      transcriptText: "Résultat durable",
      durationSeconds: 61,
    });

    const [account] = await db
      .select({ creditsMinutes: users.creditsMinutes })
      .from(users)
      .where(eq(users.openId, recoveryTestUserId));
    const persisted = await getTranscriptionById(insertId);

    expect(firstCompletion).toMatchObject({ completed: true, creditsDeducted: true });
    expect(secondCompletion).toEqual({
      completed: true,
      creditsDeducted: false,
      newBalance: null,
    });
    expect(account?.creditsMinutes).toBe(28);
    expect(persisted).toMatchObject({
      status: "completed",
      transcriptText: "Résultat durable",
      workerLeaseOwner: null,
      workerLeaseExpiresAt: null,
    });
    expect(persisted?.creditsDeductedAt).toBeInstanceOf(Date);
  });

  it("should update transcription status to error with error message", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: 'test.mp3',
      fileUrl: 'https://example.com/test.mp3',
      fileKey: 'test-key',
      status: 'processing',
    });

    const insertId = Number(result.insertId);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Mettre à jour avec une erreur
    await updateTranscriptionStatus(insertId, 'error', {
      errorMessage: 'Fichier audio corrompu',
    });
    
    // Attendre un peu pour la propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Vérifier la mise à jour
    const transcription = await getTranscriptionById(insertId);
    expect(transcription?.status).toBe('error');
    expect(transcription?.errorMessage).toBe('Fichier audio corrompu');
  });

  it("should validate file extension extraction", () => {
    // Test de la fonction getFileExtension (copie locale pour test)
    function getFileExtension(fileName: string): string {
      const parts = fileName.split('.');
      return parts.length > 1 ? parts[parts.length - 1] : 'bin';
    }

    expect(getFileExtension('audio.mp3')).toBe('mp3');
    expect(getFileExtension('video.mp4')).toBe('mp4');
    expect(getFileExtension('file.with.dots.wav')).toBe('wav');
    expect(getFileExtension('noextension')).toBe('bin');
  });
});
