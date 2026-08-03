import { describe, expect, it } from "vitest";
import { STRIPE_PRICES, PRICE_TO_PLAN, ALL_PRICE_IDS, RECHARGE_GRIDS } from "./products";

describe("Stripe Products Configuration", () => {
  it("should have all starter recharge price IDs defined", () => {
    expect(STRIPE_PRICES.starter.recharge5).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge10).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge20).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge50).toBeDefined();
  });

  it("should have all creatorRecharge price IDs defined", () => {
    expect(STRIPE_PRICES.creatorRecharge.recharge5).toBeDefined();
    expect(STRIPE_PRICES.creatorRecharge.recharge10).toBeDefined();
    expect(STRIPE_PRICES.creatorRecharge.recharge20).toBeDefined();
    expect(STRIPE_PRICES.creatorRecharge.recharge50).toBeDefined();
    expect(STRIPE_PRICES.creatorRecharge.recharge5).toMatch(/^price_/);
  });

  it("should have all agencyRecharge price IDs defined", () => {
    expect(STRIPE_PRICES.agencyRecharge.recharge5).toBeDefined();
    expect(STRIPE_PRICES.agencyRecharge.recharge10).toBeDefined();
    expect(STRIPE_PRICES.agencyRecharge.recharge20).toBeDefined();
    expect(STRIPE_PRICES.agencyRecharge.recharge50).toBeDefined();
    expect(STRIPE_PRICES.agencyRecharge.recharge5).toMatch(/^price_/);
  });

  it("should have creator monthly and annual price IDs", () => {
    expect(STRIPE_PRICES.creator.monthly).toBeDefined();
    expect(STRIPE_PRICES.creator.annual).toBeDefined();
    expect(STRIPE_PRICES.creator.monthly).toMatch(/^price_/);
    expect(STRIPE_PRICES.creator.annual).toMatch(/^price_/);
  });

  it("should have agency monthly and annual price IDs", () => {
    expect(STRIPE_PRICES.agency.monthly).toBeDefined();
    expect(STRIPE_PRICES.agency.annual).toBeDefined();
    expect(STRIPE_PRICES.agency.monthly).toMatch(/^price_/);
    expect(STRIPE_PRICES.agency.annual).toMatch(/^price_/);
  });

  it("should map all starter price IDs to correct plans", () => {
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].plan).toBe("starter");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].type).toBe("one_time");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].minutes).toBe(33);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge10].minutes).toBe(66);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge20].minutes).toBe(133);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes).toBe(333);
  });

  it("should map all creatorRecharge price IDs to correct plans", () => {
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge5].plan).toBe("creator");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge5].type).toBe("one_time");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge5].minutes).toBe(42);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge10].minutes).toBe(83);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge20].minutes).toBe(167);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge50].minutes).toBe(417);
  });

  it("should map all agencyRecharge price IDs to correct plans", () => {
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge5].plan).toBe("agency");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge5].type).toBe("one_time");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge5].minutes).toBe(63);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge10].minutes).toBe(125);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge20].minutes).toBe(250);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge50].minutes).toBe(625);
  });

  it("should map subscription plan price IDs correctly", () => {
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].plan).toBe("creator");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].type).toBe("subscription");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].minutes).toBe(300);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.annual].plan).toBe("creator");

    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].plan).toBe("agency");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].type).toBe("subscription");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].minutes).toBe(1500);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.annual].plan).toBe("agency");
  });

  it("ALL_PRICE_IDS should contain all 16 defined prices", () => {
    // Total: 4 starter + 4 creatorRecharge + 4 agencyRecharge + 2 creator + 2 agency = 16
    expect(ALL_PRICE_IDS).toHaveLength(16);

    // Vérifier que les prix clés sont inclus
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.starter.recharge5);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.starter.recharge50);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.creatorRecharge.recharge5);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.creatorRecharge.recharge50);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.agencyRecharge.recharge5);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.agencyRecharge.recharge50);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.creator.monthly);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.creator.annual);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.agency.monthly);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.agency.annual);
  });

  it("should not have duplicate price IDs", () => {
    const uniqueIds = new Set(ALL_PRICE_IDS);
    expect(uniqueIds.size).toBe(ALL_PRICE_IDS.length);
  });

  it("starter recharges should have increasing minutes", () => {
    const r5  = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].minutes;
    const r10 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge10].minutes;
    const r20 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge20].minutes;
    const r50 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes;
    expect(r10).toBeGreaterThan(r5);
    expect(r20).toBeGreaterThan(r10);
    expect(r50).toBeGreaterThan(r20);
  });

  it("preferred recharges should give more minutes than starter for same amount", () => {
    // Créateur (0,12€/min) > Starter (0,15€/min) pour le même montant
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge5].minutes)
      .toBeGreaterThan(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].minutes);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge50].minutes)
      .toBeGreaterThan(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes);

    // Agence (0,08€/min) > Créateur (0,12€/min) pour le même montant
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge5].minutes)
      .toBeGreaterThan(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge5].minutes);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge50].minutes)
      .toBeGreaterThan(PRICE_TO_PLAN[STRIPE_PRICES.creatorRecharge.recharge50].minutes);
  });

  it("RECHARGE_GRIDS should have correct grids for each plan", () => {
    expect(RECHARGE_GRIDS.free).toHaveLength(4);
    expect(RECHARGE_GRIDS.starter).toHaveLength(4);
    expect(RECHARGE_GRIDS.creator).toHaveLength(4);
    expect(RECHARGE_GRIDS.agency).toHaveLength(4);

    // Vérifier que les grilles creator et agency ont des tarifs préférentiels
    expect(RECHARGE_GRIDS.creator[0].minutes).toBeGreaterThan(RECHARGE_GRIDS.starter[0].minutes);
    expect(RECHARGE_GRIDS.agency[0].minutes).toBeGreaterThan(RECHARGE_GRIDS.creator[0].minutes);

    // Vérifier que les Price IDs sont corrects
    expect(RECHARGE_GRIDS.creator[0].priceId).toBe(STRIPE_PRICES.creatorRecharge.recharge5);
    expect(RECHARGE_GRIDS.agency[0].priceId).toBe(STRIPE_PRICES.agencyRecharge.recharge5);
  });

  it("subscription plans should have more minutes than any single recharge", () => {
    const maxAgencyRecharge = PRICE_TO_PLAN[STRIPE_PRICES.agencyRecharge.recharge50].minutes;
    const agencySubscriptionMinutes = PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].minutes;
    // 1500 min/mois > 625 min (recharge 50€ agence)
    expect(agencySubscriptionMinutes).toBeGreaterThan(maxAgencyRecharge);
  });
});
