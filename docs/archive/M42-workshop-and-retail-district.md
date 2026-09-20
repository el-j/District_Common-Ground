# M42 — Workshop & Retail District

Story: [`docs/stories/EPIC-34-buildings-as-plugins-and-interiors.md`](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 2.

Status: **Implemented 2026-09-19.**

## Section 1 — Metalwork & Woodworking Workshops

- [x] Two new building footprints in a new "South Canal Workshop & Retail Row" (`MapData.ts`, cols 52-62/rows 44-74 — a genuinely free 11×19-then-4×13 grass block, confirmed 100% untouched via a throwaway Node type-stripped script before any `drawBuilding()` call, same discipline as every M32/M38-M41 coordinate), built on M41's `BuildingInterior` framework (door-triggered `InteriorScene` entry — zero extra `WorldScene.ts` wiring needed, since M41's door-prompt loop iterates `ALL_INTERIOR_IDS` generically). Each houses a real `CraftingStation` (M39 §3: `{id, discipline, requiredTier: 'advanced'}`) plus one NPC (Priya at Metalwork, Dax at Woodworking). **Deviation, recorded not silent:** each NPC gets a single fixed dialogue tree, not the 5-tree day-rotation pattern M23/M26 established for the open-world roster — a deliberate scope reduction for minor, static, one-room interior characters, not a gap.
- [x] This turns M39's `CraftingStation` data stub into a real, enterable location: `RECIPE_UPCYCLED_WORKBENCH` (M39's one `tier: 'advanced'` recipe) is now actually craftable, not just learnable, from inside the Metalwork Workshop — `CraftingModal.ts` gained an optional `station` constructor param, and `InteriorScene.ts`'s "Craft here 🛠" interactable passes it through so `stationSupportsRecipe()`/`craftRecipe(id, atStation)` resolve for real.

## Section 2 — Baumarkt (Hardware Store) & Supermarket

- [x] Two more building footprints, each a retail interior. **Design decision, recorded not silent:** rather than inventing a second item-catalog system for "food/daily goods," both stores are wired to the same M38 §3 `MATERIAL_PRICES`/`MATERIAL_CATEGORY` data, split by category — Baumarkt sells the urban-salvage half (scrap metal, reclaimed wood, glass, rubber, electronic components, wire: fixable/buildable stock) and Supermarket sells the raw/natural half (wood, stone, iron, coal, resin, wool, cotton, leather, mushroom) — a real, data-driven, non-arbitrary split using a taxonomy that already exists, giving each store a genuinely distinct catalog from the existing Corner Grocer and from each other without a new invented item system.
- [x] New `apps/web/src/ui/RetailModal.ts`, modeled on `ShopModal.ts`'s card-grid layout (closer template than `CraftingModal.ts` here too — a flat buy-1 catalog, not eligibility-gated crafting), wired to a new `buyMaterial()` action in `actions.ts` (spends cash via the same `Math.max(0, ...)`-floor pattern `spendCash()` uses, rejects an unaffordable purchase rather than allowing negative cash).

## Section 3 — Library (cookbook source)

- [x] A building interior with 3 fixed cookbook pickups (`InteriorScene.ts` renders/collects them via the same `collectCookbook()` action CookbookPickups.ts's open-world ones use — same mechanic, a different placement surface) plus Ezra, an NPC who teaches a 4th recipe via dialogue once trust crosses a threshold (reusing M39's exact `teachesRecipe`/`minTrust` mechanism). **Real gap found and closed, not left open:** M40 authored 5 new recipes (the bike + the 4-tier computer chain) but never gave *any* of them a discovery path — `RECIPE_CIRCUIT_BOARD`'s own doc comment and a dedicated `NpcDialogues.test.ts` negative-check both already asserted "found-cookbook-only," but no cookbook existed anywhere until this milestone. Closed here: the Library teaches `RECIPE_CIRCUIT_BOARD`, `RECIPE_BASIC_TOOLS`, and `RECIPE_UPCYCLED_COMPUTER` (cookbooks), Priya at the Metalwork Workshop teaches `RECIPE_UPCYCLED_BIKE` (dialogue), and Ezra teaches `RECIPE_SALVAGE_RADIO` (dialogue) — all 5 previously-undiscoverable M40 recipes now have a real path into `knownRecipes`.

## Architecture notes / non-goals

See [EPIC-34](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)'s epic-wide non-goals. All 5 buildings use the data-only `InteriorProps.ts`-style definition (not full `packages/building-*` plugins) — none of the 5 proved substantial enough to warrant packaging; `BuildingInteriorLoader.ts` (M41) remains unused by real content, as flagged there. `InteriorScene.ts` was generalized from a single "exit" interactable to an `Interactable[]` list (exit + optional crafting station / retail entry / cookbook pickups / NPC), the nearest one in range winning the shared HUD action slot each frame — the same shape `WorldScene.handleInteractions()` already uses, just scoped to one room. `InteriorDefinition` gained 4 new optional fields (`craftingStation`, `retailCategory`, `cookbookPickups`, `npc`) rather than 4 separate per-building-type interfaces, since every one of the 8 interiors (3 from M21, 5 from this milestone) already shares the same base shape.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 508/508 passing (5 new in `InteriorProps.test.ts`: crafting-station/retail-category assignment, cookbook/NPC placement bounds, Library's 3-cookbook content, no-tile-collision-within-an-interior; `NpcDialogues.test.ts`'s teaching-node count updated 3→5; `actions.test.ts`'s new `buyMaterial` block).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (152 modules; `RetailModal.ts` code-splits into its own chunk via the dynamic `import()` `InteriorScene.ts` uses to open it, confirming that lazy-load path actually works).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 7 changed/new source files return HTTP 200. **No dedicated unit test file for `RetailModal.ts`/`CraftingModal.ts`'s new station-awareness**, matching `ShopModal.ts`'s own established precedent (no complex DOM+Phaser-adjacent modal in this codebase has one — verified via `tsc`/build/live-serve and manual QA instead, while the pure data/logic underneath, `Recipes.ts`/`Materials.ts`/`actions.ts`, carries the real test coverage). The full interactive walk-to-workshop → craft-at-station → walk-to-Baumarkt → buy-materials round trip stays manual, the same limitation noted for every prior visual/interaction milestone (and explicitly for M41's own scene-lifecycle mechanics, which this milestone's content sits on top of).
