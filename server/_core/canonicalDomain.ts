const LEGACY_MANUS_HOSTS = new Set([
  "transcribeexpress.manus.space",
  "transcribex-orqyqwhw.manus.space",
]);

const CANONICAL_PUBLIC_ORIGIN = "https://transcribeexpress.fr";

function normalizeHost(rawHost: string | undefined): string {
  return (rawHost ?? "").split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Retourne la destination publique canonique pour les anciens domaines Manus.
 * Les sessions Clerk Production sont établies sur transcribeexpress.fr ; éviter
 * de rendre l’application sur ces domaines historiques prévient les écrans vides.
 */
export function getCanonicalPublicRedirect(
  rawHost: string | undefined,
  originalUrl: string,
): string | null {
  const host = normalizeHost(rawHost);
  if (!LEGACY_MANUS_HOSTS.has(host)) return null;
  return `${CANONICAL_PUBLIC_ORIGIN}${originalUrl}`;
}
