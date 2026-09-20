# M45 — Region Content Pass #1

Story: [`docs/stories/EPIC-35-open-world-regions-and-travel.md`](../stories/EPIC-35-open-world-regions-and-travel.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 3.

Status: **Implemented 2026-09-19.**

## Section 1 — Choose and build the first new region

- [x] **Final choice: the recommended industrial/scrapyard region** (`REGION_INDUSTRIAL_OUTSKIRTS`) — feeds EPIC-33's metalwork chain directly (iron, coal, scrap metal) and gives the Metalwork Workshop ([M42](M42-workshop-and-retail-district.md)) a regional supply line, exactly as recommended.
- [x] **Deviation from this doc's original wording, recorded not silent:** rather than a second `MapData.ts`-shaped tile-index grid, `RegionScene.ts` (M44) renders this region's own 36×36 space directly via hand-drawn Phaser primitives (the same technique the whole game already uses for every visual, per M30's audit) — a fixed, deterministic, hand-placed ground/decoration/scavenge/NPC/door layout, own dimensions and own layout as required, just not built as a second parallel tile-array system. `MapData.ts` itself is untouched; nothing here needed the "own coordinate space, never spliced into the existing town" discipline to mean "own tile array."

## Section 2 — Region-specific biome/tile palette

- [x] **Scope decision, recorded not silent:** used the "region-scoped equivalent" option this doc's own wording explicitly allowed, rather than extending `MapData.ts`'s shared `T` enum — that enum is deeply coupled to `TILE_FRAME_COUNT` and all 8 skin-renderer packages' hardcoded tileset canvases (each one a real file that would need a matching edit, per M32's own mid-implementation finding), and extending it again for a single region not yet skinnable was disproportionate. Ash/slag ground, dark rail-siding bands, and scrap-pile decoration are resolved directly as hand-picked colors in `RegionScene.ts`, matching `OutdoorDressing.ts`'s existing fixed-placement-list pattern rather than the multi-skin palette-resolution pattern — skin-manifest theming for regions is a real future item, not attempted here.

## Section 3 — Region-specific materials, NPCs, and buildings

- [x] New `apps/web/src/world/regions/IndustrialScavengePoints.ts` — 3 scavenging points (iron, coal, scrap metal), mirroring `ScavengePoints.ts`'s (M38) pattern exactly, ids prefixed `outskirts-` so they can never collide with the town's ids in the single shared `inventory.collectedScavengePoints` list.
- [x] 2 static flavor NPCs (Rusty, Ember) with single-fixed-tree dialogue (the same scope reduction M42 already recorded for its own minor NPCs), plus one real building — the **Scrapyard Depot** — entered through the *exact same* `InteriorScene.ts` (EPIC-34/M41) framework Common Ground's buildings use. This required generalizing `InteriorDefinition` with a new required `homeRegion` field (so `WorldScene.ts` and `RegionScene.ts` each filter `ALL_INTERIOR_IDS` to their own doors) and `InteriorSceneData` with a new `returnSceneKey` (so `InteriorScene.exitInterior()` wakes whichever scene the player actually entered from, not always `WorldScene`).
- [x] **Two real, pre-existing gaps found and closed while wiring this, not left in place:** (1) `InteriorProps.ts`'s `exteriorReturnTile` field (M41-M44) was genuinely dead — `enterInterior()` always used the player's live position at entry time, never this field — removed rather than propagated into a 9th and 10th copy. (2) `findInteriorByDoorTile()` (M41) was never actually called by any real application code (both scenes used their own inline proximity search) and, now that two regions exist, would have been a latent coordinate-collision bug if it ever were wired up — fixed to take a `regionId` param before that became a real bug instead of a theoretical one.

## Architecture notes / non-goals

See [EPIC-35](../stories/EPIC-35-open-world-regions-and-travel.md)'s epic-wide non-goals — one region, not an open-ended set, ships in this milestone (still exactly 2 `RegionId`s — M44's placeholder became real content, no 3rd region was added). No collision geometry for the region's decorative props (rail sidings/scrap piles) — purely visual, a recorded scope decision distinct from Common Ground's real `BLOCKING_TILES` system.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 548/548 passing (8 new: `IndustrialScavengePoints.test.ts` mirroring `ScavengePoints.test.ts`'s determinism/bounds/uniqueness coverage, `InteriorProps.test.ts`'s `homeRegion`/Scrapyard-Depot checks and its `findInteriorByDoorTile()` region-scoping fix, `RegionData.test.ts` updated for real content).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (158 modules).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 7 changed/new source files return HTTP 200. The full interactive travel → walk the region → collect materials → talk to NPCs → enter the Scrapyard Depot → exit → travel home round trip stays manual — no headless browser available to drive real Phaser scene-lifecycle events, the same limitation flagged for M41/M44.
