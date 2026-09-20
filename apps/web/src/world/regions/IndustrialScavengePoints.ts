import type { MaterialToken } from '../../core/simulation/Materials';

/**
 * M45 — EPIC-35 §3. Mirrors `ScavengePoints.ts`'s (M38) fixed, deterministic
 * token+placement pattern exactly, scoped to the Industrial Outskirts
 * region's own coordinate space (`RegionScene.ts`'s grid) instead of the
 * town's. Ids are prefixed `outskirts-` so they can never collide with
 * `ScavengePoints.ts`'s ids in the single flat
 * `inventory.collectedScavengePoints` list `collectMaterial()` shares
 * across every scene — deliberate, not accidental.
 */
export interface RegionScavengePointPlacement {
  id: string;
  material: MaterialToken;
  amount: number;
  x: number;
  y: number;
}

export const INDUSTRIAL_SCAVENGE_POINTS: readonly RegionScavengePointPlacement[] = [
  { id: 'outskirts-iron-1', material: 'MATERIAL_IRON', amount: 3, x: 8, y: 25 },
  { id: 'outskirts-coal-1', material: 'MATERIAL_COAL', amount: 3, x: 26, y: 10 },
  { id: 'outskirts-scrap-1', material: 'MATERIAL_SCRAP_METAL', amount: 3, x: 14, y: 4 },
];
