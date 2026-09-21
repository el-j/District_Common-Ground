import { describe, it, expect } from 'vitest';
import { computeResilienceScore, getBuildBuffState, applyDailyTick, resilienceTier, DEFAULT_MULTIPLIERS } from './EconomyMath';
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

  // M43 §1 — EPIC-34, absorbing EPIC-32's M36 scope.
  it('folds an optional housingModifier into all 3 deltas', () => {
    const withoutHousing = applyDailyTick('pip', baseCommons, 0);
    const withHousing = applyDailyTick('pip', baseCommons, 0, DEFAULT_MULTIPLIERS, { cashDelta: -5, energyDelta: 2, stressDelta: -3 });
    expect(withHousing.cashDelta).toBe(withoutHousing.cashDelta - 5);
    expect(withHousing.energyDelta).toBe(withoutHousing.energyDelta + 2);
    expect(withHousing.stressDelta).toBe(withoutHousing.stressDelta - 3);
  });

  it('is a no-op when housingModifier is omitted (no fixed home stays a real default)', () => {
    const a = applyDailyTick('pip', baseCommons, 0);
    const b = applyDailyTick('pip', baseCommons, 0, DEFAULT_MULTIPLIERS, undefined);
    expect(b).toEqual(a);
  });

  // Closes the mutation-testing gap the 2026-09-20/21 Stryker audit found:
  // every existing test used classRole 'pip' — morgan/arthur's earning
  // branches, the null/unknown-role fallback, and per-bonus stress
  // boundaries had zero direct coverage.
  describe('classRole branches', () => {
    it('morgan earns 8 minus a transit-scaled commute penalty', () => {
      const result = applyDailyTick('morgan', baseCommons, 0);
      // commutePenalty = round(2*1.0) = 2; earning = 8-2 = 6; foodCost 3 -> cashDelta = 3
      expect(result.cashDelta).toBe(3);
    });

    it('morgan\'s commute penalty scales with the transit multiplier', () => {
      const multipliers = { ...DEFAULT_MULTIPLIERS, transit: 2.5 };
      const result = applyDailyTick('morgan', baseCommons, 0, multipliers);
      // commutePenalty = round(2*2.5) = 5; earning = 8-5 = 3; foodCost 3 -> cashDelta = 0
      expect(result.cashDelta).toBe(0);
    });

    it('morgan regenerates energy at the commuter rate (5/day), distinct from pip', () => {
      const result = applyDailyTick('morgan', baseCommons, 0);
      expect(result.energyDelta).toBe(-5); // regen 5 - upkeep 10
    });

    it('arthur earns a flat 12 regardless of wage or transit multipliers', () => {
      const baseline = applyDailyTick('arthur', baseCommons, 0);
      const extreme = applyDailyTick('arthur', baseCommons, 0, { ...DEFAULT_MULTIPLIERS, wage: 5, transit: 5 });
      expect(baseline.cashDelta).toBe(9); // 12 - 3 foodCost
      expect(extreme.cashDelta).toBe(baseline.cashDelta); // genuinely unaffected, not coincidentally equal
    });

    it('arthur regenerates energy at the landlord rate (10/day), netting exactly 0 by default', () => {
      const result = applyDailyTick('arthur', baseCommons, 0);
      expect(result.energyDelta).toBe(0); // regen 10 - upkeep 10
    });

    it('a null classRole (pre-character-select) falls back to 8 regen and 0 earning', () => {
      const result = applyDailyTick(null, baseCommons, 0);
      expect(result.energyDelta).toBe(-2); // regen 8 - upkeep 10
      expect(result.cashDelta).toBe(-3); // earning 0 - foodCost 3
    });

    it('an unrecognized classRole string also falls back to the 8-regen/0-earning default', () => {
      const result = applyDailyTick('not-a-real-archetype', baseCommons, 0);
      expect(result.energyDelta).toBe(-2);
      expect(result.cashDelta).toBe(-3);
    });
  });

  describe('per-bonus stress boundaries (isolated, not just all-built together)', () => {
    it('solar bonus alone reduces stress by exactly 5 once at the 100 threshold, not before', () => {
      const below = applyDailyTick('pip', { ...baseCommons, solarGridProgress: 99 }, 0);
      const at = applyDailyTick('pip', { ...baseCommons, solarGridProgress: 100 }, 0);
      expect(below.stressDelta).toBe(5); // no bonus yet
      expect(at.stressDelta).toBe(0); // 5 - 5(solar)
    });

    it('legal bonus alone reduces stress by exactly 4 once at the 100 threshold, not before', () => {
      const below = applyDailyTick('pip', { ...baseCommons, legalFundProgress: 99 }, 0);
      const at = applyDailyTick('pip', { ...baseCommons, legalFundProgress: 100 }, 0);
      expect(below.stressDelta).toBe(5);
      expect(at.stressDelta).toBe(1); // 5 - 4(legal)
    });

    it('kitchen stress bonus alone reduces stress by exactly 3 once at the 100 threshold, not before', () => {
      const below = applyDailyTick('pip', { ...baseCommons, kitchenProgress: 99 }, 0);
      const at = applyDailyTick('pip', { ...baseCommons, kitchenProgress: 100 }, 0);
      expect(below.stressDelta).toBe(5);
      expect(at.stressDelta).toBe(2); // 5 - 3(kitchen)
    });

    it('trust relief floors socialTrust/20, only stepping down at exact multiples of 20', () => {
      const just_below = applyDailyTick('pip', baseCommons, 19);
      const at = applyDailyTick('pip', baseCommons, 20);
      expect(just_below.stressDelta).toBe(5); // floor(19/20)=0, no relief yet
      expect(at.stressDelta).toBe(4); // floor(20/20)=1 -> 5-1
    });
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
