import { useEffect } from "react";

const SITE_URL = "https://transcribeexpress.fr";
const DEFAULT_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/wordmark-transparent_d2755219.webp";

type StructuredData = Record<string, unknown>;

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  structuredData?: StructuredData | StructuredData[];
  type?: "website" | "article";
}

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

/**
 * Synchronise les métadonnées propres à chaque route publique d'une SPA.
 * Les schémas sont regroupés dans un unique script JSON-LD identifié.
 */
export function SeoHead({
  title,
  description,
  path,
  structuredData,
  type = "website",
}: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path === "/" ? "/" : path}`;
    document.title = title;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
    );
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", "fr_FR");
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const schemaId = "transcribe-express-route-schema";
    document.getElementById(schemaId)?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.id = schemaId;
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(schemaId)?.remove();
    };
  }, [description, path, structuredData, title, type]);

  return null;
}
