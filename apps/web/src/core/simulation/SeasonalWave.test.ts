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
});
