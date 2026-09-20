/**
 * M44 — EPIC-35 §1. The region/travel data model. Pure data, no Phaser
 * dependency, mirroring `InteriorProps.ts`'s "pure registry" shape.
 * `REGION_COMMON_GROUND` wraps the existing town with zero behavior change.
 *
 * M45 — EPIC-35 §3 (Region Content Pass #1). `REGION_INDUSTRIAL_OUTSKIRTS`
 * is no longer M44's flat placeholder — `RegionScene.ts` now renders real
 * hand-authored content for it (ash ground, rail sidings, scrap-pile
 * decoration, 3 material scavenging points, 2 NPCs, and the Scrapyard
 * Depot building). Label/unlockCondition updated to match; `arrivalPoint`
 * unchanged (still collision-free against the new content, re-verified).
 *
 * M46 — EPIC-35 §2 (Fast Travel, World Map UI & Region-Aware Systems).
 * `unlockCondition` (flavor text) is joined by a real `unlockRule` — a
 * small discriminated union evaluated by the pure `isRegionUnlocked()`
 * below, consistent with the game's existing values (trust/resilience/
 * quest milestones, never currency, per EPIC-35's non-goals). Takes
 * already-resolved primitives rather than the whole `GameState`/store, so
 * this file stays the same "pure registry, no Phaser *or* store
 * dependency" shape `InteriorProps.ts` already established.
 */
export type RegionId = 'REGION_COMMON_GROUND' | 'REGION_INDUSTRIAL_OUTSKIRTS';

export interface RegionArrivalPoint {
  x: number;
  y: number;
}

export type RegionUnlockRule =
  | { type: 'always' }
  | { type: 'trust'; threshold: number }
  | { type: 'resilienceScore'; threshold: number }
  | { type: 'questCompleted'; questId: string };

export interface RegionUnlockContext {
  trust: number;
  resilienceScore: number;
  completedQuestIds: string[];
}

export function isRegionUnlocked(rule: RegionUnlockRule, ctx: RegionUnlockContext): boolean {
  switch (rule.type) {
    case 'always': return true;
    case 'trust': return ctx.trust >= rule.threshold;
    case 'resilienceScore': return ctx.resilienceScore >= rule.threshold;
    case 'questCompleted': return ctx.completedQuestIds.includes(rule.questId);
  }
}

export interface Region {
  id: RegionId;
  label: string;
  /** Which Phaser scene renders this region. The existing town's scene
   *  *is* `WorldScene` (this section is additive plumbing around it, not a
   *  rewrite — see the task doc's Section 1). Every other region renders
   *  through the new generic `RegionScene`, parametrized by `id` — a
   *  deliberately lighter-weight renderer than `WorldScene`'s full
   *  tilemap/NPC/dressing pipeline, appropriate for a milestone whose job
   *  is proving the mechanism, not shipping fidelity. */
  sceneKey: 'WorldScene' | 'RegionScene';
  arrivalPoint: RegionArrivalPoint;
  /** Human-readable flavor text describing `unlockRule` — shown by
   *  `WorldMapModal.ts` for a still-locked region. */
  unlockCondition: string;
  /** M46 — the real gating mechanism `WorldMapModal.ts`/`isRegionUnlocked()`
   *  evaluate. */
  unlockRule: RegionUnlockRule;
}

export const REGIONS: Record<RegionId, Region> = {
  REGION_COMMON_GROUND: {
    id: 'REGION_COMMON_GROUND',
    label: 'Common Ground',
    sceneKey: 'WorldScene',
    arrivalPoint: { x: 25, y: 53 }, // WorldScene.create()'s existing default spawn tile
    unlockCondition: 'Always available — home region.',
    unlockRule: { type: 'always' },
  },
  REGION_INDUSTRIAL_OUTSKIRTS: {
    id: 'REGION_INDUSTRIAL_OUTSKIRTS',
    label: 'Industrial Outskirts',
    sceneKey: 'RegionScene',
    arrivalPoint: { x: 10, y: 10 },
    // A low, archetype-sensitive bar (Pip/Morgan start above it, Arthur's
    // low starting trust starts below it) rather than a trivially-always-
    // true gate — real texture, not decoration. Consistent with the game's
    // existing values: trust, never currency (EPIC-35's own non-goal).
    unlockCondition: 'Requires at least 20 community trust — the rail crews only let people they vouch for ride out.',
    unlockRule: { type: 'trust', threshold: 20 },
  },
};

export const ALL_REGION_IDS: readonly RegionId[] = ['REGION_COMMON_GROUND', 'REGION_INDUSTRIAL_OUTSKIRTS'];

export function getRegion(id: RegionId): Region {
  return REGIONS[id];
}
