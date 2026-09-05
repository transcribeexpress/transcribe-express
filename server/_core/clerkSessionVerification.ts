import { verifyToken } from "@clerk/backend";

type VerifyTokenResult = Awaited<ReturnType<typeof verifyToken>>;
type VerifyTokenFunction = (
  token: string,
  options: { secretKey: string }
) => Promise<VerifyTokenResult>;

export type ClerkSessionVerification =
  | { ok: true; subject: string }
  | {
      ok: false;
      code: "invalid_token" | "subject_mismatch" | "unauthorized_party";
      reason?: string;
    };

const SAFE_VERIFICATION_REASONS = new Set([
  "token-expired",
  "token-invalid",
  "token-invalid-algorithm",
  "token-invalid-authorized-parties",
  "token-invalid-signature",
  "token-not-active-yet",
  "token-iat-in-the-future",
  "token-verification-failed",
  "secret-key-invalid",
  "local-jwk-missing",
  "remote-jwk-failed-to-load",
  "remote-jwk-invalid",
  "remote-jwk-missing",
  "jwk-failed-to-resolve",
  "jwk-kid-mismatch",
]);

function getSafeVerificationReason(error: unknown): string {
  if (!error || typeof error !== "object" || !("reason" in error)) return "unknown";
  const reason = (error as { reason?: unknown }).reason;
  return typeof reason === "string" && SAFE_VERIFICATION_REASONS.has(reason)
    ? reason
    : "unknown";
}

/**
 * Vérifie d'abord la signature et les dates du jeton Clerk, puis contrôle
 * explicitement le sujet et l'origine `azp` lorsqu'elle est présente.
 */
export async function verifyClerkSession(
  params: {
    token: string;
    secretKey: string;
    expectedUserId: string;
    authorizedParties: string[];
  },
  verify: VerifyTokenFunction = verifyToken
): Promise<ClerkSessionVerification> {
  try {
    const result = await verify(params.token, { secretKey: params.secretKey });
    if (!result.data) {
      const verificationErrors = (result as { errors?: unknown[] }).errors;
      return {
        ok: false,
        code: "invalid_token",
        reason: getSafeVerificationReason(verificationErrors?.[0]),
      };
    }

    const claims = result.data as { sub?: unknown; azp?: unknown };
    const subject = typeof claims.sub === "string" ? claims.sub : null;
    if (!subject || subject !== params.expectedUserId) {
      return { ok: false, code: "subject_mismatch" };
    }

    const authorizedParty = typeof claims.azp === "string" ? claims.azp : null;
    if (authorizedParty && !params.authorizedParties.includes(authorizedParty)) {
      return { ok: false, code: "unauthorized_party" };
    }

    return { ok: true, subject };
  } catch {
    return { ok: false, code: "invalid_token", reason: "unexpected_exception" };
  }
}
