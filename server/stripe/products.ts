/**
 * Produits et prix Stripe — Transcribe Express
 * 
 * Ce fichier centralise tous les Price IDs Stripe Live.
 * Les prix sont définis dans le dashboard Stripe et référencés ici.
 */

export const STRIPE_PRICES = {
  // Recharges Starter (paiement unique)
  starter: {
    recharge5: "price_1TwxK69hT559d2yxU5n0lW76",
    recharge10: "price_1TwxNS9hT559d2yxuigu3kT9",
    recharge20: "price_1TwxOI9hT559d2yxu7FzUjXg",
    recharge50: "price_1TwxPX9hT559d2yxIU58yFrN",
  },
  // Plan Créateur (abonnement)
  creator: {
    monthly: "price_1TwxRa9hT559d2yxDYSMT4Og",
    annual: "price_1TwxgP9hT559d2yxNO7T2RjU",
  },
  // Plan Agence (abonnement)
  agency: {
    monthly: "price_1TwxZt9hT559d2yx7Ac9QrXB",
    annual: "price_1TwxZt9hT559d2yxTuuvzcok",
  },
} as const;

/**
 * Mapping Price ID → informations du plan
 */
export const PRICE_TO_PLAN = {
  // Starter recharges → plan starter
  [STRIPE_PRICES.starter.recharge5]: { plan: "starter" as const, minutes: 33, type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge10]: { plan: "starter" as const, minutes: 66, type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge20]: { plan: "starter" as const, minutes: 133, type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge50]: { plan: "starter" as const, minutes: 333, type: "one_time" as const },
  // Créateur → plan creator (300 min/mois = 5h)
  [STRIPE_PRICES.creator.monthly]: { plan: "creator" as const, minutes: 300, type: "subscription" as const },
  [STRIPE_PRICES.creator.annual]: { plan: "creator" as const, minutes: 300, type: "subscription" as const },
  // Agence → plan agency (1500 min/mois = 25h)
  [STRIPE_PRICES.agency.monthly]: { plan: "agency" as const, minutes: 1500, type: "subscription" as const },
  [STRIPE_PRICES.agency.annual]: { plan: "agency" as const, minutes: 1500, type: "subscription" as const },
} as const;

/**
 * Tous les Price IDs valides (pour validation)
 */
export const ALL_PRICE_IDS = [
  ...Object.values(STRIPE_PRICES.starter),
  ...Object.values(STRIPE_PRICES.creator),
  ...Object.values(STRIPE_PRICES.agency),
] as const;

export type PlanType = "free" | "starter" | "creator" | "agency";
