import type { RecipeId } from '../core/simulation/Recipes';

/**
 * M39 — EPIC-33 §2. Mirrors `ScavengePoints.ts`'s (M38) fixed, deterministic
 * token+placement pattern exactly, one level up: instead of granting a
 * material stack, picking one up grants a known `RecipeId`. Coordinates
 * verified programmatically against the real `buildMap()`/
 * `OUTDOOR_DRESSING_PROPS`/`SCAVENGE_POINTS` data (a throwaway Node
 * type-stripped script, same as M38), not eyeballed. Not every recipe has a
 * world cookbook — the rest are taught by NPCs (see NpcDialogues.ts) or
 * (RECIPE_UPCYCLED_WORKBENCH) both taught *and* mastery/station-gated.
 */
export interface CookbookPickupPlacement {
  id: string;
  recipe: RecipeId;
  x: number;
  y: number;
}

export const COOKBOOK_PICKUPS: readonly CookbookPickupPlacement[] = [
  { id: 'greenwood-corner-cookbook', recipe: 'RECIPE_PLANTER_BOX', x: 12, y: 18 },
  { id: 'tool-library-yard-cookbook', recipe: 'RECIPE_SCRAP_STOOL', x: 43, y: 37 },
  { id: 'greenhouse-plaza-cookbook', recipe: 'RECIPE_FORAGED_POUCH', x: 28, y: 76 },
  { id: 'grocer-courtyard-cookbook', recipe: 'RECIPE_SIMPLE_STEW', x: 25, y: 52 },
  // M40 §3 — the circuit-board recipe is deliberately found-only (no NPC
  // teaches it, see Recipes.ts's RECIPE_CIRCUIT_BOARD comment); placed near
  // the Utility Station, the map's one other electronics-flavored building.
  { id: 'utility-station-cookbook', recipe: 'RECIPE_CIRCUIT_BOARD', x: 44, y: 19 },
];
