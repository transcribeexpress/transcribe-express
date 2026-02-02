import { describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { transcriptions, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const testUserId = "test-user-stats-123";

describe("transcriptions.stats", () => {
  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Nettoyer les données de test
    await db.delete(transcriptions).where(eq(transcriptions.userId, testUserId));

    // Créer un utilisateur de test
    await db.insert(users).values({
      openId: testUserId,
      name: "Test User Stats",
      email: "stats@test.com",
      loginMethod: "google",
      role: "user",
    }).onDuplicateKeyUpdate({
      set: { name: "Test User Stats" },
    });
  });

  it("Should return correct stats for empty transcriptions", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: testUserId,
        name: "Test User Stats",
        email: "stats@test.com",
        loginMethod: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });

    const stats = await caller.transcriptions.stats();

    expect(stats.total).toBe(0);
    expect(stats.totalDuration).toBe(0);
    expect(stats.avgDuration).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.transcriptionsByDay).toHaveLength(7);
    expect(stats.transcriptionsByStatus).toHaveLength(0);
  });

  it("Should calculate correct KPIs with transcriptions", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Créer des transcriptions de test
    await db.insert(transcriptions).values([
      {
        userId: testUserId,
        fileName: "test1.mp3",
        fileKey: "test1.mp3",
        fileUrl: "https://example.com/test1.mp3",
        status: "completed",
        duration: 120, // 2 minutes
        text: "Test transcription 1",
      },
      {
        userId: testUserId,
        fileName: "test2.mp3",
        fileKey: "test2.mp3",
        fileUrl: "https://example.com/test2.mp3",
        status: "completed",
        duration: 180, // 3 minutes
        text: "Test transcription 2",
      },
      {
        userId: testUserId,
        fileName: "test3.mp3",
        fileKey: "test3.mp3",
        fileUrl: "https://example.com/test3.mp3",
        status: "error",
        errorMessage: "Test error",
      },
    ]);

    // Attendre un peu pour que les données soient propagées
    await new Promise((resolve) => setTimeout(resolve, 300));

    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: testUserId,
        name: "Test User Stats",
        email: "stats@test.com",
        loginMethod: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });

    const stats = await caller.transcriptions.stats();

    expect(stats.total).toBe(3);
    expect(stats.totalDuration).toBe(300); // 120 + 180
    expect(stats.avgDuration).toBe(100); // 300 / 3
    expect(stats.successRate).toBeCloseTo(66.67, 1); // 2/3 * 100
    expect(stats.transcriptionsByDay).toHaveLength(7);
    expect(stats.transcriptionsByStatus.length).toBeGreaterThan(0);
  });

  it("Should return transcriptions by day for last 7 days", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Créer une transcription aujourd'hui
    await db.insert(transcriptions).values({
      userId: testUserId,
      fileName: "today.mp3",
      fileKey: "today.mp3",
      fileUrl: "https://example.com/today.mp3",
      status: "completed",
      duration: 60,
      text: "Today transcription",
    });

    await new Promise((resolve) => setTimeout(resolve, 300));

    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: testUserId,
        name: "Test User Stats",
        email: "stats@test.com",
        loginMethod: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });

    const stats = await caller.transcriptions.stats();

    expect(stats.transcriptionsByDay).toHaveLength(7);
    
    // Vérifier que chaque jour a une date et un count
    stats.transcriptionsByDay.forEach((day) => {
      expect(day).toHaveProperty("date");
      expect(day).toHaveProperty("count");
      expect(typeof day.date).toBe("string");
      expect(typeof day.count).toBe("number");
    });

    // Vérifier que le dernier jour (aujourd'hui) a au moins 1 transcription
    const today = stats.transcriptionsByDay[stats.transcriptionsByDay.length - 1];
    expect(today.count).toBeGreaterThanOrEqual(1);
  });

  it("Should return transcriptions by status", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Créer des transcriptions avec différents statuts
    await db.insert(transcriptions).values([
      {
        userId: testUserId,
        fileName: "completed1.mp3",
        fileKey: "completed1.mp3",
        fileUrl: "https://example.com/completed1.mp3",
        status: "completed",
        duration: 60,
        text: "Completed 1",
      },
      {
        userId: testUserId,
        fileName: "completed2.mp3",
        fileKey: "completed2.mp3",
        fileUrl: "https://example.com/completed2.mp3",
        status: "completed",
        duration: 90,
        text: "Completed 2",
      },
      {
        userId: testUserId,
        fileName: "processing.mp3",
        fileKey: "processing.mp3",
        fileUrl: "https://example.com/processing.mp3",
        status: "processing",
      },
      {
        userId: testUserId,
        fileName: "error.mp3",
        fileKey: "error.mp3",
        fileUrl: "https://example.com/error.mp3",
        status: "error",
        errorMessage: "Error",
      },
    ]);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const caller = appRouter.createCaller({
      user: {
        id: 1,
        openId: testUserId,
        name: "Test User Stats",
        email: "stats@test.com",
        loginMethod: "google",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    });

    const stats = await caller.transcriptions.stats();

    expect(stats.transcriptionsByStatus.length).toBeGreaterThan(0);
    
    // Vérifier que chaque statut a un status et un count
    stats.transcriptionsByStatus.forEach((status) => {
      expect(status).toHaveProperty("status");
      expect(status).toHaveProperty("count");
      expect(typeof status.status).toBe("string");
      expect(typeof status.count).toBe("number");
    });

    // Vérifier les counts
    const completedStatus = stats.transcriptionsByStatus.find((s) => s.status === "completed");
    const processingStatus = stats.transcriptionsByStatus.find((s) => s.status === "processing");
    const errorStatus = stats.transcriptionsByStatus.find((s) => s.status === "error");

    expect(completedStatus?.count).toBe(2);
    expect(processingStatus?.count).toBe(1);
    expect(errorStatus?.count).toBe(1);
  });
});
