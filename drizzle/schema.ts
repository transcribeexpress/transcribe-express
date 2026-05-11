import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Table transcriptions - Stocke les transcriptions audio/vidéo
 * 
 * Étapes du pipeline (processingStep) :
 * - uploading : Upload vers S3 en cours
 * - downloading : Téléchargement depuis S3 vers le serveur
 * - extracting_audio : Extraction audio via FFmpeg
 * - transcribing : Transcription via Groq Whisper
 * - completed : Terminé
 * - error : Erreur
 * 
 * processingProgress : 0-100 (pourcentage de progression global)
 */
export const transcriptions = mysqlTable("transcriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("userId", { length: 255 }).notNull(), // Clerk user ID
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }), // Clé S3 pour suppression
  duration: int("duration"), // Durée en secondes
  status: mysqlEnum("status", ["pending", "processing", "completed", "error", "cancelled"]).default("pending").notNull(),
  /** Étape actuelle du pipeline de traitement */
  processingStep: varchar("processingStep", { length: 50 }),
  /** Pourcentage de progression globale (0-100) */
  processingProgress: int("processingProgress").default(0),
  transcriptText: text("transcriptText"),
  /** Texte édité par l'utilisateur — si renseigné, utilisé pour les exports à la place de transcriptText */
  editedText: text("editedText"),
  /** Segments Whisper sérialisés en JSON — contient les scores de confiance par segment */
  segmentsData: text("segmentsData"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;
