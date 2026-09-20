/**
 * M39 — EPIC-33 §1/§3. Recipe data + the pure craft function, following
 * `EconomyMath.ts`'s applyDailyTick()/CrisisEngine.ts's consequences shape:
 * a small, static, hand-authored table (never player- or procedurally-
 * generated, per CLAUDE.md's headless-simulation rule) plus pure functions
 * that only report what *would* happen — `actions.ts`'s `craftRecipe()` is
 * the only place that actually mutates the store, mirroring `applyCraft()`
 * being called from inside a `setState()` callback the same way
 * `applyDailyTick()` is.
 */

import type { MaterialToken } from './Materials';

// A fixed 6-discipline cap for v1 (see the vision doc's Pillar 1 "is this
// too broad" answer) — every recipe belongs to exactly one.
export type CraftDiscipline = 'metalwork' | 'woodwork' | 'textiles' | 'electronics' | 'horticulture' | 'culinary';

export const CRAFT_DISCIPLINES: readonly CraftDiscipline[] = [
  'metalwork', 'woodwork', 'textiles', 'electronics', 'horticulture', 'culinary',
];

// Crafted-goods token — same flat-string-literal, no-hardcoded-asset design
// as InteriorProps.ts's PropToken/OutdoorDressing.ts's OutdoorPropToken.
// M39's 7 proved the base loop; M40 adds 5 more for the two flagship deep
// chains (bike, computer) named directly in the vision doc.
export type ItemToken =
  | 'ITEM_SCRAP_STOOL'
  | 'ITEM_PLANTER_BOX'
  | 'ITEM_MENDED_JACKET'
  | 'ITEM_WIRED_LAMP'
  | 'ITEM_FORAGED_POUCH'
  | 'ITEM_SIMPLE_STEW'
  | 'ITEM_UPCYCLED_WORKBENCH'
  | 'ITEM_UPCYCLED_BIKE'
  | 'ITEM_BASIC_TOOLS'
  | 'ITEM_SALVAGE_RADIO'
  | 'ITEM_CIRCUIT_BOARD'
  | 'ITEM_UPCYCLED_COMPUTER';

export type RecipeId =
  | 'RECIPE_SCRAP_STOOL'
  | 'RECIPE_PLANTER_BOX'
  | 'RECIPE_MENDED_JACKET'
  | 'RECIPE_WIRED_LAMP'
  | 'RECIPE_FORAGED_POUCH'
  | 'RECIPE_SIMPLE_STEW'
  | 'RECIPE_UPCYCLED_WORKBENCH'
  | 'RECIPE_UPCYCLED_BIKE'
  | 'RECIPE_BASIC_TOOLS'
  | 'RECIPE_SALVAGE_RADIO'
  | 'RECIPE_CIRCUIT_BOARD'
  | 'RECIPE_UPCYCLED_COMPUTER';

// M40 §1. A crafted item's downstream behavior, data-driven rather than a
// switch statement scattered across UI files. 'component' items exist only
// to feed a later recipe's itemInputs (see Recipe below) — they are
// deliberately *not* sellable unless also tagged 'sellable', which is what
// forces the deep chains to actually be chains rather than every tier also
// being a dead-end cash-out. 'usable' is this milestone's own addition
// (beyond the doc's equippable/furniture/sellable) — the computer needs a
// 4th kind to represent "opens the terminal/BBS affordance" as data rather
// than a hardcoded `if (item === 'ITEM_UPCYCLED_COMPUTER')` in the UI.
export type ItemKind = 'equippable' | 'furniture' | 'sellable' | 'component' | 'usable';

export interface ItemDefinition {
  token: ItemToken;
  label: string;
  kinds: readonly ItemKind[];
  /** Base cash value before `masteryMultiplier()` — 0 for pure components
   *  that are never sellable. Lives here (not on Recipe) because selling
   *  only needs to know about the item, not which recipe produced it. */
  baseSellValue: number;
  /** Which discipline's mastery scales this item's sell value — the
   *  discipline of the recipe that produces it. */
  discipline: CraftDiscipline;
}

