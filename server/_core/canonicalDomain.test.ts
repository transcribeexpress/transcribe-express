import { describe, expect, it } from "vitest";
import { getCanonicalPublicRedirect } from "./canonicalDomain";

describe("canonical domain redirect", () => {
  it("redirige l’accès admin du domaine Manus historique vers le domaine Clerk canonique", () => {
    expect(getCanonicalPublicRedirect("transcribeexpress.manus.space", "/admin"))
      .toBe("https://transcribeexpress.fr/admin");
  });

  it("préserve le chemin et la chaîne de requête", () => {
    expect(getCanonicalPublicRedirect("transcribex-orqyqwhw.manus.space", "/login?redirect=%2Fadmin"))
      .toBe("https://transcribeexpress.fr/login?redirect=%2Fadmin");
  });

  it("ne redirige jamais les domaines canoniques ou inconnus", () => {
    expect(getCanonicalPublicRedirect("transcribeexpress.fr", "/admin")).toBeNull();
    expect(getCanonicalPublicRedirect("www.transcribeexpress.fr", "/admin")).toBeNull();
    expect(getCanonicalPublicRedirect("unknown.example", "/admin")).toBeNull();
  });

  it("normalise les hôtes forwarded avec port", () => {
    expect(getCanonicalPublicRedirect("transcribeexpress.manus.space:443", "/admin"))
      .toBe("https://transcribeexpress.fr/admin");
  });
});
