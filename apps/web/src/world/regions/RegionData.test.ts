import { describe, it, expect } from 'vitest';
import { REGIONS, ALL_REGION_IDS, getRegion, isRegionUnlocked } from './RegionData';

// M44 — EPIC-35 §1. See docs/tasks/M44-region-and-overworld-data-model.md.
// M45 — Industrial Outskirts gained real content; see
// docs/tasks/M45-region-content-pass-one.md.
// M46 — real unlock gating; see
// docs/tasks/M46-fast-travel-world-map-and-region-aware-systems.md.
describe('RegionData', () => {
  it('is deterministic — re-importing the module yields the same data', async () => {
    const again = await import('./RegionData');
    expect(again.REGIONS).toEqual(REGIONS);
  });

  it('every ALL_REGION_IDS entry resolves to a real REGIONS entry with a matching id', () => {
    ALL_REGION_IDS.forEach(id => {
      expect(REGIONS[id]).toBeDefined();
      expect(REGIONS[id].id).toBe(id);
    });
  });

  it('REGION_COMMON_GROUND wraps the existing town with WorldScene as its scene, no behavior change', () => {
    const region = getRegion('REGION_COMMON_GROUND');
    expect(region.sceneKey).toBe('WorldScene');
    // Mirrors WorldScene.create()'s existing hardcoded default spawn
    // (`const px = 25 * TS + TS / 2, py = 53 * TS + TS / 2`) — not
    // independently re-derived, so a future change to one is a visible
    // mismatch here rather than a silent drift.
    expect(region.arrivalPoint).toEqual({ x: 25, y: 53 });
  });

  it('Industrial Outskirts renders through the generic RegionScene, not WorldScene', () => {
    expect(getRegion('REGION_INDUSTRIAL_OUTSKIRTS').sceneKey).toBe('RegionScene');
  });

  it('has exactly 2 regions (one real region beyond Common Ground; more are future milestones, not promised here)', () => {
    expect(ALL_REGION_IDS.length).toBe(2);
  });

  it('REGION_COMMON_GROUND is always unlocked', () => {
    const ctx = { trust: 0, resilienceScore: 0, completedQuestIds: [] };
    expect(isRegionUnlocked(REGIONS.REGION_COMMON_GROUND.unlockRule, ctx)).toBe(true);
  });

  it('REGION_INDUSTRIAL_OUTSKIRTS requires at least 20 trust', () => {
    const rule = REGIONS.REGION_INDUSTRIAL_OUTSKIRTS.unlockRule;
    expect(isRegionUnlocked(rule, { trust: 19, resilienceScore: 100, completedQuestIds: [] })).toBe(false);
    expect(isRegionUnlocked(rule, { trust: 20, resilienceScore: 0, completedQuestIds: [] })).toBe(true);
  });

  // Closes the mutation-testing gap the 2026-09-20/21 Stryker audit found:
  // every REGIONS field except sceneKey/arrivalPoint(COMMON_GROUND)/unlockRule
  // had zero direct assertions.
  it('REGION_INDUSTRIAL_OUTSKIRTS has its own real label and arrival point', () => {
    const region = getRegion('REGION_INDUSTRIAL_OUTSKIRTS');
    expect(region.label).toBe('Industrial Outskirts');
    expect(region.arrivalPoint).toEqual({ x: 10, y: 10 });
    expect(region.unlockCondition.length).toBeGreaterThan(0);
  });

  it('REGION_COMMON_GROUND has its own real label and unlock condition text', () => {
    const region = getRegion('REGION_COMMON_GROUND');
    expect(region.label).toBe('Common Ground');
    expect(region.unlockCondition.length).toBeGreaterThan(0);
  });
});

describe('isRegionUnlocked', () => {
  it('evaluates a resilienceScore rule', () => {
    const rule = { type: 'resilienceScore' as const, threshold: 30 };
    expect(isRegionUnlocked(rule, { trust: 0, resilienceScore: 29, completedQuestIds: [] })).toBe(false);
    expect(isRegionUnlocked(rule, { trust: 0, resilienceScore: 30, completedQuestIds: [] })).toBe(true);
  });

  it('evaluates a questCompleted rule', () => {
    const rule = { type: 'questCompleted' as const, questId: 'skillshare-swap' };
    expect(isRegionUnlocked(rule, { trust: 0, resilienceScore: 0, completedQuestIds: [] })).toBe(false);
    expect(isRegionUnlocked(rule, { trust: 0, resilienceScore: 0, completedQuestIds: ['skillshare-swap'] })).toBe(true);
  });
});
