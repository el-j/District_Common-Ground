# M44 — Region & Overworld Data Model

Story: [`docs/stories/EPIC-35-open-world-regions-and-travel.md`](../stories/EPIC-35-open-world-regions-and-travel.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 3.

Status: **Implemented 2026-09-19.**

## Section 1 — `Region` data model

New `apps/web/src/world/regions/RegionData.ts`:
- [x] `RegionId` + `Region { id, label, sceneKey, arrivalPoint, unlockCondition }`. **Deviation from this doc's original wording, recorded not silent:** no `mapModule: () => MapGrid` — instead, `sceneKey: 'WorldScene' | 'RegionScene'` names which Phaser scene renders the region. Every non-Common-Ground region owns its own independent scene/coordinate space (never spliced into the town's grid, per the vision doc's discipline), but a scene-per-region proved the more direct mechanism than a shared-scene-with-swappable-map-data approach would have, and matches M41's already-proven isolation pattern exactly.
- [x] `REGION_COMMON_GROUND` wraps the existing town with `sceneKey: 'WorldScene'` and `arrivalPoint: {x:25,y:53}` (mirrors `WorldScene.create()`'s existing hardcoded default spawn verbatim, not re-derived) — zero behavior change, confirmed by a real test.

## Section 2 — Multi-map loading in `WorldScene`

- [x] New `apps/web/src/world/regions/RegionScene.ts` — a generic, lightweight scene for every region other than Common Ground, reusing M41's exact `scene.sleep()`/`scene.launch()`/`scene.wake()`/`scene.stop()` lifecycle (EPIC-34 had already landed by the time this milestone started, so the "or a minimal standalone version" fallback this doc flagged wasn't needed). `WorldScene.ts`'s existing `onWakeFromInterior()` handler needed zero region-specific changes — its param type was generalized from `InteriorSceneData` to a new minimal structural `SceneReturnData` (`{returnX, returnY, returnFacing}`) that both `InteriorScene.ts`'s and `RegionScene.ts`'s wake payloads already satisfy.
- [x] `GameState` gained `world: { currentRegionId: string }` (defaulting to `'REGION_COMMON_GROUND'`) — another brand-new top-level slice, no migration code needed. **Deviation, recorded not silent:** kept as plain `string`, not the real `RegionId` type, so `core/state/` never imports from `world/` — the same reasoning `housing.currentFlatId` already established for `HousingOption.id` in M43.

## Section 3 — Travel nodes (literalizing existing flavor)

- [x] The North Transit Hub's rail platform gained a real travel-node `InteractionPrompt` (tile 14,8 — verified free/walkable the same programmatic way as every prior milestone's coordinates) triggering `WorldScene.travelToPlaceholderRegion()`: captures the return tile, calls the new `travelToRegion()` action, sleeps `WorldScene`, launches `RegionScene`. **Scope decision, recorded not silent:** only the rail platform got a real node, not the cargo dock too — one node is what "prove the mechanism end-to-end" requires, and a second node with the exact same single destination would be pure duplication, not real coverage; the cargo dock stays flavor until M45/M46 give it a genuine second destination to point at.
- [x] `RegionScene.ts` renders one placeholder region (`REGION_INDUSTRIAL_OUTSKIRTS`) — a small hand-authored 20×20 flat area, honestly labeled "(Coming Soon)" in both its `RegionData.ts` label and its in-world banner text, with one "Return to Common Ground 🚉" interactable completing the round trip. Real region content (a genuinely hand-authored industrial/scrapyard map) is explicitly M45's job, not attempted here.

## Architecture notes / non-goals

See [EPIC-35](../stories/EPIC-35-open-world-regions-and-travel.md)'s epic-wide non-goals — no procedural terrain, no real-world geo data (unrelated to the separate M16 Geo-Mode PoC). Real unlock-condition gating (`Region.unlockCondition` is flavor text only in this milestone — every region is reachable) is M46's "region-aware systems" job, tracked as an explicit forward dependency rather than silently assumed done.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 540/540 passing (8 new: `RegionData.test.ts` (determinism, Common Ground's wrapped arrival point, scene-key assignment, exactly-one-placeholder-region), `actions.test.ts`'s new `travelToRegion` block).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (157 modules; `RegionScene.ts` bundles into the main chunk, same as `InteriorScene.ts` — both statically imported in `main.ts`'s scene array, unlike the dynamically-`import()`ed modals).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 6 changed/new source files return HTTP 200. The full interactive travel-node round trip (Common Ground → placeholder region → back) stays manual — no headless browser available to drive real Phaser scene-lifecycle events, the same limitation flagged for M41's own scene-lifecycle mechanics, now exercised a second time by a structurally different caller.
