import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

describe("Clerk identity synchronization safety", () => {
  it("enregistre le webhook signé avant express.json", () => {
    const source = fs.readFileSync(path.join(root, "server/_core/index.ts"), "utf8");
    const webhookIndex = source.indexOf('"/api/webhooks/clerk"');
    const jsonParserIndex = source.indexOf("app.use(express.json");

    expect(webhookIndex).toBeGreaterThan(-1);
    expect(jsonParserIndex).toBeGreaterThan(webhookIndex);
    expect(source).toContain("express.raw({ type: \"application/json\" })");
  });

  it("ne déclenche jamais la suppression complète depuis user.deleted", () => {
    const source = fs.readFileSync(path.join(root, "server/clerk/webhook.ts"), "utf8");

    expect(source).toContain("disableClerkIdentity");
    expect(source).not.toContain("deleteUserAccount");
    expect(source).not.toContain("purgeS3");
    expect(source).not.toContain("stripe.customers.del");
  });

  it("refuse les sessions localement désactivées au point d’authentification central", () => {
    const source = fs.readFileSync(path.join(root, "server/_core/sdk.ts"), "utf8");

    expect(source).toContain('user.identityStatus === "disabled"');
    expect(source).toContain('ForbiddenError("Identity disabled")');
  });

  it("applique les événements uniquement s’ils ne sont pas plus anciens que l’état enregistré", () => {
    const source = fs.readFileSync(path.join(root, "server/db.ts"), "utf8");

    expect(source.match(/lte\(users\.identityLastSyncedAt,/g)).toHaveLength(2);
    expect(source).toContain('identityStatus: "disabled"');
    expect(source).toContain('identityStatus: "active"');
  });

  it("garde l’audit Clerk non destructif et protège toute réconciliation par un consentement explicite", () => {
    const source = fs.readFileSync(path.join(root, "scripts/audit-clerk-user-parity.mts"), "utf8");

    expect(source).toContain('ALLOW_CLERK_IDENTITY_RECONCILIATION !== "true"');
    expect(source).not.toContain(".delete(");
    expect(source).not.toContain("deleteUserAccount");
    expect(source).not.toContain("stripe.customers.del");
  });
});
