import { describe, it, expect } from 'vitest';
import { SCAVENGE_POINTS } from './ScavengePoints';
import { COLS, ROWS, buildMap, isWalkableTile, T } from './MapData';
import { OUTDOOR_DRESSING_PROPS } from './OutdoorDressing';

// M38 — EPIC-33 §2. See docs/tasks/M38-materials-scavenging-and-inventory.md.
describe('SCAVENGE_POINTS', () => {
  it('is deterministic — re-importing the module yields the same list', async () => {
    const again = await import('./ScavengePoints');
    expect(again.SCAVENGE_POINTS).toEqual(SCAVENGE_POINTS);
  });

  it('every placement has a unique id', () => {
    const ids = new Set(SCAVENGE_POINTS.map(p => p.id));
    expect(ids.size).toBe(SCAVENGE_POINTS.length);
  });

  it('every placement lands inside the map grid bounds', () => {
    SCAVENGE_POINTS.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(COLS);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(ROWS);
    });
  });

  it('every placement sits on a real, walkable, non-door tile (not inside a wall/building)', () => {
    const m = buildMap();
    SCAVENGE_POINTS.forEach(p => {
      const tile = m[p.y][p.x];
      expect(isWalkableTile(tile)).toBe(true);
      expect(tile).not.toBe(T.DOOR);
    });
  });

  it('never coincides with an existing outdoor-dressing prop tile', () => {
    const occupied = new Set(OUTDOOR_DRESSING_PROPS.map(p => `${p.x},${p.y}`));
    SCAVENGE_POINTS.forEach(p => {
      expect(occupied.has(`${p.x},${p.y}`)).toBe(false);
    });
  });

  it('has no two scavenge points on the exact same tile', () => {
    const seen = new Set(SCAVENGE_POINTS.map(p => `${p.x},${p.y}`));
    expect(seen.size).toBe(SCAVENGE_POINTS.length);
  });

  it('every amount is a positive integer', () => {
    SCAVENGE_POINTS.forEach(p => {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(p.amount).toBeGreaterThan(0);
    });
  });
});
