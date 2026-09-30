import type { EconomicMultipliers } from '@district-cg/shared-types';

export const BUILD_COMPLETION_THRESHOLD = 100;

export const DEFAULT_MULTIPLIERS: EconomicMultipliers = {
  food: 1.0, energy: 1.0, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0,
};

// ── Daily tick ────────────────────────────────────────────────────────────────

/** One row of the morning ledger: where a change in cash, energy or stress
 *  came from. Zero amounts are left out; `note` explains a line that
 *  changes nothing (e.g. free meals once the kitchen is built). */
export interface LedgerLine {
  icon: string;
  label: string;
  cash?: number;
  energy?: number;
  stress?: number;
  note?: string;
}

function line(icon: string, label: string, amounts: { cash?: number; energy?: number; stress?: number }, note?: string): LedgerLine | null {
  const out: LedgerLine = { icon, label };
  if (amounts.cash) out.cash = amounts.cash;
  if (amounts.energy) out.energy = amounts.energy;
  if (amounts.stress) out.stress = amounts.stress;
  if (note) out.note = note;
  return out.cash || out.energy || out.stress || out.note ? out : null;
}

function sumLines(lines: LedgerLine[], key: 'cash' | 'energy' | 'stress'): number {
  return lines.reduce((s, l) => s + (l[key] ?? 0), 0);
}

export interface DailyTickResult {
  energyDelta: number;
  cashDelta: number;
  stressDelta: number;
  /** The same deltas, itemised. They always add up to the totals above. */
  lines: LedgerLine[];
}

// M43 §1 — EPIC-34, absorbing EPIC-32's M36 scope. See HousingOptions.ts's
// own doc comment for why this mirrors DailyTickResult's real 3-stat shape
// (no trustDelta — the daily tick never applies one today).
export interface HousingDailyModifier {
  cashDelta: number;
  energyDelta: number;
  stressDelta: number;
}

// Archetype-specific overnight energy regen (before upkeep). Energy is the
// daily action budget: every repeatable way to earn costs energy, and it
// only comes back here (see EconomyRules.ts). The 2026-09-29 audit found
// the old values (15/5/10) left Morgan permanently at 0 energy by day ~8.
const ENERGY_REGEN: Record<string, number> = {
  pip: 35,    // gig worker recovers quickly; net +25 after 10 upkeep
  morgan: 30, // exhausted commuter (long shifts, see WorkSystem); net +20 after 10 upkeep
  arthur: 30, // comfortable landlord; net +20 after 10 upkeep
};
const DEFAULT_ENERGY_REGEN = 28;

export function applyDailyTick(
  classRole: string | null,
  commons: { kitchenProgress: number; solarGridProgress: number; legalFundProgress: number; toolLibraryProgress?: number },
  socialTrust: number,
  multipliers: EconomicMultipliers = DEFAULT_MULTIPLIERS,
  housingModifier?: HousingDailyModifier,
): DailyTickResult {
  const regen = ENERGY_REGEN[classRole ?? ''] ?? DEFAULT_ENERGY_REGEN;
  // Tool Library at 100% reduces upkeep by 20% (covers shared repair tools)
  const toolLibraryBuilt = (commons.toolLibraryProgress ?? 0) >= BUILD_COMPLETION_THRESHOLD;
  const baseEnergyUpkeep = toolLibraryBuilt ? 8 : 10;
  // M24 §1 — energy upkeep now scales with multipliers.energy, mirroring how
  // foodCost already scales with multipliers.food. Previously this multiplier
  // was read nowhere in the tick, a documented no-op (see BalanceSimulator.ts).
  const energyUpkeep = Math.round(baseEnergyUpkeep * multipliers.energy);

  // Cash: base food upkeep multiplied by food index; kitchen built → free food
  const baseFoodCost = 3;
  const kitchenBuilt = commons.kitchenProgress >= BUILD_COMPLETION_THRESHOLD;
  const foodCost = kitchenBuilt ? 0 : Math.round(baseFoodCost * multipliers.food);

  // Archetype earning modified by wage/transit multipliers
  let income: LedgerLine | null = null;
  if (classRole === 'pip') {
    income = line('🚲', 'Gig shifts', { cash: Math.round(5 * multipliers.wage) });
  } else if (classRole === 'morgan') {
    const commutePenalty = Math.round(2 * multipliers.transit);
    income = line('🚆', 'Wages after the commute', { cash: 8 - commutePenalty });
  } else if (classRole === 'arthur') {
    income = line('🏘', 'Rent from your tenants', { cash: 12 }); // unaffected by multipliers
  }

  // Stress: +5/day baseline, reduced by trust and completed commons
  const solarBuilt = commons.solarGridProgress >= BUILD_COMPLETION_THRESHOLD;
  const legalBuilt = commons.legalFundProgress >= BUILD_COMPLETION_THRESHOLD;
  const trustRelief = Math.floor(socialTrust / 20);

  // Itemised so the morning ledger can explain the night; the totals below
  // are derived from these lines, so the two can never disagree.
  const lines = [
    income,
    kitchenBuilt
      ? line('🍲', 'Meals at the Community Kitchen', { stress: -3 }, 'free food')
      : line('🛒', 'Groceries', { cash: -foodCost }),
    line('😴', "A night's rest", { energy: regen }),
    line('🧺', toolLibraryBuilt ? 'Daily chores (Tool Library helps)' : 'Daily chores', { energy: -energyUpkeep }),
    // M43 §1 — recurring rent/quality-of-life delta from the chosen flat.
    housingModifier ? line('🏠', 'Your flat', { cash: housingModifier.cashDelta, energy: housingModifier.energyDelta, stress: housingModifier.stressDelta }) : null,
    line('😰', 'Everyday pressure', { stress: 5 }),
    solarBuilt ? line('☀️', 'Solar Co-op keeps bills down', { stress: -5 }) : null,
    legalBuilt ? line('⚖️', 'Legal Defense Fund has your back', { stress: -4 }) : null,
    line('🤝', 'Neighbours you trust', { stress: -trustRelief }),
  ].filter((l): l is LedgerLine => l !== null);

  return {
    energyDelta: sumLines(lines, 'energy'),
    cashDelta: sumLines(lines, 'cash'),
    stressDelta: sumLines(lines, 'stress'),
    lines,
  };
}

