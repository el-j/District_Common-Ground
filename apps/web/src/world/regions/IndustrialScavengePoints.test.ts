import { describe, it, expect } from 'vitest';
import { INDUSTRIAL_SCAVENGE_POINTS } from './IndustrialScavengePoints';

// M45 — EPIC-35 §3. See docs/tasks/M45-region-content-pass-one.md.
// Mirrors ScavengePoints.test.ts's (M38) coverage, scoped to the
// Industrial Outskirts region's own 36×36 grid. No buildMap()-style
// walkability check here — RegionScene.ts (Phaser-coupled, no dedicated
// unit test, same established precedent as WorldScene.ts/InteriorScene.ts)
// renders this region as a flat ground fill with decorative, non-blocking
// dressing, not a real per-tile collision grid — non-collision against its
// door/decoration/NPC coordinates was verified by hand when placing them
// (RegionScene.ts's own RAIL_SIDING_ROWS/SCRAP_PILE_DECOR/REGION_NPCS
// constants and the Scrapyard Depot's doorTile at (18,25)), not by an
// automated cross-file check.
describe('INDUSTRIAL_SCAVENGE_POINTS', () => {
  it('is deterministic — re-importing the module yields the same list', async () => {
    const again = await import('./IndustrialScavengePoints');
    expect(again.INDUSTRIAL_SCAVENGE_POINTS).toEqual(INDUSTRIAL_SCAVENGE_POINTS);
  });

  it('every placement has a unique id, prefixed to never collide with ScavengePoints.ts\'s town ids', () => {
    const ids = new Set(INDUSTRIAL_SCAVENGE_POINTS.map(p => p.id));
    expect(ids.size).toBe(INDUSTRIAL_SCAVENGE_POINTS.length);
    INDUSTRIAL_SCAVENGE_POINTS.forEach(p => expect(p.id.startsWith('outskirts-')).toBe(true));
  });

  it('every placement lands inside the region\'s 36x36 grid bounds', () => {
    INDUSTRIAL_SCAVENGE_POINTS.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThan(36);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThan(36);
    });
  });

  it('has no two scavenge points on the exact same tile', () => {
    const seen = new Set(INDUSTRIAL_SCAVENGE_POINTS.map(p => `${p.x},${p.y}`));
    expect(seen.size).toBe(INDUSTRIAL_SCAVENGE_POINTS.length);
  });

  it('every amount is a positive integer', () => {
    INDUSTRIAL_SCAVENGE_POINTS.forEach(p => {
      expect(Number.isInteger(p.amount)).toBe(true);
      expect(p.amount).toBeGreaterThan(0);
    });
  });

  it('covers the region\'s themed materials (iron, coal, scrap metal)', () => {
    const materials = new Set(INDUSTRIAL_SCAVENGE_POINTS.map(p => p.material));
    expect(materials.has('MATERIAL_IRON')).toBe(true);
    expect(materials.has('MATERIAL_COAL')).toBe(true);
    expect(materials.has('MATERIAL_SCRAP_METAL')).toBe(true);
  });
});
