import type { EconomicMultipliers } from '@district-cg/shared-types';

export const BUILD_COMPLETION_THRESHOLD = 100;

export const DEFAULT_MULTIPLIERS: EconomicMultipliers = {
  food: 1.0, energy: 1.0, wage: 1.0, transit: 1.0, heat: 1.0, migrant: 1.0,
};

// ── Daily tick ────────────────────────────────────────────────────────────────

export interface DailyTickResult {
  energyDelta: number;
  cashDelta: number;
  stressDelta: number;
}

// Archetype-specific energy regen per day (before upkeep)
const ENERGY_REGEN: Record<string, number> = {
  pip: 15,    // gig worker recovers quickly; net +5 after 10 upkeep
  morgan: 5,  // exhausted commuter; net -5 after 10 upkeep
  arthur: 10, // comfortable landlord; net 0 after 10 upkeep
};

export function applyDailyTick(
  classRole: string | null,
  commons: { kitchenProgress: number; solarGridProgress: number; legalFundProgress: number },
  socialTrust: number,
  multipliers: EconomicMultipliers = DEFAULT_MULTIPLIERS,
): DailyTickResult {
  const regen = ENERGY_REGEN[classRole ?? ''] ?? 8;
  const energyUpkeep = 10;
  const energyDelta = regen - energyUpkeep;

  // Cash: base food upkeep multiplied by food index; kitchen built → free food
  const baseFoodCost = 3;
  const foodCost = commons.kitchenProgress >= BUILD_COMPLETION_THRESHOLD
    ? 0
    : Math.round(baseFoodCost * multipliers.food);

  // Archetype earning modified by wage/transit multipliers
  let earning = 0;
  if (classRole === 'pip') {
    earning = Math.round(5 * multipliers.wage);
  } else if (classRole === 'morgan') {
    const commutePenalty = Math.round(2 * multipliers.transit);
    earning = 8 - commutePenalty;
  } else if (classRole === 'arthur') {
    earning = 12; // rent income unaffected by multipliers
  }

  const cashDelta = earning - foodCost;

  // Stress: +5/day baseline, reduced by trust and completed commons
  const solarBonus          = commons.solarGridProgress  >= BUILD_COMPLETION_THRESHOLD ? 5 : 0;
  const legalBonus          = commons.legalFundProgress  >= BUILD_COMPLETION_THRESHOLD ? 4 : 0;
  const kitchenStressBonus  = commons.kitchenProgress    >= BUILD_COMPLETION_THRESHOLD ? 3 : 0;
  const trustRelief = Math.floor(socialTrust / 20);
  const stressDelta = 5 - solarBonus - legalBonus - kitchenStressBonus - trustRelief;

  return { energyDelta, cashDelta, stressDelta };
}

export type BuildProgressKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress';

export interface BuildBuffState {
  kitchen: number;
  solar: number;
  legal: number;
}

export function computeResilienceScore(progress: Record<BuildProgressKey, number>): number {
  const total = Object.values(progress).reduce((sum, value) => sum + value, 0);
  const weighted = total / 3;
  return Math.min(100, Math.max(0, Math.round(weighted)));
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
