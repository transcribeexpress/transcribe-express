import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, transcriptions, InsertTranscription } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    // Initialiser l'essai gratuit de 30 jours pour les nouveaux utilisateurs
    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 30);
    values.trialExpiresAt = trialExpiry;
    values.creditsMinutes = 30; // 30 minutes d'essai gratuit

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Récupérer toutes les transcriptions d'un utilisateur
 * Triées par date de création décroissante (plus récentes en premier)
 */
export async function getUserTranscriptions(userId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get transcriptions: database not available");
    return [];
  }

  return await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.userId, userId))
    .orderBy(desc(transcriptions.createdAt));
}

/**
 * Créer une nouvelle transcription
 */
export async function createTranscription(transcription: InsertTranscription) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(transcriptions).values(transcription);
  return result;
}

/**
 * Récupérer une transcription par son ID
 */
export async function getTranscriptionById(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Mettre à jour le statut d'une transcription
 */
export async function updateTranscriptionStatus(
  id: number,
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled',
  updates?: {
    transcriptText?: string;
    errorMessage?: string;
    duration?: number;
    processingStep?: string;
    processingProgress?: number;
  }
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const updateData: Partial<InsertTranscription> = { status };
  if (updates?.transcriptText !== undefined) updateData.transcriptText = updates.transcriptText;
  if (updates?.errorMessage !== undefined) updateData.errorMessage = updates.errorMessage;
  if (updates?.duration !== undefined) updateData.duration = updates.duration;
  if (updates?.processingStep !== undefined) updateData.processingStep = updates.processingStep;
  if (updates?.processingProgress !== undefined) updateData.processingProgress = updates.processingProgress;

  await db
    .update(transcriptions)
    .set(updateData)
    .where(eq(transcriptions.id, id));
}

/**
 * Mettre à jour uniquement l'étape et la progression d'une transcription
 * Utilisé par le worker pour signaler la progression sans changer le statut
 */
export async function updateTranscriptionProgress(
  id: number,
  processingStep: string,
  processingProgress: number
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(transcriptions)
    .set({ processingStep, processingProgress })
    .where(eq(transcriptions.id, id));
}

/**
 * Mettre à jour le texte édité d'une transcription
 * Préserve le texte original (transcriptText) intact
 */
export async function updateTranscriptionEdited(
  id: number,
  editedText: string | null
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(transcriptions)
    .set({ editedText })
    .where(eq(transcriptions.id, id));

  return { success: true };
}

/**
 * Mettre à jour les segments Whisper (scores de confiance) d'une transcription
 */
export async function updateTranscriptionSegments(
  id: number,
  segmentsData: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(transcriptions)
    .set({ segmentsData })
    .where(eq(transcriptions.id, id));

  return { success: true };
}

/**
 * Supprimer une transcription par son ID
 */
export async function deleteTranscription(id: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .delete(transcriptions)
    .where(eq(transcriptions.id, id));
  
  return { success: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUOTA & CRÉDITS — Gestion des minutes de transcription
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Déduire des minutes du quota d'un utilisateur après une transcription terminée.
 * Utilise une opération atomique SQL pour éviter les race conditions.
 * Ne descend jamais en dessous de 0.
 * 
 * @param userOpenId - L'openId de l'utilisateur
 * @param minutesUsed - Le nombre de minutes à déduire (arrondi au supérieur)
 * @returns Le nouveau solde de crédits
 */
export async function deductCredits(userOpenId: string, minutesUsed: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available for credit deduction");
  }

  // Arrondir au supérieur (1 min 43s = 2 minutes déduites)
  const minutesToDeduct = Math.ceil(minutesUsed);

  // Opération atomique : GREATEST(creditsMinutes - X, 0) pour ne jamais descendre sous 0
  await db
    .update(users)
    .set({
      creditsMinutes: sql`GREATEST(${users.creditsMinutes} - ${minutesToDeduct}, 0)`,
    })
    .where(eq(users.openId, userOpenId));

  // Récupérer le nouveau solde
  const [updated] = await db
    .select({ creditsMinutes: users.creditsMinutes })
    .from(users)
    .where(eq(users.openId, userOpenId));

  const newBalance = updated?.creditsMinutes ?? 0;
  console.log(`[Quota] Deducted ${minutesToDeduct} min from user ${userOpenId}. New balance: ${newBalance} min`);
  
  return newBalance;
}

/**
 * Vérifier si un utilisateur a suffisamment de crédits pour lancer une transcription.
 * Retourne le solde actuel et si l'utilisateur peut transcrire.
 * 
 * @param userOpenId - L'openId de l'utilisateur
 * @returns { canTranscribe, creditsMinutes, plan }
 */
export async function checkQuota(userOpenId: string): Promise<{
  canTranscribe: boolean;
  creditsMinutes: number;
  plan: string;
  trialExpiresAt: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available for quota check");
  }

  const [user] = await db
    .select({
      creditsMinutes: users.creditsMinutes,
      plan: users.plan,
      trialExpiresAt: users.trialExpiresAt,
    })
    .from(users)
    .where(eq(users.openId, userOpenId));

  if (!user) {
    return { canTranscribe: false, creditsMinutes: 0, plan: "free", trialExpiresAt: null };
  }

  // Vérifier si l'essai gratuit est expiré pour le plan free
  if (user.plan === "free" && user.trialExpiresAt) {
    const now = new Date();
    if (now > new Date(user.trialExpiresAt)) {
      // Essai expiré — pas de crédits
      return { canTranscribe: false, creditsMinutes: 0, plan: user.plan, trialExpiresAt: user.trialExpiresAt };
    }
  }

  // L'utilisateur peut transcrire s'il a au moins 1 minute de crédits
  const canTranscribe = user.creditsMinutes > 0;

  return {
    canTranscribe,
    creditsMinutes: user.creditsMinutes,
    plan: user.plan,
    trialExpiresAt: user.trialExpiresAt,
  };
}

/**
 * Récupérer les crédits d'un utilisateur par son ID numérique
 */
export async function getUserCreditsById(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [user] = await db
    .select({ creditsMinutes: users.creditsMinutes })
    .from(users)
    .where(eq(users.id, userId));

  return user?.creditsMinutes ?? 0;
}
