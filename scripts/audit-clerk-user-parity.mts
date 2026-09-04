import { createClerkClient } from "@clerk/express";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the read-only audit.");
}

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY is required for the read-only audit.");
}

const db = drizzle(process.env.DATABASE_URL);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const reconcile = process.argv.includes("--reconcile");

if (reconcile && process.env.ALLOW_CLERK_IDENTITY_RECONCILIATION !== "true") {
  throw new Error("Set ALLOW_CLERK_IDENTITY_RECONCILIATION=true to reconcile identity statuses.");
}

const rows = await db.select({ openId: users.openId }).from(users);

const clerkBackedRows = rows.filter(({ openId }) => openId.startsWith("clerk_user_") || openId.startsWith("user_"));
const clerkProductionUsers = await clerk.users.getUserList({ limit: 500 });
const databaseClerkIds = new Set(clerkBackedRows.map(({ openId }) => (
  openId.startsWith("clerk_") ? openId.slice("clerk_".length) : openId
)));
let activeInProduction = 0;
let absentFromProduction = 0;
let lookupErrors = 0;
let reconciledRows = 0;
const reconciledAt = new Date();
for (const { openId } of clerkBackedRows) {
  const clerkUserId = openId.startsWith("clerk_") ? openId.slice("clerk_".length) : openId;
  try {
    await clerk.users.getUser(clerkUserId);
    activeInProduction += 1;
    if (reconcile) {
      await db.update(users).set({
        identityProvider: "clerk",
        identityStatus: "active",
        identityLastSyncedAt: reconciledAt,
        identityDisabledAt: null,
      }).where(eq(users.openId, openId));
      reconciledRows += 1;
    }
  } catch (error: unknown) {
    const clientError = error as { status?: number; statusCode?: number };
    const status = Number(clientError.status ?? clientError.statusCode ?? 0);
    if (status === 404) {
      absentFromProduction += 1;
      if (reconcile) {
        await db.update(users).set({
          identityProvider: "clerk",
          identityStatus: "disabled",
          identityLastSyncedAt: reconciledAt,
          identityDisabledAt: reconciledAt,
        }).where(eq(users.openId, openId));
        reconciledRows += 1;
      }
    } else {
      lookupErrors += 1;
    }
  }
}

console.log(JSON.stringify({
  totalDatabaseRows: rows.length,
  clerkBackedRows: clerkBackedRows.length,
  clerkProductionUsers: clerkProductionUsers.data.length,
  productionUsersMissingFromDatabase: clerkProductionUsers.data.filter(({ id }) => !databaseClerkIds.has(id)).length,
  activeInProduction,
  absentFromProduction,
  lookupErrors,
  reconciliationApplied: reconcile,
  reconciledRows,
}, null, 2));

process.exit(0);
