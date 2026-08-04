import { int, longtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
  /** Plan actif de l'utilisateur */
  plan: mysqlEnum("plan", ["free", "starter", "creator", "agency"]).default("free").notNull(),
  /** Stripe Customer ID pour lier l'utilisateur à Stripe */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Minutes de transcription restantes (crédits) */
  creditsMinutes: int("creditsMinutes").default(30).notNull(),
  /** Date d'expiration de l'essai gratuit */
  trialExpiresAt: timestamp("trialExpiresAt"),
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
  segmentsData: longtext("segmentsData"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

/**
 * Table subscriptions - Stocke les références Stripe des abonnements actifs
 * Principe : stocker uniquement les IDs Stripe, pas les données redondantes
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Stripe Subscription ID */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }).notNull().unique(),
  /** Stripe Price ID pour identifier le plan */
  stripePriceId: varchar("stripePriceId", { length: 255 }).notNull(),
  /** Statut syncé depuis Stripe (active, canceled, past_due, trialing) */
  status: varchar("status", { length: 50 }).default("active").notNull(),
  /** Période courante - début */
  currentPeriodStart: timestamp("currentPeriodStart"),
  /** Période courante - fin */
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Table creditRechargeHistory - Historique des recharges de crédits (paiements one_time)
 * Persiste chaque recharge pour traçabilité, réconciliation Stripe et support client.
 */
export const creditRechargeHistory = mysqlTable("creditRechargeHistory", {
  id: int("id").autoincrement().primaryKey(),
  /** Référence vers users.id */
  userId: int("userId").notNull(),
  /** Stripe Payment Intent ID pour traçabilité */
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  /** Stripe Checkout Session ID */
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  /** Montant payé en centimes (ex: 500 = 5€) */
  amountCents: int("amountCents").notNull(),
  /** Devise (EUR par défaut) */
  currency: varchar("currency", { length: 10 }).default("eur").notNull(),
  /** Minutes ajoutées au compte */
  minutesAdded: int("minutesAdded").notNull(),
  /** Price ID Stripe utilisé */
  priceId: varchar("priceId", { length: 255 }).notNull(),
  /** Plan de l'utilisateur au moment de la recharge */
  planAtPurchase: varchar("planAtPurchase", { length: 50 }).notNull(),
  /** Statut du paiement */
  status: mysqlEnum("status", ["completed", "pending", "failed", "refunded"]).default("completed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditRechargeHistory = typeof creditRechargeHistory.$inferSelect;
export type InsertCreditRechargeHistory = typeof creditRechargeHistory.$inferInsert;

/**
 * Table userPreferences - Préférences utilisateur persistées
 * Stocke les choix de langue, format d'export et notifications.
 */
export const userPreferences = mysqlTable("userPreferences", {
  id: int("id").autoincrement().primaryKey(),
  /** Référence vers users.id (unique — 1 préférence par utilisateur) */
  userId: int("userId").notNull().unique(),
  /** Langue par défaut pour la transcription (ISO 639-1) */
  defaultLanguage: varchar("defaultLanguage", { length: 10 }).default("fr"),
  /** Format d'export par défaut */
  defaultExportFormat: mysqlEnum("defaultExportFormat", ["txt", "srt", "vtt"]).default("txt"),
  /** Notifications par email activées */
  emailNotifications: int("emailNotifications").default(1).notNull(),
  /** Notification quand transcription terminée */
  notifyOnComplete: int("notifyOnComplete").default(1).notNull(),
  /** Notification quand crédits faibles (<20%) */
  notifyOnLowCredits: int("notifyOnLowCredits").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

/**
 * Table supportTickets - Tickets de support client
 * Persiste les demandes envoyées depuis la page Contact.
 */
export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  /** Référence vers users.id (null si utilisateur non connecté) */
  userId: int("userId"),
  /** Nom de l'expéditeur */
  name: varchar("name", { length: 255 }).notNull(),
  /** Email de l'expéditeur */
  email: varchar("email", { length: 255 }).notNull(),
  /** Sujet du ticket */
  subject: varchar("subject", { length: 500 }).notNull(),
  /** Catégorie du ticket */
  category: mysqlEnum("category", ["technical", "billing", "account", "feature", "other"]).default("other").notNull(),
  /** Message complet */
  message: text("message").notNull(),
  /** Statut du ticket */
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  /** Priorité du ticket */
  priority: mysqlEnum("priority", ["low", "normal", "high", "urgent"]).default("normal").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

/**
 * Table gdprRequests - Demandes RGPD (export, suppression, rectification)
 * Conformité RGPD obligatoire — délai légal de traitement : 30 jours.
 */
export const gdprRequests = mysqlTable("gdprRequests", {
  id: int("id").autoincrement().primaryKey(),
  /** Référence vers users.id */
  userId: int("userId"),
  /** Email de l'utilisateur au moment de la demande */
  email: varchar("email", { length: 255 }).notNull(),
  /** Type de demande RGPD */
  requestType: mysqlEnum("requestType", ["export", "deletion", "rectification", "portability"]).notNull(),
  /** Raison ou contexte de la demande (optionnel) */
  reason: text("reason"),
  /** Statut de traitement */
  status: mysqlEnum("status", ["pending", "processing", "completed", "rejected"]).default("pending").notNull(),
  /** Date de traitement effectif */
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type GdprRequest = typeof gdprRequests.$inferSelect;
export type InsertGdprRequest = typeof gdprRequests.$inferInsert;
