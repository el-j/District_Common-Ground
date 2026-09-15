import { describe, it, expect } from 'vitest';
import {
  runSolvencySweep,
  UNBUILT_COMMONS,
  FULLY_BUILT_COMMONS,
  PERMANENT_INFLATION_MULTIPLIERS,
  ALGORITHM_PAY_SLASH_MULTIPLIERS,
} from './BalanceSimulator';
import { DEFAULT_MULTIPLIERS } from './EconomyMath';
import { ARCHETYPE_SEEDS } from '../state/actions';

const seedFor = (role: 'pip' | 'morgan' | 'arthur') => {
  const s = ARCHETYPE_SEEDS[role];
  return { cash: s.cash, energy: s.energy, maxEnergy: s.maxEnergy, stress: s.stressLevel, socialTrust: s.socialTrust };
};

// Test 13.1 — baseline 90-day solvency, unbuilt commons (worst case: nobody
// ever contributes to the commons). These are the *real* deterministic
// outputs of applyDailyTick(), recorded as the new regression baseline —
// see EPIC-13's grounded diagnosis for why the planning doc's illustrative
// Day 30/60/90 dollar targets don't hold as literal assertions here.
describe('runSolvencySweep — Test 13.1 baseline solvency (unbuilt commons)', () => {
  it('Pip: energy caps out fast, cash grows linearly, stress saturates at 100', () => {
    const snaps = runSolvencySweep('pip', 90, seedFor('pip'));
    expect(snaps[3]!.energy).toBe(100); // regen 15 - upkeep 10 = +5/day from 80, caps day 4
    expect(snaps[89]!.energy).toBe(100);
    expect(snaps[29]!.cash).toBe(25 + 2 * 30); // cashDelta = earning(5) - foodCost(3) = +2/day
    expect(snaps[89]!.cash).toBe(25 + 2 * 90);
    expect(snaps[13]!.stress).toBe(100); // stressDelta = 5 - trustRelief(2) = +3/day from 60, caps day 14
    expect(snaps[89]!.stress).toBe(100);
  });

  it('Morgan: energy craters to 0 quickly even though cash keeps growing', () => {
    const snaps = runSolvencySweep('morgan', 90, seedFor('morgan'));
    expect(snaps[7]!.energy).toBe(0); // regen 5 - upkeep 10 = -5/day from 40, hits 0 day 8
    expect(snaps[89]!.energy).toBe(0);
    expect(snaps[89]!.cash).toBe(240 + 3 * 90); // cashDelta = earning(8-2) - foodCost(3) = +3/day
    expect(snaps[13]!.stress).toBe(100); // stressDelta = 5 - trustRelief(1) = +4/day from 45, caps day ~14
  });

  it('Arthur: energy stays flat, cash grows fastest, stress still saturates', () => {
    const snaps = runSolvencySweep('arthur', 90, seedFor('arthur'));
    expect(snaps[0]!.energy).toBe(65); // regen 10 - upkeep 10 = 0/day, never moves
    expect(snaps[89]!.energy).toBe(65);
    expect(snaps[89]!.cash).toBe(1200 + 9 * 90); // cashDelta = earning(12) - foodCost(3) = +9/day
    expect(snaps[13]!.stress).toBe(100); // stressDelta = 5 - trustRelief(0) = +5/day from 30, hits 100 exactly day 14
  });

  it('Fully-built commons removes all three stress bonuses, flattening stress growth', () => {
    const snaps = runSolvencySweep('arthur', 30, seedFor('arthur'), FULLY_BUILT_COMMONS);
    // stressDelta = 5 - solar(5) - legal(4) - kitchen(3) - trustRelief(0) = -7/day, floored at 0
    expect(snaps[0]!.stress).toBe(23);
    expect(snaps[29]!.stress).toBe(0);
  });
});

// Test 13.2 — "Permanent Inflation" run. Grounding finding: at the formulas'
// actual magnitudes, food x1.5 alone never pushes any archetype's cashDelta
// negative at baseline wage/transit — the planning doc's literal "bankruptcy
// by Day 18" framing doesn't hold against the real math. What *does* hold,
// exactly as the spec's narrative claims, is the protective mechanism: a
// built Kitchen makes foodCost 0 regardless of the multiplier, so a fully
// buffed archetype's cash trajectory is completely invariant to this run.
describe('runSolvencySweep — Test 13.2 Permanent Inflation', () => {
  it('inflation never helps and never bankrupts any archetype from baseline stats alone', () => {
    for (const role of ['pip', 'morgan', 'arthur'] as const) {
      const baseline = runSolvencySweep(role, 30, seedFor(role), UNBUILT_COMMONS, DEFAULT_MULTIPLIERS);
      const inflated = runSolvencySweep(role, 30, seedFor(role), UNBUILT_COMMONS, PERMANENT_INFLATION_MULTIPLIERS);
      expect(inflated[29]!.cash).toBeLessThanOrEqual(baseline[29]!.cash);
      expect(inflated[29]!.cash).toBeGreaterThan(0); // no archetype actually goes bankrupt at these magnitudes
    }
  });

  it('a built Kitchen makes cash fully immune to the food multiplier', () => {
    for (const role of ['pip', 'morgan', 'arthur'] as const) {
      const noInflation = runSolvencySweep(role, 30, seedFor(role), FULLY_BUILT_COMMONS, DEFAULT_MULTIPLIERS);
      const inflated = runSolvencySweep(role, 30, seedFor(role), FULLY_BUILT_COMMONS, PERMANENT_INFLATION_MULTIPLIERS);
      expect(inflated[29]!.cash).toBe(noInflation[29]!.cash);
    }
  });
});

// Test 13.3 — "Algorithm Pay Slash" run: wage x0.7. Only Pip's earning
// formula reads multipliers.wage; Morgan (transit) and Arthur (flat rent
// income) are structurally unaffected — the multiplier is a genuine no-op
// for them, not a bug.
describe('runSolvencySweep — Test 13.3 Algorithm Pay Slash', () => {
  it("collapses Pip's cash trajectory relative to baseline", () => {
    const baseline = runSolvencySweep('pip', 30, seedFor('pip'), UNBUILT_COMMONS, DEFAULT_MULTIPLIERS);
    const slashed = runSolvencySweep('pip', 30, seedFor('pip'), UNBUILT_COMMONS, ALGORITHM_PAY_SLASH_MULTIPLIERS);
    // earning drops from round(5*1.0)=5 to round(5*0.7)=4 -> cashDelta 2/day -> 1/day
    expect(slashed[29]!.cash).toBe(25 + 1 * 30);
    expect(baseline[29]!.cash).toBe(25 + 2 * 30);
    expect(slashed[29]!.cash).toBeLessThan(baseline[29]!.cash);
  });

  it('leaves Morgan and Arthur completely unaffected', () => {
    for (const role of ['morgan', 'arthur'] as const) {
      const baseline = runSolvencySweep(role, 30, seedFor(role), UNBUILT_COMMONS, DEFAULT_MULTIPLIERS);
      const slashed = runSolvencySweep(role, 30, seedFor(role), UNBUILT_COMMONS, ALGORITHM_PAY_SLASH_MULTIPLIERS);
      expect(slashed).toEqual(baseline);
    }
  });
});