export type BuildProgressKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress';

export interface BuildBuffState {
  kitchen: number;
  solar: number;
  legal: number;
}

/** A fresh district is under visible stress ("crisis" tier), not in
 *  collapse — see ResilienceDressing.ts (<15 emergency, <30 crisis). */
export const BASE_RESILIENCE = 20;

export interface ResilienceInput {
  kitchenProgress: number;
  solarGridProgress: number;
  legalFundProgress: number;
  toolLibraryProgress: number;
  landTrustProgress: number;
  /** Persisted nudges from crises, votes, minigames and parcels. */
  resilienceModifier: number;
}

/** The one owner of `commons.resilienceScore` (audit §1.4): base + build
 *  progress across all five nodes (up to +80) + the persisted modifier.
 *  Always recomputed from these inputs, never written directly, so a build
 *  contribution can no longer erase a crisis outcome or vice versa. */
export function computeResilienceScore(c: ResilienceInput): number {
  const nodes = [c.kitchenProgress, c.solarGridProgress, c.legalFundProgress, c.toolLibraryProgress, c.landTrustProgress];
  const avg = nodes.reduce((sum, v) => sum + Math.max(0, Math.min(100, v)), 0) / nodes.length;
  const score = BASE_RESILIENCE + avg * 0.8 + c.resilienceModifier;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ── End-of-day settlement (D2: starving and breakdown) ──────────────────────

export const STARVING = {
  /** Extra stress on a day the player can't cover food/rent. */
  stressPerDay: 6,
  /** More stress for every consecutive day already spent starving… */
  escalationPerDay: 2,
  /** …up to this much extra. */
  maxEscalation: 8,
  regenPenalty: 10,
} as const;

export const ROUGH_SLEEPING = { regenPenalty: 5, stressPerDay: 2 } as const;
export const HIGH_STRESS = { threshold: 75, regenPenalty: 10 } as const;
export const BREAKDOWN = { stressAfter: 50, minEnergyAfter: 50, trustLoss: 5 } as const;
/** Each placed piece of furniture in a rented home: −1 stress/day, up to this. */
export const FURNITURE_MAX_RELIEF = 3;

export interface DayInput {
  classRole: string | null;
  cash: number;
  energy: number;
  maxEnergy: number;
  stress: number;
  trust: number;
  starvingDays: number;
  commons: { kitchenProgress: number; solarGridProgress: number; legalFundProgress: number; toolLibraryProgress?: number };
  multipliers: EconomicMultipliers;
  /** The rented flat's daily modifier, or null when sleeping rough. */
  housing: HousingDailyModifier | null;
  furnitureCount: number;
}

export interface DayOutcome {
  cash: number;
  energy: number;
  stress: number;
  starvingDays: number;
  starving: boolean;
  /** Costs that couldn't be paid (they turn into stress, not debt). */
  unpaid: number;
  breakdown: boolean;
  /** 2 when a breakdown costs the player the next day. */
  daysElapsed: 1 | 2;
  trustDelta: number;
  /** The night, itemised for the morning ledger. When no stat hit a bound,
   *  each column adds up to the real change. */
  lines: LedgerLine[];
}

/** Pure end-of-day settlement. `advanceDay()` and `BalanceSimulator` both
 *  use it, so the simulator can't drift from the real game. */
export function settleDay(input: DayInput): DayOutcome {
  const tick = applyDailyTick(input.classRole, input.commons, input.trust, input.multipliers, input.housing ?? undefined);
  const lines = [...tick.lines];
  const push = (l: LedgerLine | null) => { if (l) lines.push(l); };

  if (input.housing) {
    push(line('🪴', 'A homely flat', { stress: -Math.min(FURNITURE_MAX_RELIEF, Math.max(0, input.furnitureCount)) }));
  } else {
    push(line('🛏', 'Slept rough', { energy: -ROUGH_SLEEPING.regenPenalty, stress: ROUGH_SLEEPING.stressPerDay }));
  }
  if (input.stress >= HIGH_STRESS.threshold) {
    push(line('😣', 'Restless sleep (high stress)', { energy: -HIGH_STRESS.regenPenalty }));
  }

  let cash = input.cash + tick.cashDelta;
  let unpaid = 0;
  let starvingDays = 0;
  const starving = cash < 0;
  if (starving) {
    unpaid = -cash;
    cash = 0;
    starvingDays = input.starvingDays + 1;
    // No cash amount: unpaid costs are not debt (D2) — they become stress.
    push(line('🍞', `Went hungry — couldn't cover $${unpaid}`, {
      energy: -STARVING.regenPenalty,
      stress: STARVING.stressPerDay + Math.min(STARVING.maxEscalation, input.starvingDays * STARVING.escalationPerDay),
    }));
  }

  const rawEnergy = input.energy + sumLines(lines, 'energy');
  let energy = Math.min(input.maxEnergy, Math.max(0, rawEnergy));
  let stress = Math.min(100, Math.max(0, input.stress + sumLines(lines, 'stress')));

  if (stress < 100 && input.stress < 100) {
    return { cash, energy, stress, starvingDays, starving, unpaid, breakdown: false, daysElapsed: 1, trustDelta: 0, lines };
  }

  // Breakdown: the next day is spent recovering. Bills still come due.
  const cashBeforeLostDay = cash;
  cash += tick.cashDelta;
  let lostDayUnpaid = 0;
  if (cash < 0) {
    lostDayUnpaid = -cash;
    unpaid += lostDayUnpaid;
    cash = 0;
    starvingDays += 1;
  }
  push(line('📅', 'Bills for the lost day', { cash: cash - cashBeforeLostDay }, lostDayUnpaid ? `$${lostDayUnpaid} unpaid` : undefined));
  const stressBefore = stress;
  const energyBefore = energy;
  stress = BREAKDOWN.stressAfter;
  energy = Math.min(input.maxEnergy, Math.max(energy, BREAKDOWN.minEnergyAfter));
  push(line('💥', 'Breakdown — a day spent recovering', {
    stress: stress - stressBefore,
    energy: energy - energyBefore,
  }, `trust −${BREAKDOWN.trustLoss}`));
  return {
    cash, energy, stress, starvingDays, starving: starving || unpaid > 0, unpaid,
    breakdown: true, daysElapsed: 2, trustDelta: -BREAKDOWN.trustLoss, lines,
  };
}

export function getBuildBuffState(progress: Record<BuildProgressKey, number>): BuildBuffState {
  return {
    kitchen: progress.kitchenProgress >= BUILD_COMPLETION_THRESHOLD ? 12 : 0,
    solar: progress.solarGridProgress >= BUILD_COMPLETION_THRESHOLD ? 10 : 0,
    legal: progress.legalFundProgress >= BUILD_COMPLETION_THRESHOLD ? 8 : 0,
  };
}

export function resilienceTier(score: number): 'crisis' | 'stabilising' | 'thriving' {
  if (score < 30) return 'crisis';
  if (score < 60) return 'stabilising';
  return 'thriving';
}
