import { describe, it, expect } from 'vitest';
import {
  planContribution, communityContributionPct, craftEnergyCost, saleMultiplier, clampMinigameGrant,
  CASH_PER_PCT, ENERGY_PER_PCT, DAILY_PLAYER_CONTRIBUTION_CAP_PCT, MINIGAME_LIMITS,
  MAX_PROFIT_PER_ENERGY, isNodeLocked,
} from './EconomyRules';
import { RECIPES, ITEM_DEFINITIONS, sellValueFor, type ItemToken, type Recipe } from './Recipes';
import { MATERIAL_PRICES, type MaterialToken } from './Materials';

describe('planContribution', () => {
  const base = { currentPct: 0, cash: 1000, energy: 100, contributedTodayPct: 0, speedBuff: 0 };

  it('converts whole cash and energy into progress at the published rates', () => {
    const plan = planContribution({ ...base, cash: 50, energy: 10 }, { cash: 50, energy: 10 });
    expect(plan.cashSpent).toBe(50);
    expect(plan.energySpent).toBe(10);
    expect(plan.progressPct).toBeCloseTo(50 / CASH_PER_PCT + 10 / ENERGY_PER_PCT);
  });

  it('never charges more than is needed to reach 100%', () => {
    const plan = planContribution({ ...base, currentPct: 99 }, { cash: 500, energy: 0 });
    expect(plan.progressPct).toBeCloseTo(1);
    expect(plan.cashSpent).toBe(CASH_PER_PCT);
  });

  it('accounts for the construction speed buff when trimming to 100%', () => {
    const plan = planContribution({ ...base, currentPct: 97, speedBuff: 0.5 }, { cash: 500, energy: 0 });
    // 3% remaining at ×1.5 needs only 2% of base contribution
    expect(plan.cashSpent).toBe(2 * CASH_PER_PCT);
    expect(plan.progressPct).toBeCloseTo(3);
  });

  it('caps the player\'s own base contribution per node per day', () => {
    const plan = planContribution(base, { cash: 1000, energy: 0 });
    expect(plan.basePct).toBe(DAILY_PLAYER_CONTRIBUTION_CAP_PCT);
    expect(plan.cashSpent).toBe(DAILY_PLAYER_CONTRIBUTION_CAP_PCT * CASH_PER_PCT);
    expect(plan.cappedByDailyLimit).toBe(true);
  });

  it('counts what was already contributed today toward the cap', () => {
    const plan = planContribution({ ...base, contributedTodayPct: DAILY_PLAYER_CONTRIBUTION_CAP_PCT - 2 }, { cash: 1000, energy: 0 });
    expect(plan.basePct).toBe(2);
  });

  it('spends cash before energy when trimming', () => {
    const plan = planContribution(base, { cash: 1000, energy: 50 });
    expect(plan.energySpent).toBe(0);
  });

  it('floors fractional and negative input to whole non-negative amounts', () => {
    const plan = planContribution(base, { cash: 12.7, energy: -5 });
    expect(plan.cashSpent).toBe(12);
    expect(plan.energySpent).toBe(0);
  });

  it('refuses to spend more than the player holds', () => {
    const plan = planContribution({ ...base, cash: 20, energy: 3 }, { cash: 50, energy: 10 });
    expect(plan.cashSpent).toBeLessThanOrEqual(20);
    expect(plan.energySpent).toBeLessThanOrEqual(3);
  });

  it('does nothing for a completed node', () => {
    const plan = planContribution({ ...base, currentPct: 100 }, { cash: 50, energy: 0 });
    expect(plan.cashSpent).toBe(0);
    expect(plan.progressPct).toBe(0);
  });

  it('never returns progress for money it did not charge (integer rounding)', () => {
    for (let cash = 0; cash <= 40; cash += 1) {
      const plan = planContribution({ ...base, currentPct: 99.5 }, { cash, energy: 0 });
      expect(plan.progressPct).toBeLessThanOrEqual(plan.cashSpent / CASH_PER_PCT + 1e-9);
    }
  });
});

describe('communityContributionPct', () => {
  it('grows with trust', () => {
    expect(communityContributionPct(0, 0)).toBeGreaterThan(0);
    expect(communityContributionPct(80, 0)).toBeGreaterThan(communityContributionPct(20, 0));
  });

  it('is multiplied by the construction speed buff', () => {
    expect(communityContributionPct(40, 0.5)).toBeCloseTo(communityContributionPct(40, 0) * 1.5);
  });
});

// ── Closing the craft → sell loop (audit §1.2) ─────────────────────────────

