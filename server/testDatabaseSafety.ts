/**
 * Les tests d'intégration BDD sont désactivés par défaut.
 * Ils ne peuvent s'exécuter que si une base distincte est explicitement fournie
 * et si l'opérateur confirme son usage avec ALLOW_DATABASE_TESTS=true.
 */
export function hasDedicatedTestDatabase(): boolean {
  const testUrl = process.env.TEST_DATABASE_URL;
  const appUrl = process.env.DATABASE_URL;

  return Boolean(
    process.env.NODE_ENV === "test" &&
      process.env.ALLOW_DATABASE_TESTS === "true" &&
      testUrl &&
      testUrl !== appUrl
  );
}

export function getRuntimeDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV !== "test") {
    return process.env.DATABASE_URL;
  }

  return hasDedicatedTestDatabase()
    ? process.env.TEST_DATABASE_URL
    : undefined;
}
