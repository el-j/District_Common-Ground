import { describe, it, expect } from 'vitest';
import {
  computeResilienceScore, getBuildBuffState, applyDailyTick, resilienceTier, settleDay, DEFAULT_MULTIPLIERS,
  BASE_RESILIENCE, STARVING, BREAKDOWN, ROUGH_SLEEPING, HIGH_STRESS, type DayInput, type LedgerLine,
} from './EconomyMath';
import { getSeasonalMultipliers } from './SeasonalWave';

describe('computeResilienceScore', () => {
  const none = { kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0, resilienceModifier: 0 };
  const all = { kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100, toolLibraryProgress: 100, landTrustProgress: 100, resilienceModifier: 0 };

  it('starts at the base score with nothing built (a fresh game is in "crisis", not "emergency")', () => {
    expect(computeResilienceScore(none)).toBe(BASE_RESILIENCE);
  });

  it('reaches 100 when all five nodes are built', () => {
    expect(computeResilienceScore(all)).toBe(100);
  });

  it('never drops below the base when the first contribution lands (audit §1.4 #2)', () => {
    expect(computeResilienceScore({ ...none, kitchenProgress: 1 })).toBeGreaterThanOrEqual(BASE_RESILIENCE);
  });

  it('counts every build node, not only the first three', () => {
    expect(computeResilienceScore({ ...none, landTrustProgress: 100 })).toBeGreaterThan(BASE_RESILIENCE);
    expect(computeResilienceScore({ ...none, toolLibraryProgress: 100 })).toBeGreaterThan(BASE_RESILIENCE);
  });

  it('adds the persisted modifier from crises, votes and minigames on top of build progress', () => {
    expect(computeResilienceScore({ ...none, resilienceModifier: 10 })).toBe(BASE_RESILIENCE + 10);
    expect(computeResilienceScore({ ...none, kitchenProgress: 50, resilienceModifier: -5 }))
      .toBe(computeResilienceScore({ ...none, kitchenProgress: 50 }) - 5);
  });

  it('clamps to 0..100', () => {
    expect(computeResilienceScore({ ...none, resilienceModifier: -500 })).toBe(0);
    expect(computeResilienceScore({ ...all, resilienceModifier: 500 })).toBe(100);
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
    // pip regen 35, upkeep reduced to 8 (was 10) → energyDelta = +27
    expect(result.energyDelta).toBe(27);
  });

  it('energy upkeep 10 without tool library', () => {
    const result = applyDailyTick('pip', baseCommons, 0);
    // pip regen 35, upkeep 10 → energyDelta = +25
    expect(result.energyDelta).toBe(25);
  });

  // M24 Test 24.1 — energy upkeep now scales with multipliers.energy
  // (previously a documented no-op — see BalanceSimulator.ts).
  it('energy multiplier 1.75 increases upkeep and costs more energy than default', () => {
    const defaultResult = applyDailyTick('pip', baseCommons, 0);
    const multipliers = { food: 1.0, energy: 1.75, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0 };
    const inflatedResult = applyDailyTick('pip', baseCommons, 0, multipliers);
    // upkeep 10 * 1.75 = 17.5 → round 18; regen 35 → energyDelta = 17
    expect(inflatedResult.energyDelta).toBe(17);
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

    it('morgan regenerates energy at the commuter rate (30/day), distinct from pip', () => {
      const result = applyDailyTick('morgan', baseCommons, 0);
      expect(result.energyDelta).toBe(20); // regen 30 - upkeep 10 (no more energy death spiral)
    });

    it('arthur earns a flat 12 regardless of wage or transit multipliers', () => {
      const baseline = applyDailyTick('arthur', baseCommons, 0);
      const extreme = applyDailyTick('arthur', baseCommons, 0, { ...DEFAULT_MULTIPLIERS, wage: 5, transit: 5 });
      expect(baseline.cashDelta).toBe(9); // 12 - 3 foodCost
      expect(extreme.cashDelta).toBe(baseline.cashDelta); // genuinely unaffected, not coincidentally equal
    });

    it('arthur regenerates energy at the landlord rate (30/day)', () => {
      const result = applyDailyTick('arthur', baseCommons, 0);
      expect(result.energyDelta).toBe(20); // regen 30 - upkeep 10
    });

    it('a null classRole (pre-character-select) falls back to 28 regen and 0 earning', () => {
      const result = applyDailyTick(null, baseCommons, 0);
      expect(result.energyDelta).toBe(18); // regen 28 - upkeep 10
      expect(result.cashDelta).toBe(-3); // earning 0 - foodCost 3
    });

    it('an unrecognized classRole string also falls back to the 28-regen/0-earning default', () => {
      const result = applyDailyTick('not-a-real-archetype', baseCommons, 0);
      expect(result.energyDelta).toBe(18);
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

describe('settleDay (D2: starving and breakdown)', () => {
  const commons = { kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0 };
  const base: DayInput = {
    classRole: 'pip', cash: 100, energy: 50, maxEnergy: 100, stress: 40, trust: 0,
    starvingDays: 0, commons, multipliers: DEFAULT_MULTIPLIERS,
    housing: { cashDelta: 0, energyDelta: 0, stressDelta: 0 }, furnitureCount: 0,
  };

  it('a normal day applies the tick and advances one day', () => {
    const out = settleDay(base);
    const tick = applyDailyTick('pip', commons, 0);
    expect(out.cash).toBe(100 + tick.cashDelta);
    expect(out.energy).toBe(50 + tick.energyDelta);
    expect(out.stress).toBe(40 + tick.stressDelta);
    expect(out.daysElapsed).toBe(1);
    expect(out.starving).toBe(false);
    expect(out.breakdown).toBe(false);
  });

  it('unpaid rent and food are not forgiven: the player starves and stress rises', () => {
    const rent = { cashDelta: -18, energyDelta: 0, stressDelta: 0 };
    const out = settleDay({ ...base, cash: 0, housing: rent });
    const fed = settleDay({ ...base, cash: 1000, housing: rent });
    expect(out.starving).toBe(true);
    expect(out.cash).toBe(0);
    expect(out.unpaid).toBeGreaterThan(0);
    expect(out.starvingDays).toBe(1);
    expect(out.stress).toBe(fed.stress + STARVING.stressPerDay);
    expect(out.energy).toBe(fed.energy - STARVING.regenPenalty);
  });

  it('starving stress grows the longer it lasts', () => {
    const rent = { cashDelta: -18, energyDelta: 0, stressDelta: 0 };
    const day1 = settleDay({ ...base, cash: 0, housing: rent, starvingDays: 0 });
    const day4 = settleDay({ ...base, cash: 0, housing: rent, starvingDays: 3 });
    expect(day4.stress).toBeGreaterThan(day1.stress);
  });

  it('eating again resets the starving counter', () => {
    expect(settleDay({ ...base, cash: 500, starvingDays: 4 }).starvingDays).toBe(0);
  });

  it('sleeping rough (no home) costs energy and adds stress', () => {
    const housed = settleDay(base);
    const rough = settleDay({ ...base, housing: null });
    expect(rough.energy).toBe(housed.energy - ROUGH_SLEEPING.regenPenalty);
    expect(rough.stress).toBe(housed.stress + ROUGH_SLEEPING.stressPerDay);
  });

  it('high stress makes sleep restless (less energy back)', () => {
    const calm = settleDay({ ...base, stress: HIGH_STRESS.threshold - 20 });
    const tense = settleDay({ ...base, stress: HIGH_STRESS.threshold });
    expect(tense.energy).toBe(calm.energy - HIGH_STRESS.regenPenalty);
  });

  it('furniture in a rented home relieves stress, up to a cap', () => {
    const bare = settleDay(base);
    const cosy = settleDay({ ...base, furnitureCount: 1 });
    const packed = settleDay({ ...base, furnitureCount: 50 });
    expect(cosy.stress).toBe(bare.stress - 1);
    expect(packed.stress).toBe(bare.stress - 3);
    expect(settleDay({ ...base, housing: null, furnitureCount: 3 }).stress)
      .toBe(settleDay({ ...base, housing: null }).stress);
  });

  it('reaching 100% stress causes a breakdown: a lost day, stress and energy reset, trust hit', () => {
    const out = settleDay({ ...base, stress: 99 });
    expect(out.breakdown).toBe(true);
    expect(out.daysElapsed).toBe(2);
    expect(out.stress).toBe(BREAKDOWN.stressAfter);
    expect(out.energy).toBeGreaterThanOrEqual(BREAKDOWN.minEnergyAfter);
    expect(out.trustDelta).toBe(-BREAKDOWN.trustLoss);
  });

  it('ending the day already at 100% stress is a breakdown even if tonight would relieve some', () => {
    const relief = { cashDelta: 0, energyDelta: 0, stressDelta: -20 };
    expect(settleDay({ ...base, stress: 100, housing: relief }).breakdown).toBe(true);
  });

  it('bills still come due on the lost day of a breakdown', () => {
    const normal = settleDay({ ...base, stress: 10 });
    const broke = settleDay({ ...base, stress: 99 });
    const perDay = normal.cash - base.cash;
    expect(broke.cash).toBe(base.cash + 2 * perDay);
  });

  it('keeps every stat inside its bounds', () => {
    const out = settleDay({ ...base, cash: 0, energy: 0, stress: 0, housing: null });
    expect(out.cash).toBeGreaterThanOrEqual(0);
    expect(out.energy).toBeGreaterThanOrEqual(0);
    expect(out.energy).toBeLessThanOrEqual(100);
    expect(out.stress).toBeGreaterThanOrEqual(0);
  });
});

describe('the morning ledger explains every overnight change', () => {
  const sum = (lines: LedgerLine[], k: 'cash' | 'energy' | 'stress') => lines.reduce((s, l) => s + (l[k] ?? 0), 0);
  const noneBuilt = { kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0 };
  const allBuilt = { kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100, toolLibraryProgress: 100 };
  const flat = { cashDelta: -9, energyDelta: 4, stressDelta: -2 };

  it.each([
    ['pip', noneBuilt, 0, undefined],
    ['morgan', noneBuilt, 45, flat],
    ['arthur', allBuilt, 100, flat],
    [null, allBuilt, 10, undefined],
  ] as const)('the tick lines of %s add up to the tick itself', (role, commons, trust, housing) => {
    const tick = applyDailyTick(role, commons, trust, { ...DEFAULT_MULTIPLIERS, food: 1.4, energy: 1.3, wage: 0.8, transit: 1.5 }, housing);
    expect(sum(tick.lines, 'cash')).toBe(tick.cashDelta);
    expect(sum(tick.lines, 'energy')).toBe(tick.energyDelta);
    expect(sum(tick.lines, 'stress')).toBe(tick.stressDelta);
  });

  it('names the sources a player cares about', () => {
    const labels = applyDailyTick('pip', noneBuilt, 40, DEFAULT_MULTIPLIERS, flat).lines.map(l => l.label).join(' | ');
    expect(labels).toMatch(/gig/i);
    expect(labels).toMatch(/groceries/i);
    expect(labels).toMatch(/rest/i);
    expect(labels).toMatch(/flat/i);
    expect(labels).toMatch(/trust/i);
  });

  it('shows a built kitchen as free food rather than hiding the line', () => {
    const food = applyDailyTick('pip', allBuilt, 0).lines.find(l => /kitchen/i.test(l.label) && l.note);
    expect(food?.note).toMatch(/free/i);
    expect(food?.cash).toBeUndefined();
  });

  it('never lists a line that changes nothing and has no note', () => {
    const lines = applyDailyTick('pip', noneBuilt, 0).lines;
    for (const l of lines) expect(Boolean(l.cash || l.energy || l.stress || l.note)).toBe(true);
  });

  const day: DayInput = {
    classRole: 'pip', cash: 100, energy: 40, maxEnergy: 100, stress: 40, trust: 20,
    starvingDays: 0, commons: noneBuilt, multipliers: DEFAULT_MULTIPLIERS,
    housing: flat, furnitureCount: 2,
  };

  it('a settled day\'s lines add up to the real change when nothing is clamped', () => {
    const out = settleDay(day);
    expect(sum(out.lines, 'cash')).toBe(out.cash - day.cash);
    expect(sum(out.lines, 'energy')).toBe(out.energy - day.energy);
    expect(sum(out.lines, 'stress')).toBe(out.stress - day.stress);
    expect(out.lines.map(l => l.label).join(' ')).toMatch(/home/i);
  });

  it('rough sleeping, restless sleep and hunger each get their own line', () => {
    // No archetype income, so groceries can't be covered.
    const out = settleDay({ ...day, classRole: null, cash: 0, housing: null, stress: HIGH_STRESS.threshold });
    const labels = out.lines.map(l => l.label).join(' | ');
    expect(labels).toMatch(/slept rough/i);
    expect(labels).toMatch(/restless/i);
    expect(labels).toMatch(/hungry/i);
    expect(sum(out.lines, 'energy')).toBe(out.energy - day.energy);
    expect(sum(out.lines, 'stress')).toBe(out.stress - HIGH_STRESS.threshold);
  });

  it('a breakdown is explained, including the lost day\'s bills', () => {
    const out = settleDay({ ...day, stress: 100 });
    const labels = out.lines.map(l => l.label).join(' | ');
    expect(labels).toMatch(/breakdown/i);
    expect(labels).toMatch(/lost day/i);
    expect(sum(out.lines, 'cash')).toBe(out.cash - day.cash);
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
