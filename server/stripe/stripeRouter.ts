/**
 * Router tRPC Stripe — Procédures de paiement
 * 
 * Procédures :
 * - stripe.createCheckoutSession : crée une session Checkout Stripe
 * - stripe.createPortalSession : crée une session du portail client Stripe
 * - stripe.getSubscription : récupère l'abonnement actif de l'utilisateur
 * - stripe.getUserPlan : récupère le plan et les crédits de l'utilisateur
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createCheckoutSession, createPortalSession } from "./stripe";
import { ALL_PRICE_IDS, PRICE_TO_PLAN } from "./products";
import { getDb } from "../db";
import { users, subscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const stripeRouter = router({
  /**
   * Crée une session Stripe Checkout
   * Ouvre une page de paiement Stripe pour le produit sélectionné
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        priceId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { priceId } = input;

      // Valider que le Price ID est connu
      if (!ALL_PRICE_IDS.includes(priceId as any)) {
        throw new Error(`Price ID invalide: ${priceId}`);
      }

      // Déterminer le mode (payment pour recharge, subscription pour abonnement)
      const planInfo = PRICE_TO_PLAN[priceId as keyof typeof PRICE_TO_PLAN];
      const mode = planInfo.type === "one_time" ? "payment" : "subscription";

      // Récupérer le Stripe Customer ID de l'utilisateur
      const db = await getDb();
      if (!db) throw new Error("Base de données non disponible");

      const [user] = await db
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, ctx.user.id));

      const origin = ctx.req.headers.origin || "https://transcribeexpress.manus.space";

      const checkoutUrl = await createCheckoutSession({
        priceId,
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "",
        userOpenId: ctx.user.openId,
        origin,
        mode,
        stripeCustomerId: user?.stripeCustomerId,
      });

      return { url: checkoutUrl };
    }),

  /**
   * Crée une session du portail client Stripe
   * Permet de gérer l'abonnement (annuler, changer de plan, etc.)
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Base de données non disponible");

    // Récupérer le Stripe Customer ID
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    if (!user?.stripeCustomerId) {
      throw new Error("Aucun compte Stripe associé. Effectuez d'abord un paiement.");
    }

    const origin = ctx.req.headers.origin || "https://transcribeexpress.manus.space";
    const returnUrl = `${origin}/dashboard`;

    const portalUrl = await createPortalSession(user.stripeCustomerId, returnUrl);

    return { url: portalUrl };
  }),

  /**
   * Récupère l'abonnement actif de l'utilisateur
   */
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub || sub.status === "canceled") {
      return null;
    }

    return {
      id: sub.stripeSubscriptionId,
      priceId: sub.stripePriceId,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }),

  /**
   * Récupère le plan et les crédits de l'utilisateur
   */
  getUserPlan: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return { plan: "free" as const, creditsMinutes: 30, isTrialActive: true, hasStripeAccount: false };
    }

    const [user] = await db
      .select({
        plan: users.plan,
        creditsMinutes: users.creditsMinutes,
        trialExpiresAt: users.trialExpiresAt,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    if (!user) {
      return { plan: "free" as const, creditsMinutes: 30, isTrialActive: true, hasStripeAccount: false };
    }

    const isTrialActive = user.plan === "free" && user.trialExpiresAt
      ? new Date() < new Date(user.trialExpiresAt)
      : user.plan === "free";

    return {
      plan: user.plan,
      creditsMinutes: user.creditsMinutes,
      isTrialActive,
      hasStripeAccount: !!user.stripeCustomerId,
    };
  }),
});
