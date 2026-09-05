import { describe, expect, it, vi } from "vitest";
import { verifyClerkSession } from "./clerkSessionVerification";

const baseParams = {
  token: "signed-token",
  secretKey: "sk_test_only",
  expectedUserId: "user_expected",
  authorizedParties: ["https://transcribeexpress.fr"],
};

describe("verifyClerkSession", () => {
  it("accepte un jeton signé du bon utilisateur et de la bonne origine", async () => {
    const verify = vi.fn().mockResolvedValue({
      data: { sub: "user_expected", azp: "https://transcribeexpress.fr" },
    });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: true,
      subject: "user_expected",
    });
  });

  it("accepte un jeton signé sans claim azp conformément à la vérification manuelle Clerk", async () => {
    const verify = vi.fn().mockResolvedValue({ data: { sub: "user_expected" } });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: true,
      subject: "user_expected",
    });
  });

  it("refuse un sujet différent", async () => {
    const verify = vi.fn().mockResolvedValue({
      data: { sub: "user_other", azp: "https://transcribeexpress.fr" },
    });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: false,
      code: "subject_mismatch",
    });
  });

  it("refuse une origine non autorisée", async () => {
    const verify = vi.fn().mockResolvedValue({
      data: { sub: "user_expected", azp: "https://attacker.example" },
    });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: false,
      code: "unauthorized_party",
    });
  });

  it("refuse un jeton dont la vérification retourne une erreur", async () => {
    const verify = vi.fn().mockResolvedValue({ errors: [new Error("invalid")] });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: false,
      code: "invalid_token",
      reason: "unknown",
    });
  });

  it("ne restitue qu’une raison Clerk normalisée", async () => {
    const verify = vi.fn().mockResolvedValue({
      errors: [{ reason: "token-invalid-signature", message: "sensitive details" }],
    });

    await expect(verifyClerkSession(baseParams, verify)).resolves.toEqual({
      ok: false,
      code: "invalid_token",
      reason: "token-invalid-signature",
    });
  });
});
