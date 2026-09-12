import type { EconomicMultipliers } from '@district-cg/shared-types';

// Monthly lookup tables (index 0 = January, 11 = December)
const FOOD    = [1.30, 1.28, 1.15, 1.00, 0.95, 0.95, 0.95, 0.98, 1.02, 1.10, 1.20, 1.28];
const ENERGY  = [1.25, 1.22, 1.05, 0.95, 0.95, 1.05, 1.30, 1.35, 1.15, 1.00, 1.05, 1.20];
const TRANSIT = [1.10, 1.08, 1.02, 1.00, 0.97, 0.95, 0.95, 0.95, 1.00, 1.03, 1.05, 1.10];
const HEAT    = [0.60, 0.65, 0.75, 0.85, 1.00, 1.20, 1.35, 1.40, 1.25, 1.00, 0.75, 0.62];
const MIGRANT = [0.90, 0.88, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.20, 1.28, 1.30, 1.10];

export function getSeasonalMultipliers(month: number): EconomicMultipliers {
  const m = ((month % 12) + 12) % 12;
  return {
    food:    FOOD[m]!,
    energy:  ENERGY[m]!,
    wage:    1.0,
    transit: TRANSIT[m]!,
    heat:    HEAT[m]!,
    migrant: MIGRANT[m]!,
  };
}
