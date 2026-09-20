# M43 — Housing, Rental & Home Furniture Editor

Story: [`docs/stories/EPIC-34-buildings-as-plugins-and-interiors.md`](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 2. Absorbs the superseded [EPIC-32](../stories/EPIC-32-home-and-housing.md) (`M36`/`M37`, retired numbers).

Status: **Implemented 2026-09-19.**

## Section 1 — Housing state and rental options (EPIC-32's M36 scope, carried forward unchanged)

- [x] New `housing: { currentFlatId: string | null, movedInOnDay: number | null, furniture: PlacedFurniture[] }` slice on `GameState` — another brand-new top-level slice (`useGameStore.test.ts`'s existing defensive-merge proof already covers this case, no new migration code needed). New `apps/web/src/core/simulation/HousingOptions.ts`: a static `HousingOption[]` list (3 virtual units — one at Block A, two at Block B) mirroring `CrisisEngine.ts`'s `consequences` shape, applied recurring instead of one-time. **Deviation, recorded not silent:** no `trustDelta` field — the real `DailyTickResult`/`applyDailyTick()` shape only ever returns `{energyDelta, cashDelta, stressDelta}` (trust is event-driven today, via `addTrust()`/`loseTrust()`, never part of the daily tick); extending the tick's return shape for one new field was disproportionate to this milestone. **Placement deviation, recorded not silent:** `HousingOptions.ts` lives in `core/simulation/`, not `world/`, with `buildingInteriorId` kept as a plain `string` rather than the real `InteriorId` type — specifically so `core/state/actions.ts`'s `advanceDay()` can read it without `core/` ever importing from `world/`, preserving the one-way layer direction M38 established.
- [x] Recurring rent folded into `applyDailyTick()`/`advanceDay()` via a new optional `housingModifier` param (added at the end of the signature, fully backward-compatible — confirmed by `BalanceSimulator.ts`'s existing calls needing zero changes).
- [x] New `apps/web/src/ui/HousingModal.ts`, reusing `CrisisWireModal.ts`'s delta-chip rendering (`.delta-chip`/`.crisis-btn-deltas`) directly, entered via a real in-world "Housing 🏠" interactable inside the now-isolated apartment interiors (M41), listing every `HousingOption` at that specific building.
- [x] Confirmed: no new `health` stat. Housing tradeoffs map onto Cash/Energy/Stress (trust intentionally excluded — see the deviation above), per EPIC-32's original decision.

## Section 2 — Furniture editor built on M41's redraw capability

- [x] `housing.furniture: PlacedFurniture[]` — `{instanceId, item: ItemToken, slotIndex}`. **Deviation, recorded not silent:** `slotIndex` (an index into the *current* flat's `InteriorDefinition.furnitureSlots`), not raw `x`/`y` and not a `PropPlacement` (which is `PropToken`-typed, the wrong token system — see Section 3). This is also the resolved answer to EPIC-32's own open "keyed by flat id vs. single current-flat state" question: placements are logically "slot N holds item X," re-laid-out against whichever flat is current, so switching flats never silently deletes furniture the player already spent a crafted item on (proven by a real test, not just asserted).
- [x] New `apps/web/src/ui/FurnitureEditorModal.ts` reusing `DistrictGrid.ts`'s select-slot-then-confirm shape (click an empty slot → catalog of owned furniture-kind items → confirm; click an occupied slot → remove) over the flat's fixed `furnitureSlots` points — slot-based, not freeform drag.
- [x] Live redraw: `InteriorScene.ts` gained a parallel `furnitureSprites` stored-array + `renderFurniture()`/`redrawFurniture()` (the same M41 §3 pattern `propSprites`/`redrawProps()` already established, just for the different `ItemToken`-keyed draw spec furniture needs), called when the editor modal closes.

## Section 3 — Furniture sourced from crafting, not a fixed cosmetic catalog (the real upgrade over EPIC-32's original plan)

- [x] `FurnitureEditorModal.ts`'s catalog is `ITEM_DEFINITIONS` filtered to `kinds.includes('furniture')` — the player's own held `crafting.craftedItems` (M40 §1: `ITEM_SCRAP_STOOL`, `ITEM_PLANTER_BOX`, `ITEM_WIRED_LAMP`, `ITEM_UPCYCLED_WORKBENCH`), not a static purchasable list. Placing an item consumes one from `craftedItems` (mirrors `craftRecipe()`'s "spend a real resource" shape); removing gives it back.
- [x] Starter furniture: resolved as the interior's own fixed, non-editable `props` (already true for Block A's "Pip's Courier Room," 4 props) rather than seeding `PlacedFurniture` entries — simpler and coherent, since starter dressing and player-editable furniture are already two different token systems (`PropToken` vs. `ItemToken`). **Real gap found and closed, not left open:** Apartment Block B had *no interior definition at all* before this milestone (confirmed by the original EPIC-32 audit) — added one (`INTERIORS.apartmentBlockB`, 3 starter props, 4 furniture slots, both Block B `HousingOption`s), closing that gap rather than building the furniture editor around a building that couldn't be entered.

## Architecture notes / non-goals

See [EPIC-34](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)'s epic-wide non-goals (no dynamic real-estate market, no freeform drag, no new health stat). Furniture remains cosmetic-only in v1 (no stat effects from individual pieces), per EPIC-32's original, carried-forward decision. `InteriorScene.ts`'s generalized `Interactable[]` list (M42) is what made adding "Housing 🏠"/"Furnish 🪑" as two more entries this cheap — no new interaction-priority code needed.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 532/532 passing (24 new: `HousingOptions.test.ts` (no-strictly-dominant-option, coverage of both buildings), `EconomyMath.test.ts`'s housing-modifier folding, `actions.test.ts`'s `rentFlat`/`moveOut`/`placeFurniture`/`removeFurniture` blocks including the furniture-survives-a-flat-switch proof, `InteriorProps.test.ts`'s Block B/furnitureSlots/housingOptionIds cross-checks).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (155 modules; `HousingModal.ts`/`FurnitureEditorModal.ts` both confirmed code-splitting into their own lazy-loaded chunks, same as M42's `RetailModal.ts`).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 8 changed/new source files return HTTP 200. The full interactive rent-a-flat → craft-furniture (M40) → place-via-editor → confirm-persists-across-reload round trip stays manual, the same limitation noted for every prior visual/interaction milestone (persistence itself rides the existing IndexedDB `saveToDB()`/`loadSave()` path unchanged, so the "survives reload" half is exercised by the same mechanism every other state slice already relies on, not new code).