function materialCost(recipe: Recipe): number {
  return (Object.entries(recipe.inputs) as [MaterialToken, number][])
    .reduce((sum, [m, n]) => sum + MATERIAL_PRICES[m] * n, 0);
}

function producerOf(item: ItemToken): Recipe {
  return Object.values(RECIPES).find(r => r.output === item)!;
}

/** Total material cost and energy for one unit, including crafted inputs. */
function fullChainCost(recipe: Recipe): { cash: number; energy: number } {
  let cash = materialCost(recipe);
  let energy = craftEnergyCost(recipe);
  for (const [item, n] of Object.entries(recipe.itemInputs ?? {}) as [ItemToken, number][]) {
    const sub = fullChainCost(producerOf(item));
    cash += sub.cash * n;
    energy += sub.energy * n;
  }
  return { cash, energy };
}

describe('crafting economy', () => {
  it('every craft costs energy', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(craftEnergyCost(recipe), recipe.id).toBeGreaterThan(0);
    }
  });

  it('no sellable item earns more than MAX_PROFIT_PER_ENERGY, even at max mastery', () => {
    for (const recipe of Object.values(RECIPES)) {
      const def = ITEM_DEFINITIONS[recipe.output];
      if (!def.kinds.includes('sellable')) continue;
      const { cash, energy } = fullChainCost(recipe);
      const profit = sellValueFor(recipe.output, 10) - cash;
      expect(profit / energy, `${recipe.id}: profit ${profit} for ${energy} energy`).toBeLessThanOrEqual(MAX_PROFIT_PER_ENERGY);
    }
  });

  it('crafting the best item is still worth it at high mastery (crafting is a real income source)', () => {
    const bike = RECIPES.RECIPE_UPCYCLED_BIKE;
    expect(sellValueFor('ITEM_UPCYCLED_BIKE', 10)).toBeGreaterThan(fullChainCost(bike).cash);
  });

  it('local demand drops with every unit sold the same day and has a floor', () => {
    expect(saleMultiplier(0)).toBe(1);
    expect(saleMultiplier(1)).toBeLessThan(1);
    expect(saleMultiplier(3)).toBeLessThan(saleMultiplier(1));
    expect(saleMultiplier(100)).toBeGreaterThan(0);
  });
});

// ── Closing the minigame loop (audit §1.3) ─────────────────────────────────

describe('clampMinigameGrant', () => {
  it('caps cash, trust and resilience per run', () => {
    const g = clampMinigameGrant({ cashDelta: 999, trustDelta: 999, resilienceDelta: 999 });
    expect(g.cashDelta).toBe(MINIGAME_LIMITS.maxCash);
    expect(g.trustDelta).toBe(MINIGAME_LIMITS.maxTrust);
    expect(g.resilienceDelta).toBe(MINIGAME_LIMITS.maxResilience);
  });

  it('ignores energy from the plugin (the host charges energy at launch)', () => {
    expect(clampMinigameGrant({ energyDelta: 50 }).energyDelta).toBe(0);
    expect(clampMinigameGrant({ energyDelta: -50 }).energyDelta).toBe(0);
  });

  it('never lets a plugin take resources away', () => {
    const g = clampMinigameGrant({ cashDelta: -40, trustDelta: -10, resilienceDelta: -5 });
    expect(g).toEqual({ cashDelta: 0, trustDelta: 0, energyDelta: 0, resilienceDelta: 0 });
  });

  it('rounds and rejects non-finite values', () => {
    const g = clampMinigameGrant({ cashDelta: 7.6, trustDelta: Number.NaN });
    expect(g.cashDelta).toBe(8);
    expect(g.trustDelta).toBe(0);
  });

  it('a minigame run pays no better per energy than MAX_PROFIT_PER_ENERGY', () => {
    expect(MINIGAME_LIMITS.maxCash / MINIGAME_LIMITS.energyCost).toBeLessThanOrEqual(MAX_PROFIT_PER_ENERGY);
  });
});

describe('isNodeLocked — the Land Trust is the finale', () => {
  const none = { kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0 };
  it('keeps the Land Trust locked until the other four commons are built', () => {
    expect(isNodeLocked('landTrustProgress', none)).toBe(true);
    expect(isNodeLocked('landTrustProgress', { ...none, kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 })).toBe(true);
    expect(isNodeLocked('landTrustProgress', { ...none, kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100, toolLibraryProgress: 100 })).toBe(false);
  });
  it('never locks the other nodes', () => {
    expect(isNodeLocked('kitchenProgress', none)).toBe(false);
    expect(isNodeLocked('toolLibraryProgress', none)).toBe(false);
  });
});
