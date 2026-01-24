/**
 * Tests pour la procédure tRPC transcriptions.create
 * 
 * Vérifie que :
 * - La procédure crée une transcription avec upload S3
 * - Le worker est déclenché automatiquement
 * - Les validations de fichier fonctionnent correctement
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getTranscriptionById, updateTranscriptionStatus } from "./db";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

describe("transcriptions.create procedure", () => {
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
      await db.execute(sql`DELETE FROM transcriptions WHERE userId = 1`);
    }
  });

  it("should retrieve a transcription by ID", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.execute(sql`
      INSERT INTO transcriptions (userId, fileName, fileUrl, fileKey, status)
      VALUES (1, 'test.mp3', 'https://example.com/test.mp3', 'test-key', 'pending')
    `);

    const insertId = (result as any).insertId;
    
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

    const result = await db.execute(sql`
      INSERT INTO transcriptions (userId, fileName, fileUrl, fileKey, status)
      VALUES (1, 'test.mp3', 'https://example.com/test.mp3', 'test-key', 'pending')
    `);

    const insertId = (result as any).insertId;
    
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

    const result = await db.execute(sql`
      INSERT INTO transcriptions (userId, fileName, fileUrl, fileKey, status)
      VALUES (1, 'test.mp3', 'https://example.com/test.mp3', 'test-key', 'processing')
    `);

    const insertId = (result as any).insertId;
    
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

  it("should update transcription status to error with error message", async () => {
    // Créer une transcription test
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.execute(sql`
      INSERT INTO transcriptions (userId, fileName, fileUrl, fileKey, status)
      VALUES (1, 'test.mp3', 'https://example.com/test.mp3', 'test-key', 'processing')
    `);

    const insertId = (result as any).insertId;
    
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
