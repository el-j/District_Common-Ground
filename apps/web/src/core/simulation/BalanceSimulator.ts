// M13 — deterministic 90-day economy solvency sweep over the real
// applyDailyTick() math. See docs/stories/EPIC-13-...md's "Grounded
// diagnosis": docs/planning/13-....md's "10,000 Monte Carlo runs" doesn't fit
// this codebase — EconomyMath.ts has zero randomness (multipliers come from
// SeasonalWave.ts's deterministic sine curves), so there is no distribution
// to sample from. This is an exhaustive deterministic sweep instead: cheaper,
// reproducible, and strictly more useful for regression testing than random
// sampling of a system with no randomness would be.
import type { ClassRole, BuildNodeKey } from '../state/useGameStore';
import type { EconomicMultipliers } from '@district-cg/shared-types';
import { applyDailyTick, settleDay, DEFAULT_MULTIPLIERS, type BuildProgressKey } from './EconomyMath';
import { planContribution, communityContributionPct, MINIGAME_LIMITS } from './EconomyRules';
import { WORK_DEFINITIONS } from './WorkSystem';
import { getHousingOption } from './HousingOptions';
import scenariosRaw from '../../data/crisis_scenarios.json';

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
  // M24 §1 — energy upkeep now genuinely scales with this multiplier
  // (EconomyMath.ts's applyDailyTick multiplies the Tool-Library-gated 8/10
  // base upkeep by multipliers.energy), so this is no longer a no-op: at
  // 1.75x, base upkeep of 10 becomes 18, pushing every archetype's energy
  // trajectory further negative than the baseline sweep.
  energy: 1.75,
};

/** The planning doc's "Algorithm Pay Slash" run: gig wage index ×0.7 for 30 days. */
export const ALGORITHM_PAY_SLASH_MULTIPLIERS: EconomicMultipliers = {
  ...DEFAULT_MULTIPLIERS,
  wage: 0.7,
};

// ── Full playthrough model (2026-09-29 launch audit §1.6, D4) ───────────────
//
// `runSolvencySweep()` above only models the passive daily tick. This models
// a *normal* player's day with the real rules — Work, a minigame run, the
// daily crisis odds, Scraps, contributing spare cash and energy to the next
// unfinished build, rent, and neighbours pitching in overnight — so the
// pacing targets (first node ~day 10–18, Safe Haven ~day 45–65) are pinned
// by tests instead of guessed.

const BUILD_ORDER: readonly BuildNodeKey[] = [
  'kitchenProgress', 'solarGridProgress', 'legalFundProgress', 'toolLibraryProgress', 'landTrustProgress',
];

type Consequences = { cashDelta: number; energyDelta: number; trustDelta: number; stressDelta: number };
interface ScenarioShape {
  choiceA: { consequences: Consequences };
  choiceB: { consequences: Consequences };
}
function averageChoice(pick: (s: ScenarioShape) => Consequences): Consequences {
  const list = scenariosRaw as unknown as ScenarioShape[];
  const avg = (f: (c: Consequences) => number) =>
    Math.round(list.reduce((sum, s) => sum + f(pick(s)), 0) / list.length);
  return {
    cashDelta: avg(c => c.cashDelta),
    energyDelta: avg(c => c.energyDelta),
    trustDelta: avg(c => c.trustDelta),
    stressDelta: avg(c => c.stressDelta),
  };
}
const SOLIDARITY_AVG = averageChoice(s => s.choiceB.consequences);
const SCAPEGOAT_AVG = averageChoice(s => s.choiceA.consequences);
/** Mirrors CrisisEngine's SCAPEGOAT_TRUST_PENALTY (kept local so this pure
 *  module never imports the store-bound CrisisEngine). */
const SCAPEGOAT_TRUST_PENALTY = 15;

export interface PlaythroughOptions {
  days?: number;
  housingId?: string | null;
  minigameRunsPerDay?: number;
  /** Average cash from one minigame run (the host caps it at MINIGAME_LIMITS.maxCash). */
  avgMinigameCash?: number;
  /** A crisis on average every N days (60% roll after a 3-day cooldown ≈ 4–5). */
  crisisEvery?: number;
  /** Cash and energy the player keeps back instead of contributing. */
  cashReserve?: number;
  energyReserve?: number;
  crisisChoice?: 'solidarity' | 'scapegoat';
  feedsScraps?: boolean;
}

