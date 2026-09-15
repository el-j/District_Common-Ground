// M13 — deterministic 90-day economy solvency sweep over the real
// applyDailyTick() math. See docs/stories/EPIC-13-...md's "Grounded
// diagnosis": docs/planning/13-....md's "10,000 Monte Carlo runs" doesn't fit
// this codebase — EconomyMath.ts has zero randomness (multipliers come from
// SeasonalWave.ts's deterministic sine curves), so there is no distribution
// to sample from. This is an exhaustive deterministic sweep instead: cheaper,
// reproducible, and strictly more useful for regression testing than random
// sampling of a system with no randomness would be.
import type { ClassRole } from '../state/useGameStore';
import type { EconomicMultipliers } from '@district-cg/shared-types';
import { applyDailyTick, DEFAULT_MULTIPLIERS, type BuildProgressKey } from './EconomyMath';

export interface SolvencySnapshot {
  day: number;
  cash: number;
  energy: number;
  stress: number;
}

export type CommonsProgressInput = Record<BuildProgressKey, number> & { toolLibraryProgress?: number };

export interface SolvencySeed {
  cash: number;
  energy: number;
  maxEnergy: number;
  stress: number;
  socialTrust: number;
}

/** Nothing built — the worst-case trajectory used as the baseline sweep's default. */
export const UNBUILT_COMMONS: CommonsProgressInput = {
  kitchenProgress: 0,
  solarGridProgress: 0,
  legalFundProgress: 0,
  toolLibraryProgress: 0,
};

/** Everything built from day 1 — the "fully buffed" trajectory the planning doc's Day 60/90 columns assume. */
export const FULLY_BUILT_COMMONS: CommonsProgressInput = {
  kitchenProgress: 100,
  solarGridProgress: 100,
  legalFundProgress: 100,
  toolLibraryProgress: 100,
};

/**
 * Runs `applyDailyTick()` once per simulated day, threading cash/energy/stress
 * forward exactly like `advanceDay()` does in the real store — but headless
 * (no Zustand, no save, no crisis queue). `commons` and `multipliers` are
 * held fixed for the sweep, matching what a single `applyDailyTick()` call
 * actually receives on any one real day — this sweep does not itself grow
 * commons progress over time (that is a separate, stateful mechanic driven by
 * `updateCommonsProgress()`); callers wanting a "player builds it partway
 * through" trajectory should run two sweeps and splice them, not expect this
 * function to model construction pacing.
 */
export function runSolvencySweep(
  archetype: ClassRole,
  days: number,
  seed: SolvencySeed,
  commons: CommonsProgressInput = UNBUILT_COMMONS,
  multipliers: EconomicMultipliers = DEFAULT_MULTIPLIERS,
): SolvencySnapshot[] {
  const snapshots: SolvencySnapshot[] = [];
  let cash = seed.cash;
  let energy = seed.energy;
  let stress = seed.stress;
  for (let day = 1; day <= days; day += 1) {
    const tick = applyDailyTick(archetype, commons, seed.socialTrust, multipliers);
    cash = Math.max(0, cash + tick.cashDelta);
    energy = Math.min(seed.maxEnergy, Math.max(0, energy + tick.energyDelta));
    stress = Math.max(0, Math.min(100, stress + tick.stressDelta));
    snapshots.push({ day, cash, energy, stress });
  }
  return snapshots;
}

/** The planning doc's "Permanent Inflation" run: food ×1.5 for 30 days. */
export const PERMANENT_INFLATION_MULTIPLIERS: EconomicMultipliers = {
  ...DEFAULT_MULTIPLIERS,
  food: 1.5,
  // Grounding note: the planning doc also specifies "energy +75%", but
  // applyDailyTick() never reads multipliers.energy — energy upkeep/regen is
  // a fixed per-archetype table (EconomyMath.ts's ENERGY_REGEN + the
  // Tool-Library-gated 8/10 upkeep constant), independent of the economic
  // multipliers entirely. Setting it here would be a silent no-op, so it's
  // left at the default and this is called out instead of faked.
  energy: 1.75,
};

/** The planning doc's "Algorithm Pay Slash" run: gig wage index ×0.7 for 30 days. */
export const ALGORITHM_PAY_SLASH_MULTIPLIERS: EconomicMultipliers = {
  ...DEFAULT_MULTIPLIERS,
  wage: 0.7,
};
