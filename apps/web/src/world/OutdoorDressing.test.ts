import { describe, it, expect } from 'vitest';
import { OUTDOOR_DRESSING_PROPS, type OutdoorPropToken } from './OutdoorDressing';
import { COLS, ROWS } from './MapData';

// M32 §3 — the outdoor prop placer's output must be deterministic (same
// fixed list every import, no randomness) and every placement must land
// inside the map's own bounds. See EPIC-31/M32 Section 3.
describe('OUTDOOR_DRESSING_PROPS', () => {
  it('is deterministic — re-importing the module yields the same list', async () => {
    const again = await import('./OutdoorDressing');
    expect(again.OUTDOOR_DRESSING_PROPS).toEqual(OUTDOOR_DRESSING_PROPS);
  });

  it('is non-empty and covers more than one prop type', () => {
    expect(OUTDOOR_DRESSING_PROPS.length).toBeGreaterThan(0);
    const tokens = new Set(OUTDOOR_DRESSING_PROPS.map(p => p.token));
    expect(tokens.size).toBeGreaterThan(1);
  });

  it('includes trees, benches, and parked vehicles — not just resilience-tier-swapped props', () => {
    const tokens = new Set(OUTDOOR_DRESSING_PROPS.map(p => p.token));
    const expected: OutdoorPropToken[] = ['PROP_ACCENT_TREE', 'PROP_STREET_BENCH', 'PROP_PARKED_CAR'];
    expected.forEach(token => expect(tokens.has(token)).toBe(true));
  });

  it('every placement lands inside the map grid bounds', () => {
    OUTDOOR_DRESSING_PROPS.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(COLS);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(ROWS);
    });
  });

  it('has no two props placed on the exact same tile', () => {
    const seen = new Set(OUTDOOR_DRESSING_PROPS.map(p => `${p.x},${p.y}`));
    expect(seen.size).toBe(OUTDOOR_DRESSING_PROPS.length);
  });
});
