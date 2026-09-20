# M40 — Upcycled Goods, Selling & the Deep Crafting Chain

Story: [`docs/stories/EPIC-33-crafting-materials-and-upcycling.md`](../stories/EPIC-33-crafting-materials-and-upcycling.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 1.

Status: **Implemented 2026-09-19.**

## Section 1 — `ItemToken` output types: use, wear, furnish, or sell

- [x] New `ItemKind = 'equippable' | 'furniture' | 'sellable' | 'component' | 'usable'` (see Recipes.ts) plus an `ITEM_DEFINITIONS: Record<ItemToken, ItemDefinition>` registry (`{token, label, kinds, baseSellValue, discipline}`) covering all 12 items — data-driven, not a switch statement in UI. **Deviation, recorded not silent:** added `'component'` (marks intermediate deep-chain items that are never sellable unless *also* tagged `'sellable'` — this is what forces the chains to actually be chains) and `'usable'` (the computer's terminal affordance needed a 4th kind the doc's original three didn't cover) beyond the doc's `equippable`/`furniture`/`sellable` list.
- [x] `furniture`-kind outputs (`ITEM_SCRAP_STOOL`, `ITEM_PLANTER_BOX`, `ITEM_WIRED_LAMP`, `ITEM_UPCYCLED_WORKBENCH`) are tagged and ready as the EPIC-34/M43 bridge — no placement UI built here, per the doc's own scope note.

## Section 2 — Selling upcycled goods through the existing economy

- [x] New `sellItem(item)` action in `actions.ts`, following M24's "Work" action precedent (once-per-item, not once-per-day): pays `sellValueFor(item, mastery)` as ordinary `cash`, decrementing the held `craftedItems` count. Rejects non-`sellable` items (`not-sellable`) and items not held (`none-held`).
- [x] Sell value data (`baseSellValue`, `masteryMultiplier()`, `sellValueFor()`) lives entirely in `Recipes.ts`, not hardcoded in `CraftingModal.ts`.

## Section 3 — Discipline mastery and the flagship deep chains

- [x] `masteryMultiplier(mastery)` — a small, pure, testable formula (`1 + 0.1 × clamp(mastery, 0, 10)`, so 1.0x-2.0x): +10% sell value per mastery point, mirroring `EconomyMath.ts`'s pure-function style.
- [x] **The bike**: `RECIPE_UPCYCLED_BIKE` (metalwork, `MATERIAL_SCRAP_METAL×5 + MATERIAL_RUBBER×3 + MATERIAL_RECLAIMED_WOOD×2`, minMastery 3) → `ITEM_UPCYCLED_BIKE` (sellable only — no rideable/equippable kind, per the epic's non-goals).
- [x] **The computer** — a real 4-tier chain where each tier's *output item* feeds the next tier's input (new `Recipe.itemInputs`/`consumeRecipeItemInputs()`, the first "sub-assembly" consumers in the codebase, alongside raw-material `inputs`): `RECIPE_BASIC_TOOLS` (metalwork, materials only) → `RECIPE_SALVAGE_RADIO` (electronics, materials + consumes 1 `ITEM_BASIC_TOOLS`) → `RECIPE_CIRCUIT_BOARD` (electronics, materials only, minMastery 2, **never taught by any NPC** — found-cookbook-only, see `CookbookPickups.ts`'s 5th pickup) → `RECIPE_UPCYCLED_COMPUTER` (electronics, materials + consumes 1 radio + 1 circuit board). **Deviation, recorded not silent:** the vision doc's "copper" and "reclaimed plastic" aren't tokens in M38's fixed 15-material taxonomy — substituted `MATERIAL_SCRAP_METAL` (copper-bearing salvage) and `MATERIAL_RUBBER` respectively. **Scope decision, recorded not silent:** all 5 new M40 recipes are kept `tier: 'basic'` (mastery-gated only, no crafting-station requirement) rather than `'advanced'` — station-gating an entire multi-craft chain behind EPIC-34/M42's not-yet-built stations would make this milestone's own end-to-end verification undeliverable; `'advanced'`/station-gating stays reserved for M39's one flagged example (`RECIPE_UPCYCLED_WORKBENCH`).
- [x] The finished computer (`ITEM_UPCYCLED_COMPUTER`) carries the `'usable'` kind, wired in `CraftingModal.ts`'s new Inventory tab to open a new `TerminalModal.ts` — a real in-fiction terminal/BBS reading of the same `fetchDailyNarrative()` feed `BroadsheetModal`/`TopHUD` already consume (reused as-is, no new network path), not a trophy item with no effect.

## Architecture notes / non-goals

See [EPIC-33](../stories/EPIC-33-crafting-materials-and-upcycling.md)'s epic-wide non-goals — no real-money marketplace, no rideable-bike physics, no inventory weight system. `CraftingModal.ts` gained a second "Crafted Items" tab (Sell/Use buttons) alongside the existing Recipes tab, reusing `.settings-tabs`/`.shop-grid`/`.shop-card` throughout. `TerminalModal.ts` gets its own small `.terminal-*` CSS block (green-on-black monospace) — deliberately not skin-token-driven, since it's the computer's own fixed in-fiction hardware, not a re-skinnable UI panel.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 493/493 passing (20 new: mastery-multiplier/sell-value tests, itemInputs eligibility + consumption tests, both flagship chains resolving end-to-end at the data level (`Recipes.test.ts`) and through the real store actions (`actions.test.ts`'s `craftRecipe`/`sellItem` blocks), plus a real negative check in `NpcDialogues.test.ts` confirming `RECIPE_CIRCUIT_BOARD` is never taught).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (148 modules, PWA precache regenerated).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 6 changed/new source files return HTTP 200. Full interactive craft-and-sell-a-bike / craft-the-full-computer-chain-and-open-the-terminal confirmation stays manual, the same limitation noted for every prior visual/interaction milestone.