export const ITEM_DEFINITIONS: Record<ItemToken, ItemDefinition> = {
  ITEM_SCRAP_STOOL: { token: 'ITEM_SCRAP_STOOL', label: 'Scrap-Metal Stool', kinds: ['furniture', 'sellable'], baseSellValue: 8, discipline: 'metalwork' },
  ITEM_PLANTER_BOX: { token: 'ITEM_PLANTER_BOX', label: 'Reclaimed Planter Box', kinds: ['furniture', 'sellable'], baseSellValue: 7, discipline: 'woodwork' },
  ITEM_MENDED_JACKET: { token: 'ITEM_MENDED_JACKET', label: 'Mended Jacket', kinds: ['equippable', 'sellable'], baseSellValue: 12, discipline: 'textiles' },
  ITEM_WIRED_LAMP: { token: 'ITEM_WIRED_LAMP', label: 'Wired Salvage Lamp', kinds: ['furniture', 'sellable'], baseSellValue: 10, discipline: 'electronics' },
  ITEM_FORAGED_POUCH: { token: 'ITEM_FORAGED_POUCH', label: 'Foraged Goods Pouch', kinds: ['sellable'], baseSellValue: 6, discipline: 'horticulture' },
  ITEM_SIMPLE_STEW: { token: 'ITEM_SIMPLE_STEW', label: 'Simple Mushroom Stew', kinds: ['sellable'], baseSellValue: 5, discipline: 'culinary' },
  ITEM_UPCYCLED_WORKBENCH: { token: 'ITEM_UPCYCLED_WORKBENCH', label: 'Upcycled Workbench', kinds: ['furniture', 'sellable'], baseSellValue: 30, discipline: 'metalwork' },
  ITEM_BASIC_TOOLS: { token: 'ITEM_BASIC_TOOLS', label: 'Basic Tools', kinds: ['component'], baseSellValue: 0, discipline: 'metalwork' },
  ITEM_SALVAGE_RADIO: { token: 'ITEM_SALVAGE_RADIO', label: 'Salvage Radio', kinds: ['component', 'sellable'], baseSellValue: 18, discipline: 'electronics' },
  ITEM_CIRCUIT_BOARD: { token: 'ITEM_CIRCUIT_BOARD', label: 'Reclaimed Circuit Board', kinds: ['component'], baseSellValue: 0, discipline: 'electronics' },
  ITEM_UPCYCLED_COMPUTER: { token: 'ITEM_UPCYCLED_COMPUTER', label: 'Upcycled Computer', kinds: ['sellable', 'usable'], baseSellValue: 60, discipline: 'electronics' },
  ITEM_UPCYCLED_BIKE: { token: 'ITEM_UPCYCLED_BIKE', label: 'Upcycled Bike', kinds: ['sellable'], baseSellValue: 45, discipline: 'metalwork' },
};

// M40 §3. A small, pure, testable formula (mirrors EconomyMath.ts's style):
// +10% sell value per mastery point, capped at mastery 10 (2x base) since
// mastery itself is capped at 10 in actions.ts's craftRecipe().
export function masteryMultiplier(mastery: number): number {
  return 1 + Math.max(0, Math.min(10, mastery)) * 0.1;
}

export function sellValueFor(item: ItemToken, mastery: number): number {
  return Math.round(ITEM_DEFINITIONS[item].baseSellValue * masteryMultiplier(mastery));
}

