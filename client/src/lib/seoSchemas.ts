export const SITE_URL = "https://transcribeexpress.fr";
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;
export const PRODUCT_ID = `${SITE_URL}/pricing#product`;

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310419663028820418/oRqyQWHwreNEuW2rCuPNoU/neon_symbol_transparent_9075d38e.png";

export const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "Transcribe Express",
  legalName: "Z9E",
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: LOGO_URL,
  },
  address: {
    "@type": "PostalAddress",
    streetAddress: "47 rue Vivienne",
    postalCode: "75002",
    addressLocality: "Paris",
    addressCountry: "FR",
  },
  vatID: "FR35451824197",
  identifier: [
    {
      "@type": "PropertyValue",
      propertyID: "SIREN",
      value: "451824197",
    },
    {
      "@type": "PropertyValue",
      propertyID: "RCS",
      value: "451 824 197 R.C.S. Paris",
    },
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/contact`,
    availableLanguage: ["fr"],
  },
};

export const WEBSITE_SCHEMA = {
  "@type": "WebSite",
  "@id": WEBSITE_ID,
  url: SITE_URL,
  name: "Transcribe Express",
  inLanguage: "fr-FR",
  publisher: { "@id": ORGANIZATION_ID },
};

export const SOFTWARE_SCHEMA = {
  "@type": "SoftwareApplication",
  "@id": SOFTWARE_ID,
  name: "Transcribe Express",
  url: SITE_URL,
  applicationCategory: "MultimediaApplication",
  applicationSubCategory: "Transcription audio et vidéo",
  operatingSystem: "Navigateur web",
  inLanguage: "fr-FR",
  description:
    "Service web français de transcription audio et vidéo par intelligence artificielle avec éditeur synchronisé et exports TXT, SRT et VTT.",
  provider: { "@id": ORGANIZATION_ID },
  isRelatedTo: { "@id": PRODUCT_ID },
  featureList: [
    "Transcription de fichiers audio et vidéo avec Whisper",
    "Éditeur synchronisé entre le texte et l’audio",
    "Horodatage des segments",
    "Export TXT, SRT et VTT",
    "Gestion autonome des crédits et du compte",
  ],
  offers: {
    "@type": "Offer",
    name: "Essai gratuit",
    url: `${SITE_URL}/pricing`,
    price: "0",
    priceCurrency: "EUR",
    description: "30 minutes de transcription utilisables pendant 30 jours, sans carte bancaire.",
    availability: "https://schema.org/InStock",
  },
};

export interface SeoFaqItem {
  question: string;
  answer: string;
}

function buildFaqSchema(items: SeoFaqItem[], id: string) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export const HOME_FAQ_ITEMS: SeoFaqItem[] = [
  {
    question: "Comment fonctionne Transcribe Express ?",
    answer:
      "L’utilisateur importe un fichier audio ou vidéo, puis Transcribe Express en extrait la parole avec Whisper et produit un texte horodaté. Le résultat peut être relu dans un éditeur synchronisé avec l’audio, corrigé dans le navigateur, puis exporté en TXT, SRT ou VTT.",
  },
  {
    question: "Quels formats peut-on exporter ?",
    answer:
      "Transcribe Express exporte les transcriptions en TXT pour le texte brut, en SRT pour les sous-titres vidéo et en VTT pour les lecteurs web compatibles. Le service ne propose pas d’export DOCX.",
  },
  {
    question: "Quels fichiers audio et vidéo sont acceptés ?",
    answer:
      "L’interface accepte les formats audio MP3, WAV, M4A, OGG, FLAC et WEBM, ainsi que les formats vidéo MP4, MOV, AVI, MKV et WEBM. Une limite de 300 Mo est appliquée sur smartphone.",
  },
  {
    question: "Peut-on essayer Transcribe Express gratuitement ?",
    answer:
      "Oui. Le compte gratuit inclut 30 minutes de transcription utilisables pendant 30 jours, sans carte bancaire. Les fonctionnalités d’édition synchronisée et les exports TXT, SRT et VTT sont accessibles pendant l’essai.",
  },
];

export const HOME_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    ORGANIZATION_SCHEMA,
    WEBSITE_SCHEMA,
    SOFTWARE_SCHEMA,
    buildFaqSchema(HOME_FAQ_ITEMS, `${SITE_URL}/#faq`),
  ],
};

export const PRICING_FAQ_ITEMS: SeoFaqItem[] = [
  {
    question: "Combien coûte la transcription avec Transcribe Express ?",
    answer:
      "Le compte gratuit comprend 30 minutes pendant 30 jours. Starter fonctionne par recharges au tarif indicatif de 0,15 € par minute. Créateur coûte 14,90 € par mois pour 300 minutes et Agence 49,90 € par mois pour 1 500 minutes. Des formules annuelles et des recharges préférentielles sont proposées.",
  },
  {
    question: "L’essai gratuit nécessite-t-il une carte bancaire ?",
    answer:
      "Non. L’essai gratuit fournit 30 minutes de transcription pendant 30 jours sans carte bancaire. Il permet d’évaluer la transcription, l’éditeur synchronisé et les exports TXT, SRT et VTT avant un achat.",
  },
  {
    question: "Quelle est la différence entre Starter, Créateur et Agence ?",
    answer:
      "Starter convient aux besoins ponctuels et fonctionne par recharges. Créateur inclut 300 minutes par mois et donne accès à des recharges au tarif indicatif de 0,12 € par minute. Agence inclut 1 500 minutes par mois et des recharges au tarif indicatif de 0,08 € par minute.",
  },
  {
    question: "Peut-on résilier un abonnement Transcribe Express ?",
    answer:
      "Les abonnements Créateur et Agence peuvent être gérés depuis le compte client et sont proposés sans engagement de durée au-delà de la période payée. Les modalités contractuelles applicables sont détaillées dans les conditions générales de vente.",
  },
];

