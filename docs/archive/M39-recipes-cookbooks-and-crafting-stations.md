# M39 — Recipes, Cookbooks & Crafting Stations

Story: [`docs/stories/EPIC-33-crafting-materials-and-upcycling.md`](../stories/EPIC-33-crafting-materials-and-upcycling.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 1.

Status: **Implemented 2026-09-19.**

## Section 1 — Recipe data and the known-recipes ("cookbook") state

New `apps/web/src/core/simulation/Recipes.ts`:
- [x] `RecipeId` + `Recipe { id, label, discipline, inputs: Partial<Record<MaterialToken, number>>, output: ItemToken, minMastery, tier }` — a small, static, hand-authored 7-recipe table (one per discipline plus one advanced/progression recipe), not player- or procedurally-generated. **Deviation, recorded not silent:** added a `label` field (for UI display) and a `tier: 'basic' | 'advanced'` field beyond the doc's original shape — `tier` is what actually gates crafting-station requirements (see Section 3), decoupled from `minMastery` so mastery-gating and station-gating are independently testable.
- [x] New `crafting: { knownRecipes: RecipeId[], mastery: Partial<Record<CraftDiscipline, number>>, craftedItems: Partial<Record<ItemToken, number>>, collectedCookbookPoints: string[] }` slice on `GameState`. **Deviation, recorded not silent, and deliberately *not* a defensive merge:** rather than nesting crafted-item counts inside M38's existing `inventory` slice (which would have been a *new field on an already-existing* slice — exactly the case `useGameStore.test.ts` proved zustand's shallow merge does **not** protect, since the whole `inventory` object gets replaced wholesale from an old save), `craftedItems`/`collectedCookbookPoints` live inside this brand-new top-level `crafting` slice instead, alongside `knownRecipes`/`mastery` — keeping the same "brand-new top-level key needs no migration code" safety property M38 established, rather than reopening the defensive-merge question this milestone.
- [x] Recipes start **unknown** by default (`INITIAL_STATE.crafting.knownRecipes = []`) — nothing is available from `CraftingModal` on day one.

## Section 2 — Cookbook discovery

- [x] New `apps/web/src/world/CookbookPickups.ts` — 4 fixed, deterministic world pickups (Greenwood Corner/woodwork, Tool Library yard/metalwork, Greenhouse plaza/horticulture, Grocer courtyard/culinary), mirroring `ScavengePoints.ts`'s pattern exactly (a cookbook pickup grants a `RecipeId` via the new `collectCookbook()` action instead of a material stack). Coordinates verified programmatically against the real `buildMap()`/`OUTDOOR_DRESSING_PROPS`/`SCAVENGE_POINTS` data (a throwaway Node type-stripped script, same technique as M38) — all 4 candidates passed on the first attempt this time.
- [x] **Correction to this doc's original wording, recorded not silent:** no trust-gating mechanism existed anywhere in the dialogue system before this milestone (confirmed by direct read of `NpcDialogues.ts`/`DialogueOverlay.ts` — dialogue trees only ever rotated by day number). Built the real mechanism instead of "reusing" a nonexistent one: `DialogueNode` gained optional `teachesRecipe`/`minTrust` fields, and `DialogueOverlay` gained a `playerTrust`/`onTeach` constructor param pair that fires the moment a teaching node renders and `playerTrust >= minTrust`. Wired onto 3 existing terminal dialogue nodes: Elena teaches `RECIPE_WIRED_LAMP` (minTrust 20), Higgins teaches `RECIPE_MENDED_JACKET` (minTrust 20), Marcus teaches the advanced `RECIPE_UPCYCLED_WORKBENCH` (minTrust 30) — no new NPCs or dialogue trees added.
- [x] No true randomness in discovery — every cookbook location and every NPC-taught recipe is fixed, hand-placed content.

## Section 3 — Crafting UI and stations (station *locations* are a data stub — real buildings are EPIC-34's job)

New `apps/web/src/ui/CraftingModal.ts` (modeled on `ShopModal.ts`'s `.settings-panel`/`.shop-grid`/`.shop-card` layout — a closer template than `CrisisWireModal.ts` since this is a catalog grid, not a binary A/B choice; reuses `.delta-chip`/`.crisis-btn-deltas` for material-requirement chips):
- [x] A craft action: `checkCraftEligibility()`/`consumeRecipeInputs()` (pure, testable functions in `Recipes.ts`, mirroring `applyDailyTick()`'s discipline) determine eligibility and compute the post-craft materials map; `actions.ts`'s `craftRecipe()` wraps them in a single `setState()` call, consuming inputs, incrementing discipline mastery (capped at 10) and `craftedItems[output]`.
- [x] `CraftingStation { id, discipline, requiredTier }` + `stationSupportsRecipe()` as a data/pure-function stub only — real station placement is EPIC-34/M42's job. Per the doc's original scope note, `tier: 'basic'` recipes can be crafted anywhere (`craftRecipe()`'s default `atStation = false` only blocks `tier: 'advanced'`); `RECIPE_UPCYCLED_WORKBENCH` can be **learned** now (Marcus teaches it) but not actually **crafted** until M42 provides a real station — an explicit, tested forward dependency, not a silent gap.

## Architecture notes / non-goals

See [EPIC-33](../stories/EPIC-33-crafting-materials-and-upcycling.md)'s epic-wide non-goals. No selling/economy integration yet — that's M40. No real building-station placement yet — that's EPIC-34/M42, tracked as an explicit forward dependency (`RECIPE_UPCYCLED_WORKBENCH` is deliberately learnable-but-uncraftable until then), not silently assumed done here. A "Craft 🛠" button was added to `TopHUD`'s secondary menu drawer (opens `CraftingModal`), following the same `registerButton()` pattern as the existing Shop/Social/Builder buttons.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 473/473 passing (35 new: 13 in `Recipes.test.ts`, 6 in `CookbookPickups.test.ts`, 8 in `actions.test.ts`'s new `learnRecipe`/`collectCookbook`/`craftRecipe` blocks, 3 in `DialogueOverlay.test.ts`'s new gating block, 1 in `NpcDialogues.test.ts`'s new teaching-node check, plus 4 pre-existing tests' behavior unchanged).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (147 modules, PWA precache regenerated).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 9 changed/new source files return HTTP 200. Full interactive pick-up-a-cookbook → craft-in-modal confirmation stays manual, the same limitation noted for every prior visual/interaction milestone.