export interface Recipe {
  id: RecipeId;
  label: string;
  discipline: CraftDiscipline;
  inputs: Partial<Record<MaterialToken, number>>;
  /** M40 §3 — EPIC-33. A "deep chain" recipe can also consume other crafted
   *  *items* (not just raw materials), so a tier's output genuinely feeds
   *  the next tier's input rather than every recipe bottoming out at the
   *  same 15-token material pool. Optional and empty for every M39 recipe. */
  itemInputs?: Partial<Record<ItemToken, number>>;
  output: ItemToken;
  /** Minimum discipline mastery (0-10) required to craft this — see
   *  `craftDisciplineMastery()`. Every "basic" recipe starts at 0 so nothing
   *  is double-gated on both an unknown recipe *and* mastery at once. */
  minMastery: number;
  /** Mirrors CraftingStation.requiredTier (§3) — 'advanced' recipes cannot
   *  actually be crafted until EPIC-34/M42 places a real station of that
   *  tier in the world; they can still be learned early (see
   *  CookbookPickups.ts/NpcDialogues.ts) so mastery-gating and station-
   *  gating are separate, individually testable, concerns. M40's own deep-
   *  chain recipes are all deliberately kept `tier: 'basic'` (mastery-gated
   *  only, no station requirement) — station-gating an entire multi-craft
   *  chain behind an unbuilt EPIC-34/M42 building would make this
   *  milestone's own verification section (craft the chain end-to-end)
   *  undeliverable, so `'advanced'` stays reserved for M39's one flagged
   *  example. */
  tier: 'basic' | 'advanced';
}

