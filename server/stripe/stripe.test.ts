import { describe, expect, it } from "vitest";
import { STRIPE_PRICES, PRICE_TO_PLAN, ALL_PRICE_IDS } from "./products";

describe("Stripe Products Configuration", () => {
  it("should have all starter recharge price IDs defined", () => {
    expect(STRIPE_PRICES.starter.recharge5).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge10).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge20).toBeDefined();
    expect(STRIPE_PRICES.starter.recharge50).toBeDefined();
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

  it("should map all price IDs to correct plans", () => {
    // Starter recharges
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].plan).toBe("starter");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].type).toBe("one_time");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].minutes).toBe(33);

    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge10].minutes).toBe(66);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge20].minutes).toBe(133);
    expect(PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes).toBe(333);

    // Creator
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].plan).toBe("creator");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].type).toBe("subscription");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].minutes).toBe(300);

    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.annual].plan).toBe("creator");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.creator.annual].type).toBe("subscription");

    // Agency
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].plan).toBe("agency");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].type).toBe("subscription");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].minutes).toBe(1500);

    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.annual].plan).toBe("agency");
    expect(PRICE_TO_PLAN[STRIPE_PRICES.agency.annual].minutes).toBe(1500);
  });

  it("ALL_PRICE_IDS should contain all defined prices", () => {
    // Total: 4 starter + 2 creator + 2 agency = 8
    expect(ALL_PRICE_IDS).toHaveLength(8);

    // Vérifier que chaque prix est inclus
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.starter.recharge5);
    expect(ALL_PRICE_IDS).toContain(STRIPE_PRICES.starter.recharge50);
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
    const r5 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge5].minutes;
    const r10 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge10].minutes;
    const r20 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge20].minutes;
    const r50 = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes;

    expect(r10).toBeGreaterThan(r5);
    expect(r20).toBeGreaterThan(r10);
    expect(r50).toBeGreaterThan(r20);
  });

  it("subscription plans should have more minutes than starter recharges", () => {
    const maxStarter = PRICE_TO_PLAN[STRIPE_PRICES.starter.recharge50].minutes;
    const creatorMinutes = PRICE_TO_PLAN[STRIPE_PRICES.creator.monthly].minutes;
    const agencyMinutes = PRICE_TO_PLAN[STRIPE_PRICES.agency.monthly].minutes;

    // Creator < Agency
    expect(agencyMinutes).toBeGreaterThan(creatorMinutes);
  });
});
