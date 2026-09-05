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
    };

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
      return { ok: false, code: "invalid_token" };
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
    return { ok: false, code: "invalid_token" };
  }
}
