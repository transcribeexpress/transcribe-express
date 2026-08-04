/**
 * Webhook Stripe — Traitement des événements
 * 
 * Gère les événements Stripe suivants :
 * - checkout.session.completed : paiement réussi (recharge ou abonnement)
 * - customer.subscription.updated : changement de statut d'abonnement
 * - customer.subscription.deleted : annulation d'abonnement
 * - invoice.payment_failed : échec de paiement
 */
import type { Request, Response } from "express";
import Stripe from "stripe";
import { constructWebhookEvent } from "./stripe";
import { PRICE_TO_PLAN } from "./products";
import { getDb, insertRechargeHistory } from "../db";
import { users, subscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handler du webhook Stripe
 * IMPORTANT : doit être enregistré avec express.raw({ type: 'application/json' })
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(req.body, signature as string);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Test events — retourner immédiatement pour la vérification
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event received: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err.message);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}

/**
 * checkout.session.completed
 * - Recharge Starter : ajouter les minutes au compte
 * - Abonnement : créer/mettre à jour l'abonnement et changer le plan
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const userOpenId = session.metadata?.user_open_id;

  if (!userId) {
    console.error("[Stripe Webhook] checkout.session.completed sans user_id dans metadata");
    return;
  }

  const numericUserId = parseInt(userId, 10);
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database not available");
    return;
  }

  // Sauvegarder le Stripe Customer ID sur l'utilisateur
  if (session.customer) {
    await db
      .update(users)
      .set({ stripeCustomerId: session.customer as string })
      .where(eq(users.id, numericUserId));
  }

  if (session.mode === "payment") {
    // Paiement unique = recharge Starter
    // Récupérer le Price ID depuis les line_items (nécessite expand)
    // On utilise le metadata pour identifier le prix
    const lineItems = session.line_items?.data;
    let priceId: string | undefined;

    if (lineItems && lineItems.length > 0) {
      priceId = lineItems[0].price?.id;
    }

    // Fallback : chercher dans les metadata si disponible
    if (!priceId && session.metadata?.price_id) {
      priceId = session.metadata.price_id;
    }

    if (priceId && priceId in PRICE_TO_PLAN) {
      const planInfo = PRICE_TO_PLAN[priceId as keyof typeof PRICE_TO_PLAN];
      if (planInfo.type === "one_time") {
        // Ajouter les minutes au compte de l'utilisateur
        // Conserver le plan actuel de l'utilisateur (ne pas rétrograder un Créateur/Agence vers Starter)
        const [user] = await db
          .select({ creditsMinutes: users.creditsMinutes, plan: users.plan })
          .from(users)
          .where(eq(users.id, numericUserId));

        if (user) {
          // Conserver le plan actuel si c'est creator ou agency, sinon passer à starter
          const newPlan = (user.plan === "creator" || user.plan === "agency")
            ? user.plan
            : "starter";

          await db
            .update(users)
            .set({
              plan: newPlan,
              creditsMinutes: user.creditsMinutes + planInfo.minutes,
            })
            .where(eq(users.id, numericUserId));
        }

        console.log(`[Stripe Webhook] Recharge ${planInfo.minutes} min pour user ${userId} (plan: ${planInfo.plan})`);

        // Persister dans l'historique des recharges
        await insertRechargeHistory({
          userId: numericUserId,
          stripePaymentIntentId: session.payment_intent as string | null,
          stripeSessionId: session.id,
          amountCents: session.amount_total ?? 0,
          currency: (session.currency ?? "eur").toLowerCase(),
          minutesAdded: planInfo.minutes,
          priceId: priceId,
          planAtPurchase: user?.plan ?? "starter",
          status: "completed",
        });
      }
    }
  } else if (session.mode === "subscription") {
    // Abonnement = Créateur ou Agence
    const subscriptionId = session.subscription as string;

    if (subscriptionId) {
      // Récupérer les détails de l'abonnement pour le Price ID
      const { getSubscriptionDetails } = await import("./stripe");
      const sub = await getSubscriptionDetails(subscriptionId);
      const subItem = sub.items.data[0];
      const priceId = subItem?.price?.id;

      // Dans Stripe v22 (basil), current_period est sur les items
      const periodStart = subItem?.current_period_start;
      const periodEnd = subItem?.current_period_end;

      if (priceId && priceId in PRICE_TO_PLAN) {
        const planInfo = PRICE_TO_PLAN[priceId as keyof typeof PRICE_TO_PLAN];

        // Mettre à jour le plan de l'utilisateur
        await db
          .update(users)
          .set({
            plan: planInfo.plan,
            creditsMinutes: planInfo.minutes,
          })
          .where(eq(users.id, numericUserId));

        // Créer ou mettre à jour l'abonnement en BDD
        const existingSub = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, numericUserId))
          .limit(1);

        if (existingSub.length > 0) {
          await db
            .update(subscriptions)
            .set({
              stripeSubscriptionId: subscriptionId,
              stripePriceId: priceId,
              status: "active",
              currentPeriodStart: periodStart
                ? new Date(periodStart * 1000)
                : null,
              currentPeriodEnd: periodEnd
                ? new Date(periodEnd * 1000)
                : null,
            })
            .where(eq(subscriptions.userId, numericUserId));
        } else {
          await db.insert(subscriptions).values({
            userId: numericUserId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            status: "active",
            currentPeriodStart: periodStart
              ? new Date(periodStart * 1000)
              : null,
            currentPeriodEnd: periodEnd
              ? new Date(periodEnd * 1000)
              : null,
          });
        }

        console.log(`[Stripe Webhook] Abonnement ${planInfo.plan} activé pour user ${userId}`);
      }
    }
  }
}

/**
 * customer.subscription.updated
 * Met à jour le statut de l'abonnement en BDD
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const subRecord = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (subRecord.length === 0) return;

  const priceId = subscription.items.data[0]?.price?.id;

  // Dans Stripe v22 (basil), current_period_start/end sont sur les items, pas sur la subscription
  const item = subscription.items.data[0];
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;

  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      stripePriceId: priceId || subRecord[0].stripePriceId,
      currentPeriodStart: periodStart
        ? new Date(periodStart * 1000)
        : null,
      currentPeriodEnd: periodEnd
        ? new Date(periodEnd * 1000)
        : null,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Si l'abonnement est annulé ou expiré, rétrograder le plan
  if (subscription.status === "canceled" || subscription.status === "unpaid") {
    await db
      .update(users)
      .set({ plan: "free", creditsMinutes: 0 })
      .where(eq(users.id, subRecord[0].userId));

    console.log(`[Stripe Webhook] Abonnement annulé pour user ${subRecord[0].userId}`);
  }

  // Si l'abonnement est réactivé, mettre à jour le plan
  if (subscription.status === "active" && priceId && priceId in PRICE_TO_PLAN) {
    const planInfo = PRICE_TO_PLAN[priceId as keyof typeof PRICE_TO_PLAN];
    await db
      .update(users)
      .set({
        plan: planInfo.plan,
        creditsMinutes: planInfo.minutes,
      })
      .where(eq(users.id, subRecord[0].userId));
  }
}

/**
 * customer.subscription.deleted
 * L'abonnement est définitivement supprimé — rétrograder vers free
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const subRecord = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (subRecord.length === 0) return;

  // Marquer l'abonnement comme annulé
  await db
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

  // Rétrograder l'utilisateur vers le plan gratuit
  await db
    .update(users)
    .set({ plan: "free", creditsMinutes: 0 })
    .where(eq(users.id, subRecord[0].userId));

  console.log(`[Stripe Webhook] Abonnement supprimé pour user ${subRecord[0].userId}`);
}

/**
 * invoice.payment_failed
 * Le paiement de la facture a échoué — mettre l'abonnement en past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Dans Stripe v22 (basil), subscription est dans invoice.parent.subscription_details
  const subscriptionId = (invoice.parent?.subscription_details?.subscription as string) || null;

  if (!subscriptionId) return;

  const db = await getDb();
  if (!db) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  console.log(`[Stripe Webhook] Paiement échoué pour abonnement ${subscriptionId}`);
}
