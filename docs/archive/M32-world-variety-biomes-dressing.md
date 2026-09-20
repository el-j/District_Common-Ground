# M32 — World Variety: Biomes, Nature & Street Dressing

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from direct user feedback ("the map is always the same and not very fun to discover... no trees, no cars, nothing like village/town/forest"), grounded by an Explore-agent audit of `WorldScene.ts`'s map/tile/dressing code before writing this doc.

Status: **Implemented 2026-09-19.**

## Section 1 — New tile types

`apps/web/src/world/MapData.ts` (new — extracted from `WorldScene.ts`, see Architecture notes) + `apps/web/src/world/WorldScene.ts`:
- [x] Extended the `T` tile enum with `TREE`, `WATER`, `DIRT_PATH`, `SIDEWALK`, appended after the original 7 (indices 7–10) rather than interleaved, so no existing tile index shifts.
- [x] Extended `createTilesetTexture()` (`DEFAULT_RENDERER`, `WorldScene.ts`) with a canvas-drawn frame per new type, same dithered-flat-color technique as the 7 existing tiles.
- [x] Collision: `TREE`/`WATER` block movement like `WALL`; `DIRT_PATH`/`SIDEWALK` stay walkable. Centralized as `BLOCKING_TILES`/`isWalkableTile()` in `MapData.ts` — `WorldScene.create()`'s `layer.setCollision([...BLOCKING_TILES])` now derives from the same source of truth the tests exercise, instead of a separately hand-written literal array.
- [x] **Also extended (not originally scoped, but required for correctness):** all 3 hi-fi skin renderer packages (`packages/skin-diorama-glow`, `skin-flat-vector`, `skin-neon-city`) each independently implement `createTilesetTexture()` with their own fixed 7-frame canvas — left unextended, any of those 3 skins would have rendered the 4 new tile types as blank/out-of-bounds. Each got the same 4 new frames in its own established visual idiom (lit-gradient / flat-bands+noise / glow-stroke respectively), plus the `worldTree`/`worldWater`/`worldDirtPath`/`worldSidewalk` fields added to each package's local `ResolvedWorldPalette` structural-mirror interface.
- [x] Added `worldTree`/`worldWater`/`worldDirtPath`/`worldSidewalk` to `SkinPalette` (`SkinInterface.ts`) and `DEFAULT_WORLD_PALETTE`/`resolveWorldPalette()` (`ThemeManager.ts`), with sensible fallback defaults — no pre-M32 manifest needed changes to keep working. Also populated distinct, thematically-fitting values in all 8 existing skin manifests for genuine cross-skin visual variety (not required for correctness, since defaults already satisfy the architecture rule, but cheap and worthwhile).

## Section 2 — Reshape zones for real biome variety

`apps/web/src/world/MapData.ts`'s `buildMap()`:
- [x] **Decision made during implementation (recorded here, not left silent):** a full "rework the North zone" was rejected as too high-risk — the North Transit Hub's existing buildings (rail platform, ticket booth, cargo dock, High-Rise, Utility Station) are dense, and shifting any zone's coordinates would cascade into ~15 other hardcoded coordinate systems (NPC positions, construction nodes, `DOOR_TILES`, interior definitions, minigame portals, the player spawn point). Instead, used the doc's explicit "(or add a new zone)" allowance's spirit: added real tree/path content into the genuinely free space that already existed — a "Greenwood Corner" park pocket (scattered `TREE` tiles + 2 `DIRT_PATH` aisles in the one open block inside the Transit Hub) plus a tree-lined `DIRT_PATH` promenade running the full map height in the 2-tile gap between every building's east edge and the East Canal access road (broken naturally at road crossings, not paved over).
- [x] Central zone: added `SIDEWALK` edging along all 3 cross-street roads' free edges, skipped wherever Central Plaza's own plaza texture already provides a distinct edge.
- [x] East Canal: replaced the flat-color "canal walkway" plaza fill with real `WATER` — a wide basin south of both dike roads (clear of both canal buildings) plus a connecting channel along the zone's east edge.
- [x] Verified `updateZone()`'s zone boundaries needed no change (no zone boundary moved, only decoration added within existing zones) and reconciled `CLAUDE.md`'s World Zones section to the real 5 zones (was listing only 3).

