import { describe, it, expect } from 'vitest';
import { COOKBOOK_PICKUPS } from './CookbookPickups';
import { COLS, ROWS, buildMap, isWalkableTile, T } from './MapData';
import { OUTDOOR_DRESSING_PROPS } from './OutdoorDressing';
import { SCAVENGE_POINTS } from './ScavengePoints';
import { RECIPES } from '../core/simulation/Recipes';

// M39 — EPIC-33 §2. See docs/tasks/M39-recipes-cookbooks-and-crafting-stations.md.
describe('COOKBOOK_PICKUPS', () => {
  it('is deterministic — re-importing the module yields the same list', async () => {
    const again = await import('./CookbookPickups');
    expect(again.COOKBOOK_PICKUPS).toEqual(COOKBOOK_PICKUPS);
  });

  it('every placement has a unique id and references a real recipe', () => {
    const ids = new Set(COOKBOOK_PICKUPS.map(p => p.id));
    expect(ids.size).toBe(COOKBOOK_PICKUPS.length);
    COOKBOOK_PICKUPS.forEach(p => expect(RECIPES[p.recipe]).toBeDefined());
  });

  it('every placement lands inside the map grid bounds', () => {
    COOKBOOK_PICKUPS.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(COLS);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(ROWS);
    });
  });

  it('every placement sits on a real, walkable, non-door tile', () => {
    const m = buildMap();
    COOKBOOK_PICKUPS.forEach(p => {
      const tile = m[p.y][p.x];
      expect(isWalkableTile(tile)).toBe(true);
      expect(tile).not.toBe(T.DOOR);
    });
  });

  it('never coincides with an outdoor-dressing prop or an M38 scavenge point', () => {
    const occupied = new Set([
      ...OUTDOOR_DRESSING_PROPS.map(p => `${p.x},${p.y}`),
      ...SCAVENGE_POINTS.map(p => `${p.x},${p.y}`),
    ]);
    COOKBOOK_PICKUPS.forEach(p => {
      expect(occupied.has(`${p.x},${p.y}`)).toBe(false);
    });
  });

  it('has no two cookbook pickups on the exact same tile', () => {
    const seen = new Set(COOKBOOK_PICKUPS.map(p => `${p.x},${p.y}`));
    expect(seen.size).toBe(COOKBOOK_PICKUPS.length);
  });
});
