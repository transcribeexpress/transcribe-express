/**
 * Produits et prix Stripe — Transcribe Express
 * 
 * Ce fichier centralise tous les Price IDs Stripe (mode test).
 * Les prix sont définis dans le dashboard Stripe et référencés ici.
 * 
 * Grilles tarifaires des recharges :
 * - Starter  : 0,15€/min (tarif standard)
 * - Créateur : 0,12€/min (tarif préférentiel abonné)
 * - Agence   : 0,08€/min (meilleur tarif)
 */

export const STRIPE_PRICES = {
  // Recharges Starter (paiement unique — 0,15€/min)
  starter: {
    recharge5:  "price_1TwxK69hT559d2yxU5n0lW76", // 5€  = ~33 min
    recharge10: "price_1TwxNS9hT559d2yxuigu3kT9", // 10€ = ~66 min
    recharge20: "price_1TwxOI9hT559d2yxu7FzUjXg", // 20€ = ~133 min
    recharge50: "price_1TwxPX9hT559d2yxIU58yFrN", // 50€ = ~333 min
  },
  // Recharges Créateur (paiement unique — 0,12€/min — tarif préférentiel)
  creatorRecharge: {
    recharge5:  "price_1U0Do1KGW1kSnF8G6eJmeOYY", // 5€  = 42 min
    recharge10: "price_1U0Do2KGW1kSnF8GTXImvQ1h", // 10€ = 83 min
    recharge20: "price_1U0Do2KGW1kSnF8GiyDDjFlO", // 20€ = 167 min
    recharge50: "price_1U0Do2KGW1kSnF8Gmn5OjD95", // 50€ = 417 min
  },
  // Recharges Agence (paiement unique — 0,08€/min — meilleur tarif)
  agencyRecharge: {
    recharge5:  "price_1U0Do3KGW1kSnF8GW7cLPN2Q", // 5€  = 63 min
    recharge10: "price_1U0Do3KGW1kSnF8GXd3g6W17", // 10€ = 125 min
    recharge20: "price_1U0Do3KGW1kSnF8GkOhwTeRm", // 20€ = 250 min
    recharge50: "price_1U0Do4KGW1kSnF8GIoNp28Ve", // 50€ = 625 min
  },
  // Plan Créateur (abonnement)
  creator: {
    monthly: "price_1TwxRa9hT559d2yxDYSMT4Og",
    annual:  "price_1TwxgP9hT559d2yxNO7T2RjU",
  },
  // Plan Agence (abonnement)
  agency: {
    monthly: "price_1TwxZt9hT559d2yx7Ac9QrXB",
    annual:  "price_1TwxZt9hT559d2yxTuuvzcok",
  },
} as const;

/**
 * Mapping Price ID → informations du plan
 */
export const PRICE_TO_PLAN = {
  // Starter recharges → plan starter
  [STRIPE_PRICES.starter.recharge5]:  { plan: "starter" as const, minutes: 33,  type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge10]: { plan: "starter" as const, minutes: 66,  type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge20]: { plan: "starter" as const, minutes: 133, type: "one_time" as const },
  [STRIPE_PRICES.starter.recharge50]: { plan: "starter" as const, minutes: 333, type: "one_time" as const },
  // Créateur recharges préférentielles → plan creator (conserve l'abonnement)
  [STRIPE_PRICES.creatorRecharge.recharge5]:  { plan: "creator" as const, minutes: 42,  type: "one_time" as const },
  [STRIPE_PRICES.creatorRecharge.recharge10]: { plan: "creator" as const, minutes: 83,  type: "one_time" as const },
  [STRIPE_PRICES.creatorRecharge.recharge20]: { plan: "creator" as const, minutes: 167, type: "one_time" as const },
  [STRIPE_PRICES.creatorRecharge.recharge50]: { plan: "creator" as const, minutes: 417, type: "one_time" as const },
  // Agence recharges préférentielles → plan agency (conserve l'abonnement)
  [STRIPE_PRICES.agencyRecharge.recharge5]:  { plan: "agency" as const, minutes: 63,  type: "one_time" as const },
  [STRIPE_PRICES.agencyRecharge.recharge10]: { plan: "agency" as const, minutes: 125, type: "one_time" as const },
  [STRIPE_PRICES.agencyRecharge.recharge20]: { plan: "agency" as const, minutes: 250, type: "one_time" as const },
  [STRIPE_PRICES.agencyRecharge.recharge50]: { plan: "agency" as const, minutes: 625, type: "one_time" as const },
  // Créateur → plan creator (300 min/mois = 5h)
  [STRIPE_PRICES.creator.monthly]: { plan: "creator" as const, minutes: 300, type: "subscription" as const },
  [STRIPE_PRICES.creator.annual]:  { plan: "creator" as const, minutes: 300, type: "subscription" as const },
  // Agence → plan agency (1500 min/mois = 25h)
  [STRIPE_PRICES.agency.monthly]: { plan: "agency" as const, minutes: 1500, type: "subscription" as const },
  [STRIPE_PRICES.agency.annual]:  { plan: "agency" as const, minutes: 1500, type: "subscription" as const },
} as const;

/**
 * Tous les Price IDs valides (pour validation)
 */
export const ALL_PRICE_IDS = [
  ...Object.values(STRIPE_PRICES.starter),
  ...Object.values(STRIPE_PRICES.creatorRecharge),
  ...Object.values(STRIPE_PRICES.agencyRecharge),
  ...Object.values(STRIPE_PRICES.creator),
  ...Object.values(STRIPE_PRICES.agency),
] as const;

/**
 * Grilles de recharge par plan — utilisées par le frontend
 * pour afficher les bonnes minutes selon le plan actif
 */
export const RECHARGE_GRIDS = {
  free: [
    { amount: 5,  priceId: STRIPE_PRICES.starter.recharge5,  minutes: 33  },
    { amount: 10, priceId: STRIPE_PRICES.starter.recharge10, minutes: 66  },
    { amount: 20, priceId: STRIPE_PRICES.starter.recharge20, minutes: 133 },
    { amount: 50, priceId: STRIPE_PRICES.starter.recharge50, minutes: 333 },
  ],
  starter: [
    { amount: 5,  priceId: STRIPE_PRICES.starter.recharge5,  minutes: 33  },
    { amount: 10, priceId: STRIPE_PRICES.starter.recharge10, minutes: 66  },
    { amount: 20, priceId: STRIPE_PRICES.starter.recharge20, minutes: 133 },
    { amount: 50, priceId: STRIPE_PRICES.starter.recharge50, minutes: 333 },
  ],
  creator: [
    { amount: 5,  priceId: STRIPE_PRICES.creatorRecharge.recharge5,  minutes: 42  },
    { amount: 10, priceId: STRIPE_PRICES.creatorRecharge.recharge10, minutes: 83  },
    { amount: 20, priceId: STRIPE_PRICES.creatorRecharge.recharge20, minutes: 167 },
    { amount: 50, priceId: STRIPE_PRICES.creatorRecharge.recharge50, minutes: 417 },
  ],
  agency: [
    { amount: 5,  priceId: STRIPE_PRICES.agencyRecharge.recharge5,  minutes: 63  },
    { amount: 10, priceId: STRIPE_PRICES.agencyRecharge.recharge10, minutes: 125 },
    { amount: 20, priceId: STRIPE_PRICES.agencyRecharge.recharge20, minutes: 250 },
    { amount: 50, priceId: STRIPE_PRICES.agencyRecharge.recharge50, minutes: 625 },
  ],
} as const;

export type PlanType = "free" | "starter" | "creator" | "agency";
