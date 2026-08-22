import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEMO_STRUCTURED_DATA,
  HOME_STRUCTURED_DATA,
  PRICING_STRUCTURED_DATA,
} from "../client/src/lib/seoSchemas";
import {
  DEMO_ANSWER_FIRST,
  HOME_ANSWER_FIRST,
  PRICING_ANSWER_FIRST,
} from "../client/src/lib/aeoContent";

const root = resolve(process.cwd());

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function wordCount(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

describe("Fondations AEO — fichiers de découverte", () => {
  it("publie un llms.txt factuel avec les pages de référence et les limites", () => {
    const llms = readProjectFile("client/public/llms.txt");

    expect(llms).toContain("# Transcribe Express");
    expect(llms).toContain("## Pages publiques de référence");
    expect(llms).toContain("## Limites d’interprétation");
    expect(llms).toContain("https://transcribeexpress.fr/demo");
    expect(llms).not.toContain("transcribeexpress.manus.space");
    expect(llms).not.toMatch(/précision supérieure à 95|aggregateRating|DOCX disponible/iu);
  });

  it("autorise les crawlers IA tout en excluant les routes privées", () => {
    const robots = readProjectFile("client/public/robots.txt");

    ["GPTBot", "OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Google-Extended"].forEach(
      (crawler) => expect(robots).toContain(`User-agent: ${crawler}`)
    );
    ["/api/", "/account", "/admin", "/dashboard", "/results/", "/upload"].forEach(
      (route) => expect(robots).toContain(`Disallow: ${route}`)
    );
    expect(robots).toContain("Sitemap: https://transcribeexpress.fr/sitemap.xml");
  });

  it("référence uniquement des pages publiques canoniques dans le sitemap", () => {
    const sitemap = readProjectFile("client/public/sitemap.xml");
    const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/gu)].map((match) => match[1]);

    expect(locations).toEqual([
      "https://transcribeexpress.fr/",
      "https://transcribeexpress.fr/demo",
      "https://transcribeexpress.fr/pricing",
      "https://transcribeexpress.fr/contact",
      "https://transcribeexpress.fr/privacy",
      "https://transcribeexpress.fr/legal",
      "https://transcribeexpress.fr/cgv",
    ]);
    expect(sitemap).not.toMatch(/dashboard|login|account|payment|results|upload/iu);
  });
});

describe("Fondations AEO — données structurées", () => {
  const schemas = [HOME_STRUCTURED_DATA, PRICING_STRUCTURED_DATA, DEMO_STRUCTURED_DATA];

  it("relie les entités Organization, WebSite, SoftwareApplication, Product, Offer, FAQPage et HowTo", () => {
    const serialized = JSON.stringify(schemas);

    [
      '"Organization"',
      '"WebSite"',
      '"SoftwareApplication"',
      '"Product"',
      '"Offer"',
      '"FAQPage"',
      '"HowTo"',
    ].forEach((type) => expect(serialized).toContain(type));
  });

  it("ne publie aucune note, aucun avis ou avantage chiffré sans source", () => {
    const serialized = JSON.stringify(schemas);

    expect(serialized).not.toMatch(/aggregateRating|ratingValue|ratingCount|review/iu);
    expect(serialized).not.toMatch(/95%|150×|30×|aucun concurrent|export DOCX disponible/iu);
  });

  it("publie des offres avec prix et devise explicites", () => {
    const graph = PRICING_STRUCTURED_DATA["@graph"];
    const product = graph.find((node) => node["@type"] === "Product");

    expect(product).toBeDefined();
    const offers = product && "offers" in product ? product.offers : [];
    expect(Array.isArray(offers)).toBe(true);
    expect(offers).toHaveLength(6);
    for (const offer of offers as Array<Record<string, unknown>>) {
      expect(offer["@type"]).toBe("Offer");
      expect(offer.priceCurrency).toBe("EUR");
      expect(offer.price).toBeDefined();
      expect(offer.url).toBe("https://transcribeexpress.fr/pricing");
    }
  });
});

describe("Fondations AEO — Answer-First", () => {
  const contents = [HOME_ANSWER_FIRST, PRICING_ANSWER_FIRST, DEMO_ANSWER_FIRST];

  it.each(contents)("garde la réponse directe de $id entre 30 et 60 mots", (content) => {
    expect(wordCount(content.answer)).toBeGreaterThanOrEqual(30);
    expect(wordCount(content.answer)).toBeLessThanOrEqual(60);
  });

  it.each(contents)("garde le passage autonome de $id entre 150 et 300 mots", (content) => {
    const count = wordCount(content.paragraphs.join(" "));
    expect(count).toBeGreaterThanOrEqual(150);
    expect(count).toBeLessThanOrEqual(300);
  });

  it("intègre la couche SEO et le passage AEO dans les trois pages prioritaires", () => {
    ["Home.tsx", "Pricing.tsx", "Demo.tsx"].forEach((page) => {
      const source = readProjectFile(`client/src/pages/${page}`);
      expect(source).toContain("<SeoHead");
      expect(source).toContain("<AnswerFirstSection");
    });
  });
});

describe("Fondations AEO — cohérence canonique", () => {
  it("supprime l’ancien domaine Manus des pages juridiques", () => {
    ["Privacy.tsx", "Legal.tsx", "CGV.tsx"].forEach((page) => {
      const source = readProjectFile(`client/src/pages/${page}`);
      expect(source).not.toContain("transcribeexpress.manus.space");
      expect(source).toContain("transcribeexpress.fr");
    });
  });

  it("pointe les conditions de la page de connexion vers les CGV existantes", () => {
    const login = readProjectFile("client/src/pages/Login.tsx");
    expect(login).toContain('href="/cgv"');
    expect(login).not.toContain('href="/terms"');
  });
});