export const RECIPES: Record<RecipeId, Recipe> = {
  RECIPE_SCRAP_STOOL: {
    id: 'RECIPE_SCRAP_STOOL',
    label: 'Scrap-Metal Stool',
    discipline: 'metalwork',
    inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 },
    output: 'ITEM_SCRAP_STOOL',
    minMastery: 0,
    tier: 'basic',
  },
  RECIPE_PLANTER_BOX: {
    id: 'RECIPE_PLANTER_BOX',
    label: 'Reclaimed Planter Box',
    discipline: 'woodwork',
    inputs: { MATERIAL_RECLAIMED_WOOD: 2, MATERIAL_WOOD: 1 },
    output: 'ITEM_PLANTER_BOX',
    minMastery: 0,
    tier: 'basic',
  },
  RECIPE_MENDED_JACKET: {
    id: 'RECIPE_MENDED_JACKET',
    label: 'Mended Jacket',
    discipline: 'textiles',
    inputs: { MATERIAL_WOOL: 2, MATERIAL_COTTON: 1, MATERIAL_LEATHER: 1 },
    output: 'ITEM_MENDED_JACKET',
    minMastery: 0,
    tier: 'basic',
  },
  RECIPE_WIRED_LAMP: {
    id: 'RECIPE_WIRED_LAMP',
    label: 'Wired Salvage Lamp',
    discipline: 'electronics',
    inputs: { MATERIAL_WIRE: 2, MATERIAL_GLASS: 1, MATERIAL_ELECTRONIC_COMPONENT: 1 },
    output: 'ITEM_WIRED_LAMP',
    minMastery: 0,
    tier: 'basic',
  },
  RECIPE_FORAGED_POUCH: {
    id: 'RECIPE_FORAGED_POUCH',
    label: 'Foraged Goods Pouch',
    discipline: 'horticulture',
    inputs: { MATERIAL_MUSHROOM: 2, MATERIAL_RESIN: 1, MATERIAL_LEATHER: 1 },
    output: 'ITEM_FORAGED_POUCH',
    minMastery: 0,
    tier: 'basic',
  },
  RECIPE_SIMPLE_STEW: {
    id: 'RECIPE_SIMPLE_STEW',
    label: 'Simple Mushroom Stew',
    discipline: 'culinary',
    inputs: { MATERIAL_MUSHROOM: 3, MATERIAL_WOOD: 1 },
    output: 'ITEM_SIMPLE_STEW',
    minMastery: 0,
    tier: 'basic',
  },
  // Advanced/progression recipe — proves the mastery gate for real (Marcus
  // teaches it, see NpcDialogues.ts, but it needs metalwork mastery 2 from
  // repeated RECIPE_SCRAP_STOOL crafts *and* a real crafting station, which
  // doesn't exist in the world until EPIC-34/M42 — see `tier` above).
  RECIPE_UPCYCLED_WORKBENCH: {
    id: 'RECIPE_UPCYCLED_WORKBENCH',
    label: 'Upcycled Workbench',
    discipline: 'metalwork',
    inputs: { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 },
    output: 'ITEM_UPCYCLED_WORKBENCH',
    minMastery: 2,
    tier: 'advanced',
  },

  // ── M40 §3 flagship chain 1: the bike ─────────────────────────────────────
  RECIPE_UPCYCLED_BIKE: {
    id: 'RECIPE_UPCYCLED_BIKE',
    label: 'Upcycled Bike',
    discipline: 'metalwork',
    inputs: { MATERIAL_SCRAP_METAL: 5, MATERIAL_RUBBER: 3, MATERIAL_RECLAIMED_WOOD: 2 },
    output: 'ITEM_UPCYCLED_BIKE',
    minMastery: 3,
    tier: 'basic',
  },

  // ── M40 §3 flagship chain 2: the computer (4 tiers) ───────────────────────
  // Tier 1 — basic tools. Feeds the radio via itemInputs below.
  RECIPE_BASIC_TOOLS: {
    id: 'RECIPE_BASIC_TOOLS',
    label: 'Basic Tools',
    discipline: 'metalwork',
    inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_WIRE: 1 },
    output: 'ITEM_BASIC_TOOLS',
    minMastery: 0,
    tier: 'basic',
  },
  // Tier 2 — a salvage radio, assembled *with* a set of basic tools (the
  // first itemInputs consumer in this codebase — tools are used up, not
  // kept, same as raw materials are).
  RECIPE_SALVAGE_RADIO: {
    id: 'RECIPE_SALVAGE_RADIO',
    label: 'Salvage Radio',
    discipline: 'electronics',
    inputs: { MATERIAL_GLASS: 1, MATERIAL_WIRE: 2, MATERIAL_ELECTRONIC_COMPONENT: 2 },
    itemInputs: { ITEM_BASIC_TOOLS: 1 },
    output: 'ITEM_SALVAGE_RADIO',
    minMastery: 1,
    tier: 'basic',
  },
  // Tier 3 — a circuit board. The vision doc's "copper" isn't one of M38's
  // fixed 15 material tokens; substituted MATERIAL_SCRAP_METAL (a copper-
  // bearing salvage material) alongside MATERIAL_RESIN as originally named
  // — recorded here, not silently changed. Deliberately **not** taught by
  // any NPC (see NpcDialogues.ts) and has no NPC dialogue hook — the *only*
  // way to learn it is CookbookPickups.ts's dedicated found-only pickup,
  // per the doc's explicit "gated behind a found, not default, cookbook".
  RECIPE_CIRCUIT_BOARD: {
    id: 'RECIPE_CIRCUIT_BOARD',
    label: 'Reclaimed Circuit Board',
    discipline: 'electronics',
    inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_RESIN: 2 },
    output: 'ITEM_CIRCUIT_BOARD',
    minMastery: 2,
    tier: 'basic',
  },
  // Tier 4 — the computer itself. Consumes a radio *and* a circuit board
  // (itemInputs), tying the whole chain together; "reclaimed plastic" from
  // the vision doc likewise isn't a fixed material token — substituted
  // MATERIAL_RUBBER, recorded not silent. Grants the terminal/BBS
  // affordance via its 'usable' ItemKind (see CraftingModal.ts/
  // TerminalModal.ts), not as a trophy item with no effect.
  RECIPE_UPCYCLED_COMPUTER: {
    id: 'RECIPE_UPCYCLED_COMPUTER',
    label: 'Upcycled Computer',
    discipline: 'electronics',
    inputs: { MATERIAL_RUBBER: 2 },
    itemInputs: { ITEM_SALVAGE_RADIO: 1, ITEM_CIRCUIT_BOARD: 1 },
    output: 'ITEM_UPCYCLED_COMPUTER',
    minMastery: 3,
    tier: 'basic',
  },
};

