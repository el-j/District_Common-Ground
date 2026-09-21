import { describe, it, expect } from 'vitest';
import { getSeasonalMultipliers } from './SeasonalWave';

describe('getSeasonalMultipliers', () => {
  it('wage stays flat at 1.0 across every month', () => {
    for (let m = 0; m < 12; m++) {
      expect(getSeasonalMultipliers(m).wage).toBe(1.0);
    }
  });

  it('food cost peaks in January (winter scarcity)', () => {
    const january = getSeasonalMultipliers(0).food;
    for (let m = 1; m < 12; m++) {
      expect(getSeasonalMultipliers(m).food).toBeLessThanOrEqual(january);
    }
  });

  it('heat multiplier peaks in August (summer heatwave)', () => {
    const august = getSeasonalMultipliers(7).heat;
    for (let m = 0; m < 12; m++) {
      if (m === 7) continue;
      expect(getSeasonalMultipliers(m).heat).toBeLessThan(august);
    }
  });

  it('heat multiplier is lowest in January (mild winter demand)', () => {
    const values = Array.from({ length: 12 }, (_, m) => getSeasonalMultipliers(m).heat);
    expect(getSeasonalMultipliers(0).heat).toBe(Math.min(...values));
  });

  it('normalizes out-of-range months (negative and >11) by wrapping modulo 12', () => {
    expect(getSeasonalMultipliers(12)).toEqual(getSeasonalMultipliers(0));
    expect(getSeasonalMultipliers(-1)).toEqual(getSeasonalMultipliers(11));
    expect(getSeasonalMultipliers(25)).toEqual(getSeasonalMultipliers(1));
  });

  it('returns the exact known multiplier set for January (month 0)', () => {
    expect(getSeasonalMultipliers(0)).toEqual({ food: 1.30, energy: 1.25, wage: 1.0, transit: 1.10, heat: 0.60, migrant: 0.90 });
  });

  it('returns the exact known multiplier set for July (month 6)', () => {
    expect(getSeasonalMultipliers(6)).toEqual({ food: 0.95, energy: 1.30, wage: 1.0, transit: 0.95, heat: 1.35, migrant: 1.05 });
  });

  it('migrant pressure peaks in November (month 10) — CrisisEngine\'s MIGRATION_SANCT priority threshold (1.5) is never reached by seasonal data alone', () => {
    const values = Array.from({ length: 12 }, (_, m) => getSeasonalMultipliers(m).migrant);
    expect(getSeasonalMultipliers(10).migrant).toBe(Math.max(...values));
    values.forEach(v => expect(v).toBeLessThan(1.5));
  });
});