## Section 3 — Real outdoor decoration/prop placer

New `apps/web/src/world/OutdoorDressing.ts` + `WorldScene.renderOutdoorDressing()`:
- [x] Built a general outdoor prop placer: `PROP_ACCENT_TREE`, `PROP_BUSH`, `PROP_STREET_BENCH`, `PROP_FENCE`, `PROP_PARKED_CAR`, `PROP_PARKED_BIKE` — a fixed, deterministic per-zone placement list (Central Plaza, South courtyard, street parking along the new sidewalks, Solar Quarter fencing), same token+placement pattern as `ResilienceDressing.ts`.
- [x] This layer is additive to, not a replacement for, `updateWorldDressing()`'s resilience-tier swap — rendered once at `create()` via `renderOutdoorDressing()` (mirrors `renderInteriorProps()`'s one-shot technique; this decoration doesn't change with resilience score, so it needs no stored/destroyable references the way the tier-swapped props do).
- [x] **Named token deviation (recorded, not silent):** used `PROP_STREET_BENCH` rather than literally reusing `InteriorProps.ts`'s `PROP_BENCH` — they're different token unions rendered through different `drawSpec` tables (indoor furniture vs. outdoor street furniture), and reusing the exact same string across two unrelated registries seemed more likely to cause confusion than clarity. `spawnStreetlamps()`'s glow-circle technique wasn't reused for a new prop type — none of the 6 new outdoor tokens are lighting fixtures, so there was nothing to apply it to.

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals — no randomized/procedural-per-playthrough generation; the map stays deterministic and headless-simulation-friendly (game logic never references these new tile types by hex color or skin-specific detail — they stay `T`-enum/token driven, resolved to colors only inside `createTilesetTexture()`/renderer packages via the palette, per `CLAUDE.md`'s Critical Architecture Rule).

**Unplanned refactor:** `buildMap()`, `fillRect()`, `drawBuilding()`, the `T` enum, `TILE_FRAME_COUNT`, `BLOCKING_TILES`/`isWalkableTile()`, and `DOOR_TILES` were extracted from `WorldScene.ts` into a new `apps/web/src/world/MapData.ts`. None of this logic ever touched Phaser — `WorldScene.ts` only needs it because the file itself imports Phaser at module scope for its `Scene` class, which is exactly the same reason `CameraViewport.ts`/`EconomyMath.ts`/`ResilienceDressing.ts`/`InteriorProps.ts` already live outside it. This wasn't optional busywork: it's what makes Section 1/2's tile-walkability and map-shape behavior actually testable in plain Vitest (no jsdom/Phaser mocking) rather than only manually via `make dev-d`.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean (also verified for all 3 hi-fi skin renderer packages individually).
2. `cd apps/web && npm test` — full suite green: 423/423 (32 new — `MapData.test.ts` for tile-walkability + deterministic `buildMap()` output, `OutdoorDressing.test.ts` for the prop placer's determinism/bounds-checking).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — production Vite build clean (143 modules, PWA precache generated); `npm run build` in each of the 3 `packages/skin-*` directories also clean, each emitting its bundle straight to `apps/web/public/plugins/skins/<id>/index.js`.
5. Live via `make dev-d` (dev stack already running from the M31 pass, source bind-mounted so changes applied live; rebuilt the 3 renderer bundles into the same running container and confirmed via direct fetch that the served bundles contain the new tile-drawing code): confirmed via Vite dev-server fetches that every changed/new source file transforms without error. Full interactive walk-the-map / skin-switch visual confirmation stays manual — no headless browser available in this environment, same limitation noted for M31 and every prior visual milestone.