export const RECIPE_IDS: readonly RecipeId[] = Object.keys(RECIPES) as RecipeId[];

export type CraftFailureReason = 'unknown-recipe' | 'insufficient-mastery' | 'missing-materials' | 'missing-item-inputs' | 'requires-crafting-station';

export interface CraftCheckResult {
  ok: boolean;
  reason?: CraftFailureReason;
}

/** Pure eligibility check — station-gating (`tier === 'advanced'`) is
 *  reported as a failure reason here since no real station placement exists
 *  yet (EPIC-34/M42's job); `atStation` lets a future caller (M42) opt back
 *  in without changing this function's signature. `craftedItems` is only
 *  consulted for recipes with `itemInputs` (M40's deep chains) — every M39
 *  recipe ignores it entirely, so passing `{}` is always safe for those. */
export function checkCraftEligibility(
  recipe: Recipe,
  knownRecipeIds: readonly RecipeId[],
  materials: Partial<Record<MaterialToken, number>>,
  mastery: number,
  atStation = false,
  craftedItems: Partial<Record<ItemToken, number>> = {},
): CraftCheckResult {
  if (!knownRecipeIds.includes(recipe.id)) return { ok: false, reason: 'unknown-recipe' };
  if (mastery < recipe.minMastery) return { ok: false, reason: 'insufficient-mastery' };
  if (recipe.tier === 'advanced' && !atStation) return { ok: false, reason: 'requires-crafting-station' };
  const hasAllInputs = (Object.entries(recipe.inputs) as [MaterialToken, number][])
    .every(([token, amount]) => (materials[token] ?? 0) >= amount);
  if (!hasAllInputs) return { ok: false, reason: 'missing-materials' };
  if (recipe.itemInputs) {
    const hasAllItemInputs = (Object.entries(recipe.itemInputs) as [ItemToken, number][])
      .every(([token, amount]) => (craftedItems[token] ?? 0) >= amount);
    if (!hasAllItemInputs) return { ok: false, reason: 'missing-item-inputs' };
  }
  return { ok: true };
}

/** Returns a new materials map with the recipe's inputs subtracted — never
 *  mutates the input map, matching `applyDailyTick()`'s pure-transform
 *  discipline. Caller must have already confirmed eligibility. */
export function consumeRecipeInputs(
  recipe: Recipe,
  materials: Partial<Record<MaterialToken, number>>,
): Partial<Record<MaterialToken, number>> {
  const next = { ...materials };
  (Object.entries(recipe.inputs) as [MaterialToken, number][]).forEach(([token, amount]) => {
    next[token] = (next[token] ?? 0) - amount;
  });
  return next;
}

/** M40 §3 — the itemInputs counterpart to consumeRecipeInputs(). Never
 *  mutates the input map. A no-op (returns the same-shaped copy) for every
 *  recipe without itemInputs. */
export function consumeRecipeItemInputs(
  recipe: Recipe,
  craftedItems: Partial<Record<ItemToken, number>>,
): Partial<Record<ItemToken, number>> {
  const next = { ...craftedItems };
  if (!recipe.itemInputs) return next;
  (Object.entries(recipe.itemInputs) as [ItemToken, number][]).forEach(([token, amount]) => {
    next[token] = (next[token] ?? 0) - amount;
  });
  return next;
}

// Crafting-station contract stub (§3) — real station *locations* are
// EPIC-34/M42's job; this just defines the shape M42 will attach to real
// buildings, and the tier-check function above already treats "no station"
// as the correct default for 'advanced' recipes.
export interface CraftingStation {
  id: string;
  discipline: CraftDiscipline;
  requiredTier: 'basic' | 'advanced';
}

export function stationSupportsRecipe(station: CraftingStation, recipe: Recipe): boolean {
  if (station.discipline !== recipe.discipline) return false;
  if (recipe.tier === 'advanced' && station.requiredTier !== 'advanced') return false;
  return true;
}
