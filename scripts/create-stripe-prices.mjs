/**
 * Script de création des Price IDs Stripe pour les recharges préférentielles
 * 
 * Créateur : 0,12€/min
 * Agence   : 0,08€/min
 * 
 * Usage : node scripts/create-stripe-prices.mjs
 */
import Stripe from "stripe";
import { readFileSync } from "fs";

// Lire la clé depuis l'environnement ou le fichier .env
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error("❌ STRIPE_SECRET_KEY non définie dans l'environnement");
  process.exit(1);
}

const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" });

// Grilles de recharge
const RECHARGES = [
  { amount: 500,  label: "5€"  },
  { amount: 1000, label: "10€" },
  { amount: 2000, label: "20€" },
  { amount: 5000, label: "50€" },
];

const PLANS = [
  {
    name: "creator",
    label: "Créateur",
    ratePerMin: 0.12,
    // minutes = montant_euros / tarif_par_minute
    getMinutes: (euros) => Math.round(euros / 0.12),
  },
  {
    name: "agency",
    label: "Agence",
    ratePerMin: 0.08,
    getMinutes: (euros) => Math.round(euros / 0.08),
  },
];

async function createPrices() {
  const results = {};

  for (const plan of PLANS) {
    console.log(`\n📦 Création des produits/prix pour le plan ${plan.label}...`);
    results[plan.name] = {};

    for (const recharge of RECHARGES) {
      const euros = recharge.amount / 100;
      const minutes = plan.getMinutes(euros);
      const productName = `Recharge ${plan.label} ${recharge.label} (${minutes} min)`;

      try {
        // Créer le produit
        const product = await stripe.products.create({
          name: productName,
          description: `Recharge de ${minutes} minutes pour les abonnés ${plan.label} — tarif préférentiel ${plan.ratePerMin}€/min`,
          metadata: {
            plan: plan.name,
            minutes: minutes.toString(),
            type: "recharge",
          },
        });

        // Créer le prix (paiement unique)
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: recharge.amount,
          currency: "eur",
          metadata: {
            plan: plan.name,
            minutes: minutes.toString(),
            type: "one_time",
          },
        });

        results[plan.name][`recharge${recharge.label.replace("€", "")}`] = {
          priceId: price.id,
          productId: product.id,
          minutes,
          amount: euros,
        };

        console.log(`  ✅ ${recharge.label} → ${minutes} min | Price ID: ${price.id}`);
      } catch (err) {
        console.error(`  ❌ Erreur pour ${recharge.label} (${plan.label}):`, err.message);
      }
    }
  }

  console.log("\n\n📋 RÉCAPITULATIF — Copiez ces valeurs dans products.ts :\n");
  console.log("// Recharges Créateur (0,12€/min)");
  for (const [key, val] of Object.entries(results.creator)) {
    console.log(`  ${key}: "${val.priceId}", // ${val.amount}€ = ${val.minutes} min`);
  }
  console.log("\n// Recharges Agence (0,08€/min)");
  for (const [key, val] of Object.entries(results.agency)) {
    console.log(`  ${key}: "${val.priceId}", // ${val.amount}€ = ${val.minutes} min`);
  }

  return results;
}

createPrices().catch(console.error);
