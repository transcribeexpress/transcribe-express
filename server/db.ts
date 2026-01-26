import { eq, desc } from "drizzle-orm";
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
  status: 'pending' | 'processing' | 'completed' | 'error',
  updates?: {
    transcriptText?: string;
    errorMessage?: string;
    duration?: number;
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

  await db
    .update(transcriptions)
    .set(updateData)
    .where(eq(transcriptions.id, id));
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
