import { describe, it, expect } from 'vitest';
import { computeResilienceScore, getBuildBuffState, applyDailyTick, resilienceTier } from './EconomyMath';
import { getSeasonalMultipliers } from './SeasonalWave';

describe('computeResilienceScore', () => {
  it('returns 0 when all progress is 0', () => {
    expect(computeResilienceScore({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0 })).toBe(0);
  });

  it('returns 100 when all progress is 100', () => {
    expect(computeResilienceScore({ kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 })).toBe(100);
  });

  it('clamps to 0 for negative values', () => {
    expect(computeResilienceScore({ kitchenProgress: -10, solarGridProgress: 0, legalFundProgress: 0 })).toBe(0);
  });

  it('clamps to 100 for values exceeding 100', () => {
    expect(computeResilienceScore({ kitchenProgress: 200, solarGridProgress: 200, legalFundProgress: 200 })).toBe(100);
  });
});

describe('getBuildBuffState', () => {
  it('returns zero buffs when nothing is built', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0 });
    expect(buf.kitchen).toBe(0);
    expect(buf.solar).toBe(0);
    expect(buf.legal).toBe(0);
  });

  it('returns kitchen buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 100, solarGridProgress: 0, legalFundProgress: 0 });
    expect(buf.kitchen).toBe(12);
    expect(buf.solar).toBe(0);
    expect(buf.legal).toBe(0);
  });

  it('returns solar buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 100, legalFundProgress: 0 });
    expect(buf.solar).toBe(10);
  });

  it('returns legal buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 100 });
    expect(buf.legal).toBe(8);
  });

  it('returns all buffs when fully built', () => {
    const buf = getBuildBuffState({ kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 });
    expect(buf.kitchen).toBe(12);
    expect(buf.solar).toBe(10);
    expect(buf.legal).toBe(8);
  });
});

describe('applyDailyTick', () => {
  const baseCommons = { kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0 };

  it('pip earns positive cash on neutral day', () => {
    const result = applyDailyTick('pip', baseCommons, 0);
    // pip earns 5 wage, food cost 3 → cashDelta = +2
    expect(result.cashDelta).toBe(2);
  });

  it('kitchen built + food multiplier 1.3 → food upkeep = 0', () => {
    const commons = { ...baseCommons, kitchenProgress: 100 };
    const multipliers = { food: 1.3, energy: 1.0, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0 };
    const result = applyDailyTick('pip', commons, 0, multipliers);
    // kitchen built → foodCost = 0 regardless of multiplier
    // pip earns 5 → cashDelta = +5
    expect(result.cashDelta).toBe(5);
  });

  it('food multiplier 1.3 without kitchen increases food cost', () => {
    const multipliers = { food: 1.3, energy: 1.0, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0 };
    const result = applyDailyTick('pip', baseCommons, 0, multipliers);
    // baseFoodCost 3 * 1.3 = 3.9 → Math.round = 4
    // pip earns 5 → cashDelta = +1
    expect(result.cashDelta).toBe(1);
  });

  it('tool library built reduces energy upkeep', () => {
    const commons = { ...baseCommons, toolLibraryProgress: 100 };
    const result = applyDailyTick('pip', commons, 0);
    // pip regen 15, upkeep reduced to 8 (was 10) → energyDelta = +7
    expect(result.energyDelta).toBe(7);
  });

  it('energy upkeep 10 without tool library', () => {
    const result = applyDailyTick('pip', baseCommons, 0);
    // pip regen 15, upkeep 10 → energyDelta = +5
    expect(result.energyDelta).toBe(5);
  });

  // M24 Test 24.1 — energy upkeep now scales with multipliers.energy
  // (previously a documented no-op — see BalanceSimulator.ts).
  it('energy multiplier 1.75 increases upkeep and costs more energy than default', () => {
    const defaultResult = applyDailyTick('pip', baseCommons, 0);
    const multipliers = { food: 1.0, energy: 1.75, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0 };
    const inflatedResult = applyDailyTick('pip', baseCommons, 0, multipliers);
    // upkeep 10 * 1.75 = 17.5 → round 18; regen 15 → energyDelta = -3
    expect(inflatedResult.energyDelta).toBe(-3);
    expect(inflatedResult.energyDelta).toBeLessThan(defaultResult.energyDelta);
  });

  it('stress decreases with high trust and all commons built', () => {
    const fullCommons = { kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 };
    const result = applyDailyTick('pip', fullCommons, 80);
    // 5 - 5(solar) - 4(legal) - 3(kitchen) - floor(80/20)=4 = 5-16 = -11 (clamped behavior)
    expect(result.stressDelta).toBeLessThan(0);
  });
});

describe('resilienceTier', () => {
  it('returns crisis for score < 30', () => {
    expect(resilienceTier(0)).toBe('crisis');
    expect(resilienceTier(29)).toBe('crisis');
  });
  it('returns stabilising for 30–59', () => {
    expect(resilienceTier(30)).toBe('stabilising');
    expect(resilienceTier(59)).toBe('stabilising');
  });
  it('returns thriving for 60+', () => {
    expect(resilienceTier(60)).toBe('thriving');
    expect(resilienceTier(100)).toBe('thriving');
  });
});

describe('SeasonalWave — peaks', () => {
  it('food peaks in winter (January, month 0)', () => {
    const jan = getSeasonalMultipliers(0);
    expect(jan.food).toBeGreaterThanOrEqual(1.3);
  });

  it('food is near baseline in spring/summer (months 3-6)', () => {
    for (const m of [3, 4, 5, 6]) {
      const mul = getSeasonalMultipliers(m);
      expect(mul.food).toBeLessThan(1.1);
    }
  });

  it('energy peaks in summer (August, month 7)', () => {
    const aug = getSeasonalMultipliers(7);
    expect(aug.energy).toBeGreaterThanOrEqual(1.3);
  });

  it('energy also elevated in winter (January)', () => {
    const jan = getSeasonalMultipliers(0);
    expect(jan.energy).toBeGreaterThan(1.1);
  });

  it('migrant pressure peaks in autumn (October-November)', () => {
    const oct = getSeasonalMultipliers(9);
    const nov = getSeasonalMultipliers(10);
    expect(oct.migrant).toBeGreaterThanOrEqual(1.25);
    expect(nov.migrant).toBeGreaterThanOrEqual(1.28);
  });

  it('wraps negative and over-12 months', () => {
    expect(getSeasonalMultipliers(0)).toEqual(getSeasonalMultipliers(12));
    expect(getSeasonalMultipliers(0)).toEqual(getSeasonalMultipliers(-12));
  });
});
