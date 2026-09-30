import { describe, it, expect } from 'vitest';
import { HOUSING_OPTIONS, getHousingOption, housingOptionsForInterior } from './HousingOptions';

// M43 — EPIC-34 §1, absorbing EPIC-32's M36 scope. See
// docs/tasks/M43-housing-rental-and-furniture-editor.md.
describe('HOUSING_OPTIONS', () => {
  it('has 2-4 virtual units, each with a unique id', () => {
    expect(HOUSING_OPTIONS.length).toBeGreaterThanOrEqual(2);
    expect(HOUSING_OPTIONS.length).toBeLessThanOrEqual(4);
    const ids = new Set(HOUSING_OPTIONS.map(o => o.id));
    expect(ids.size).toBe(HOUSING_OPTIONS.length);
  });

  it('no option is strictly dominant — no option has the best cash, energy and stress delta simultaneously (higher is better for cash/energy, lower is better for stress)', () => {
    const bestCash = Math.max(...HOUSING_OPTIONS.map(o => o.consequences.cashDelta));
    const bestEnergy = Math.max(...HOUSING_OPTIONS.map(o => o.consequences.energyDelta));
    const bestStress = Math.min(...HOUSING_OPTIONS.map(o => o.consequences.stressDelta));
    const dominant = HOUSING_OPTIONS.find(o =>
      o.consequences.cashDelta === bestCash
      && o.consequences.energyDelta === bestEnergy
      && o.consequences.stressDelta === bestStress,
    );
    expect(dominant).toBeUndefined();
  });

  it('covers both apartment building interiors', () => {
    const buildings = new Set(HOUSING_OPTIONS.map(o => o.buildingInteriorId));
    expect(buildings.has('pipsCourierRoom')).toBe(true);
    expect(buildings.has('apartmentBlockB')).toBe(true);
  });
});

describe('getHousingOption', () => {
  it('returns null for null (no fixed home is a valid default)', () => {
    expect(getHousingOption(null)).toBeNull();
  });

  it('returns null for an unknown id', () => {
    expect(getHousingOption('not-a-real-option')).toBeNull();
  });

  it('resolves a real id to its option', () => {
    expect(getHousingOption('pips-courier-room')?.buildingInteriorId).toBe('pipsCourierRoom');
  });
});

describe('housingOptionsForInterior', () => {
  it('returns every option pointing at that interior (Block B hosts 2 virtual units)', () => {
    expect(housingOptionsForInterior('apartmentBlockB').length).toBe(2);
    expect(housingOptionsForInterior('pipsCourierRoom').length).toBe(1);
  });

  it('returns the exact matching ids, not just a count', () => {
    const blockB = housingOptionsForInterior('apartmentBlockB').map(o => o.id).sort();
    expect(blockB).toEqual(['block-b-private', 'block-b-shared']);
  });

  it('returns an empty list for an interior with no housing options', () => {
    expect(housingOptionsForInterior('library')).toEqual([]);
  });
});

describe('getHousingOption — every real option resolves with its own consequences', () => {
  it('block-b-private resolves with its own distinct, non-zero-everywhere deltas', () => {
    const option = getHousingOption('block-b-private');
    expect(option?.consequences).toEqual({ cashDelta: -15, energyDelta: 6, stressDelta: -5 });
  });

  it('block-b-shared resolves with its own distinct deltas', () => {
    const option = getHousingOption('block-b-shared');
    expect(option?.consequences).toEqual({ cashDelta: -7, energyDelta: 3, stressDelta: 0 });
  });
});