const pricingOffers = [
  {
    "@type": "Offer",
    name: "Essai gratuit",
    url: `${SITE_URL}/pricing`,
    price: "0",
    priceCurrency: "EUR",
    description: "30 minutes utilisables pendant 30 jours, sans carte bancaire.",
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "Starter",
    url: `${SITE_URL}/pricing`,
    price: "0.15",
    priceCurrency: "EUR",
    description: "Crédits prépayés par recharges de 5 €, 10 €, 20 € ou 50 €.",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "0.15",
      priceCurrency: "EUR",
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: 1,
        unitCode: "MIN",
      },
    },
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "Créateur mensuel",
    url: `${SITE_URL}/pricing`,
    price: "14.90",
    priceCurrency: "EUR",
    description: "300 minutes de transcription incluses chaque mois.",
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "Créateur annuel",
    url: `${SITE_URL}/pricing`,
    price: "118.80",
    priceCurrency: "EUR",
    description: "Abonnement annuel Créateur, facturé annuellement.",
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "Agence mensuel",
    url: `${SITE_URL}/pricing`,
    price: "49.90",
    priceCurrency: "EUR",
    description: "1 500 minutes de transcription incluses chaque mois.",
    availability: "https://schema.org/InStock",
  },
  {
    "@type": "Offer",
    name: "Agence annuel",
    url: `${SITE_URL}/pricing`,
    price: "478.80",
    priceCurrency: "EUR",
    description: "Abonnement annuel Agence, facturé annuellement.",
    availability: "https://schema.org/InStock",
  },
];

export const PRICING_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    ORGANIZATION_SCHEMA,
    WEBSITE_SCHEMA,
    {
      "@type": "Product",
      "@id": PRODUCT_ID,
      name: "Transcribe Express",
      url: `${SITE_URL}/pricing`,
      description:
        "Offres de transcription audio et vidéo par intelligence artificielle avec crédits prépayés ou abonnements.",
      category: "Service de transcription audio et vidéo",
      brand: { "@id": ORGANIZATION_ID },
      offers: pricingOffers,
    },
    buildFaqSchema(PRICING_FAQ_ITEMS, `${SITE_URL}/pricing#faq`),
  ],
};

export const DEMO_FAQ_ITEMS: SeoFaqItem[] = [
  {
    question: "Que montre la démo de Transcribe Express ?",
    answer:
      "La démo utilise un fichier audio français de 34 secondes fourni par Transcribe Express. Elle montre la lecture, l’apparition progressive du texte horodaté et un appel réel au service de transcription. Aucun fichier personnel n’est requis pour l’essayer.",
  },
  {
    question: "Quels formats audio et vidéo sont acceptés ?",
    answer:
      "L’interface accepte les formats audio MP3, WAV, M4A, OGG, FLAC et WEBM, ainsi que les formats vidéo MP4, MOV, AVI, MKV et WEBM. Une limite de 300 Mo est appliquée sur smartphone.",
  },
  {
    question: "Quels formats d’export sont disponibles ?",
    answer:
      "Les transcriptions peuvent être exportées en TXT, SRT et VTT. Le format TXT convient au texte brut, SRT aux sous-titres vidéo et VTT aux lecteurs web. L’export DOCX n’est pas proposé.",
  },
  {
    question: "Transcribe Express est-il adapté aux YouTubeurs ?",
    answer:
      "Oui. Un YouTubeur peut transcrire une vidéo, corriger le texte en écoutant l’audio dans l’éditeur synchronisé, puis exporter des sous-titres SRT ou VTT compatibles avec son workflow de publication.",
  },
];

const DEMO_HOWTO_SCHEMA = {
  "@type": "HowTo",
  "@id": `${SITE_URL}/demo#howto`,
  name: "Comment transcrire un fichier avec Transcribe Express",
  description: "Importer un fichier, relire le texte horodaté puis l’exporter dans un format pris en charge.",
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Importer le fichier",
      text: "Sélectionnez un fichier audio ou vidéo accepté depuis l’interface de transcription.",
      url: `${SITE_URL}/demo#etape-1`,
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Générer la transcription",
      text: "Le service analyse la piste audio et génère un texte composé de segments horodatés.",
      url: `${SITE_URL}/demo#etape-2`,
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Relire et exporter",
      text: "Relisez le résultat dans l’éditeur synchronisé puis exportez-le en TXT, SRT ou VTT.",
      url: `${SITE_URL}/demo#etape-3`,
    },
  ],
};

export const DEMO_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    ORGANIZATION_SCHEMA,
    WEBSITE_SCHEMA,
    SOFTWARE_SCHEMA,
    DEMO_HOWTO_SCHEMA,
    buildFaqSchema(DEMO_FAQ_ITEMS, `${SITE_URL}/demo#faq`),
  ],
};
