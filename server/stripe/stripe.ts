/**
 * Stripe SDK instance et helpers
 * 
 * Centralise l'initialisation de Stripe et les fonctions utilitaires
 * pour la création de sessions Checkout et le portail client.
 */
import Stripe from "stripe";
import { ENV } from "../_core/env";

/**
 * Instance Stripe configurée avec la clé secrète
 */
export const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-05-28.basil" as any,
});

interface CreateCheckoutSessionParams {
  priceId: string;
  userId: number;
  userEmail: string;
  userName: string;
  userOpenId: string;
  origin: string;
  mode: "payment" | "subscription";
  stripeCustomerId?: string | null;
}

/**
 * Crée une session Stripe Checkout
 * - Paiement unique pour les recharges Starter
 * - Abonnement pour les plans Créateur et Agence
 */
export async function createCheckoutSession({
  priceId,
  userId,
  userEmail,
  userName,
  userOpenId,
  origin,
  mode,
  stripeCustomerId,
}: CreateCheckoutSessionParams): Promise<string> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment/cancel`,
    client_reference_id: userId.toString(),
    allow_promotion_codes: true,
    metadata: {
      user_id: userId.toString(),
      user_open_id: userOpenId,
      customer_email: userEmail,
      customer_name: userName,
      price_id: priceId,
    },
  };

  // Si l'utilisateur a déjà un Stripe Customer ID, le réutiliser
  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId;
  } else {
    sessionParams.customer_email = userEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Stripe n'a pas retourné d'URL de checkout");
  }

  return session.url;
}

/**
 * Crée une session du portail client Stripe
 * Permet à l'utilisateur de gérer son abonnement (annuler, changer de plan, etc.)
 */
export async function createPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Récupère les détails d'un abonnement Stripe
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Vérifie la signature d'un webhook Stripe
 */
export function constructWebhookEvent(
  payload: Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    ENV.stripeWebhookSecret
  );
}
