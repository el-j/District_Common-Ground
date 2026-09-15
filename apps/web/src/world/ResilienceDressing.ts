/**
 * M21 — Resilience-Tier Environmental Dressing (spec §5.2).
 *
 * `WorldScene.applyResilienceTier()` previously inlined its score
 * thresholds directly against CSS class names. `resilienceTier()` below
 * extracts that same threshold logic into one pure, testable classifier —
 * mirroring how `weatherTier()` already isolates WeatherSystem.ts from the
 * Phaser rendering it drives — so there is exactly one place the
 * score-to-tier boundaries live, not two.
 *
 * `dressingTierFor()`/`dressingPropsForTier()` map that same tier onto the
 * spec's three named world-dressing states and a small, fixed set of
 * street-front props. This only adds the *asset* half of §5.2 — the
 * existing `world--crisis`/`world--thriving` CSS filter classes already
 * handle the mood/lighting half correctly and are untouched.
 *
 * Explicitly out of scope (see EPIC-21 / M21 task doc): full tile-level
 * retexturing of every street tile per tier. This is a handful of
 * fixed-position dressing props at named street-front locations, not a
 * tilemap-wide per-tier retexture pass.
 */

export type ResilienceTier = 'emergency' | 'crisis' | 'stabilising' | 'thriving';

export function resilienceTier(score: number): ResilienceTier {
  if (score < 15) return 'emergency';
  if (score < 30) return 'crisis';
  if (score < 60) return 'stabilising';
  return 'thriving';
}

export type DressingTier = 'grimSqueeze' | 'organizing' | 'flourishingCommons';

export function dressingTierFor(score: number): DressingTier {
  const tier = resilienceTier(score);
  if (tier === 'emergency' || tier === 'crisis') return 'grimSqueeze';
  if (tier === 'stabilising') return 'organizing';
  return 'flourishingCommons';
}

export type DressingPropToken =
  | 'PROP_BOARDED_WINDOW'
  | 'PROP_CRACKED_ASPHALT'
  | 'PROP_MARKET_STALL'
  | 'PROP_FLOWER_PLANTER'
  | 'PROP_BUNTING';

export interface DressingPlacement {
  token: DressingPropToken;
  x: number; // tile column
  y: number; // tile row
}

// Fixed street-front coordinates, near the Corner Grocer (17,49–23,57) and
// the Central Plaza (9,23–38,40) — the same locations across every tier so
// swapping tiers reads as "the same storefront changed", not a new prop
// appearing out of nowhere.
const GRIM_SQUEEZE_PROPS: DressingPlacement[] = [
  { token: 'PROP_BOARDED_WINDOW', x: 20, y: 49 },
  { token: 'PROP_CRACKED_ASPHALT', x: 25, y: 42 },
];

const ORGANIZING_PROPS: DressingPlacement[] = [
  { token: 'PROP_MARKET_STALL', x: 24, y: 30 },
];

const FLOURISHING_COMMONS_PROPS: DressingPlacement[] = [
  { token: 'PROP_FLOWER_PLANTER', x: 20, y: 49 },
  { token: 'PROP_BUNTING', x: 24, y: 30 },
];

export function dressingPropsForTier(tier: DressingTier): DressingPlacement[] {
  switch (tier) {
    case 'grimSqueeze':
      return GRIM_SQUEEZE_PROPS;
    case 'organizing':
      return ORGANIZING_PROPS;
    case 'flourishingCommons':
      return FLOURISHING_COMMONS_PROPS;
  }
}