export interface PlaythroughResult {
  firstNodeDay: number | null;
  safeHavenDay: number | null;
  nodeCompletedDays: number[];
  breakdowns: number;
  starvingDays: number;
  final: { cash: number; energy: number; stress: number; trust: number; day: number };
}

export function simulatePlaythrough(
  archetype: ClassRole,
  seed: SolvencySeed,
  options: PlaythroughOptions = {},
): PlaythroughResult {
  const {
    days = 120, housingId = null, minigameRunsPerDay = 1, avgMinigameCash = 12,
    crisisEvery = 5, cashReserve = 20, energyReserve = 10,
    crisisChoice = 'solidarity', feedsScraps = true,
  } = options;
  const work = WORK_DEFINITIONS[archetype];
  const housing = getHousingOption(housingId)?.consequences ?? null;

  let { cash, energy, stress } = seed;
  let trust = seed.socialTrust;
  let buff = 0;
  let starvingDays = 0;
  let totalStarving = 0;
  let breakdowns = 0;
  const progress: Record<BuildNodeKey, number> = {
    kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0,
  };
  const completed: number[] = [];
  let day = 1;

  const clampTrust = (v: number) => Math.max(0, Math.min(100, v));
  const nextNode = (): BuildNodeKey | undefined => BUILD_ORDER.find(n => progress[n] < 100);
  const addProgress = (node: BuildNodeKey, pct: number) => {
    const was = progress[node];
    progress[node] = Math.min(100, was + pct);
    if (was < 100 && progress[node] >= 100) completed.push(day);
  };

  while (day <= days && completed.length < BUILD_ORDER.length) {
    // A crisis greets the player at the start of some days; a normal
    // player picks solidarity when they can pay for it.
    if (day % crisisEvery === 0 && crisisChoice === 'scapegoat') {
      cash += SCAPEGOAT_AVG.cashDelta;
      trust = clampTrust(trust + SCAPEGOAT_AVG.trustDelta - SCAPEGOAT_TRUST_PENALTY);
      stress = Math.max(0, Math.min(100, stress + SCAPEGOAT_AVG.stressDelta));
    } else if (day % crisisEvery === 0) {
      const s = SOLIDARITY_AVG;
      if (cash >= -s.cashDelta && energy >= -s.energyDelta) {
        cash += s.cashDelta;
        energy += s.energyDelta;
        trust = clampTrust(trust + s.trustDelta);
        stress = Math.max(0, Math.min(100, stress + s.stressDelta));
        buff = Math.min(0.6, buff + 0.3);
      }
    }
    // Work once a day.
    if (energy >= work.energyCost) {
      energy -= work.energyCost;
      cash += work.cashReward;
    }
    // Minigame runs.
    for (let i = 0; i < minigameRunsPerDay; i += 1) {
      if (energy < MINIGAME_LIMITS.energyCost + energyReserve) break;
      energy -= MINIGAME_LIMITS.energyCost;
      cash += Math.min(MINIGAME_LIMITS.maxCash, avgMinigameCash);
      trust = clampTrust(trust + 1);
    }
    // Scraps.
    if (feedsScraps && cash >= 1) {
      cash -= 1;
      stress = Math.max(0, stress - 3);
    }
    // Contribute spare cash and energy to the next unfinished build.
    const node = nextNode();
    if (node) {
      const plan = planContribution(
        { currentPct: progress[node], cash, energy, contributedTodayPct: 0, speedBuff: buff },
        { cash: Math.max(0, cash - cashReserve), energy: Math.max(0, energy - energyReserve) },
      );
      cash -= plan.cashSpent;
      energy -= plan.energySpent;
      addProgress(node, plan.progressPct);
    }

    // Night.
    const out = settleDay({
      classRole: archetype, cash, energy, maxEnergy: seed.maxEnergy, stress, trust, starvingDays,
      commons: progress, multipliers: DEFAULT_MULTIPLIERS, housing, furnitureCount: 0,
    });
    ({ cash, energy, stress, starvingDays } = out);
    trust = clampTrust(trust + out.trustDelta);
    if (out.starving) totalStarving += 1;
    if (out.breakdown) breakdowns += 1;
    const focus = nextNode();
    if (focus) addProgress(focus, communityContributionPct(trust, buff));
    day += out.daysElapsed;
  }

  return {
    firstNodeDay: completed[0] ?? null,
    safeHavenDay: completed.length === BUILD_ORDER.length ? completed[completed.length - 1]! : null,
    nodeCompletedDays: completed,
    breakdowns,
    starvingDays: totalStarving,
    final: { cash, energy, stress, trust, day },
  };
}
