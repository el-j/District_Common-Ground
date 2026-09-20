# M38 — Materials, Scavenging & Inventory Foundation

Story: [`docs/stories/EPIC-33-crafting-materials-and-upcycling.md`](../stories/EPIC-33-crafting-materials-and-upcycling.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 1.

Status: **Implemented 2026-09-19.**

## Section 1 — `MaterialToken` taxonomy and the `GameState` inventory slice

New `apps/web/src/core/simulation/Materials.ts` + `useGameStore.ts`:
- [x] Defined `MaterialToken` as a flat string-literal union covering the raw/natural base layer (`MATERIAL_WOOD`, `MATERIAL_STONE`, `MATERIAL_IRON`, `MATERIAL_COAL`, `MATERIAL_RESIN`, `MATERIAL_WOOL`, `MATERIAL_COTTON`, `MATERIAL_LEATHER`, `MATERIAL_MUSHROOM`) and the complementary urban-salvage layer (`MATERIAL_SCRAP_METAL`, `MATERIAL_RECLAIMED_WOOD`, `MATERIAL_GLASS`, `MATERIAL_RUBBER`, `MATERIAL_ELECTRONIC_COMPONENT`, `MATERIAL_WIRE`) — 15 tokens total, no hardcoded colors/icons attached to the token itself. **Deviation from the doc's original naming, recorded not silent:** `MATERIAL_IRON_ORE` was shortened to `MATERIAL_IRON` for consistency with the other raw tokens (`MATERIAL_STONE`, `MATERIAL_COAL`, none of which carry a "raw-form" suffix); an ingot/smithing distinction can be introduced at the recipe level in M39 without needing a second token.
- [x] Added a new top-level `inventory: { materials: Partial<Record<MaterialToken, number>>; collectedScavengePoints: string[] }` slice to `GameState` (sibling to `commons`/`crisisState`). **Confirmed, not just assumed, that no explicit migration/defensive-merge code was actually needed**: `persistence.ts`'s `loadSave()` calls plain `useGameStore.setState(saved)` (no `replace` flag), and zustand's default shallow merge only touches top-level keys present in the passed object — an old save that predates this field simply lacks the `inventory` key entirely, so the store's existing default survives untouched. This is proven directly by a new `useGameStore.test.ts`, and documented as a discovered architecture fact (not a generic assumption) in a code comment on the new field, since it corrects this doc's original wording ("needs a defensive merge") for the specific case of a *brand-new top-level slice* (as opposed to a new field on an *existing* nested slice like `player`, which zustand's shallow merge would genuinely wipe from an old save and would need real migration code).

## Section 2 — World scavenging pickups

New `apps/web/src/world/ScavengePoints.ts` (mirrors `OutdoorDressing.ts`'s token+placement pattern) + `WorldScene.ts`:
- [x] A fixed, deterministic list of 8 `{id, material, amount, x, y}` pickup placements (2 each in the South Quarter courtyard, Central Plaza edge, Solar Quarter yard, and North Utility Station yard — thematically matched, e.g. iron/coal near the Utility Station, resin/mushroom near the Greenhouse). Coordinates were **verified programmatically against the real `buildMap()`/`OUTDOOR_DRESSING_PROPS` data** (a throwaway Node type-stripped script querying `isWalkableTile()` and existing prop coordinates), not eyeballed — 2 of the first 8 candidate coordinates tried were rejected this way (both landed on `WALL` tiles inside building footprints) before the final list was set, and one further candidate was rejected for landing on a `DOOR` tile.
- [x] Reused `InteractionPrompt` for a proximity bounce-bubble (♻️, 34px radius) plus the existing `handleInteractions()`/`[E]`-or-click/`setAction()` HUD-button pattern — no new prompt UI built.
- [x] Picked-up points are marked collected in `inventory.collectedScavengePoints` (checked both when deciding whether to render a point on `create()` and, defensively, inside the new `collectMaterial()` action itself, which is idempotent per point id) — a small addition to the inventory slice, not a new subsystem.

## Section 3 — Retail material purchase (data stub only — full UI is EPIC-34's job)

- [x] `MATERIAL_PRICES: Record<MaterialToken, number>` added to `Materials.ts` so real numbers exist for [EPIC-34](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)'s M42 to wire a Baumarkt/Supermarket UI to later — no building or UI built here, per the original scope.

## Architecture notes / non-goals

See [EPIC-33](../stories/EPIC-33-crafting-materials-and-upcycling.md)'s epic-wide non-goals. No inventory weight/slot limits (a flat per-token count). No recipes or crafting yet — that's M39. `collectMaterial()` lives in `apps/web/src/core/state/actions.ts` and takes an explicit `(pointId, material, amount)` rather than importing `ScavengePoints.ts` itself, preserving this codebase's existing layer direction (`world/` depends on `core/`, never the reverse) — `WorldScene.ts` is the caller that knows both sides.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 438/438 passing (15 new: 4 in `Materials.test.ts`, 6 in `ScavengePoints.test.ts`, 3 in `actions.test.ts`'s new `collectMaterial` block, 1 in `useGameStore.test.ts`'s new defensive-merge test — 1 test file was new, `useGameStore.test.ts`, which didn't exist before this milestone).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (144 modules, PWA precache regenerated).
5. Live via the Vite dev server (`npm run dev`, no Docker rebuild needed since there are no Go/backend changes this milestone): confirmed all 5 changed/new source files (`Materials.ts`, `ScavengePoints.ts`, `WorldScene.ts`, `useGameStore.ts`, `actions.ts`) transform with a 200 response. Full interactive walk-to-a-pickup-and-collect confirmation stays manual — no headless browser available in this environment, the same limitation noted for every prior visual/interaction milestone.
