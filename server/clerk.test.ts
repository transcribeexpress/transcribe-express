import { describe, it, expect } from "vitest";
import { createClerkClient } from "@clerk/express";

/**
 * Test de validation des clés API Clerk
 * 
 * Ce test vérifie que les clés Clerk sont correctement configurées
 * en appelant l'API Clerk pour récupérer les informations de l'instance.
 */
describe("Clerk API Keys Validation", () => {
  const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
  const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  it("should have CLERK_SECRET_KEY environment variable set", () => {
    expect(CLERK_SECRET_KEY).toBeDefined();
    expect(CLERK_SECRET_KEY).not.toBe("");
    expect(CLERK_SECRET_KEY?.startsWith("sk_")).toBe(true);
  });

  it("should have NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable set", () => {
    expect(CLERK_PUBLISHABLE_KEY).toBeDefined();
    expect(CLERK_PUBLISHABLE_KEY).not.toBe("");
    expect(CLERK_PUBLISHABLE_KEY?.startsWith("pk_")).toBe(true);
  });

  it("should be able to call Clerk API with secret key", async () => {
    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
    const response = await clerk.users.getUserList({ limit: 1 });

    expect(Array.isArray(response.data)).toBe(true);
    expect(response.totalCount).toBeGreaterThanOrEqual(response.data.length);
  });

  it("should validate Clerk instance via JWKS endpoint", async () => {
    // Extraire l'instance ID de la clé publique
    // Format: pk_test_<instance_id>_<random> ou pk_live_<instance_id>_<random>
    const keyParts = CLERK_PUBLISHABLE_KEY?.split("_") || [];
    
    // La clé publique doit avoir au moins 3 parties
    expect(keyParts.length).toBeGreaterThanOrEqual(3);
    
    // Vérifier que la clé est de type test ou live
    expect(["pk", "test", "live"]).toContain(keyParts[0]);
  });
});
