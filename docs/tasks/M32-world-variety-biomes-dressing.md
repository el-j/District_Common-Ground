# M32 — World Variety: Biomes, Nature & Street Dressing

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from direct user feedback ("the map is always the same and not very fun to discover... no trees, no cars, nothing like village/town/forest"), grounded by an Explore-agent audit of `WorldScene.ts`'s map/tile/dressing code before writing this doc.

Status: **Planned — not yet implemented.**

## Section 1 — New tile types

`apps/web/src/world/WorldScene.ts`:
- [ ] Extend the `T` tile enum (currently `FLOOR/WALL/GRASS/ROAD/PLAZA/DOOR/BUILT`) with new types: `TREE` (or `FOREST_FLOOR` for walkable ground under canopy), `WATER`, `DIRT_PATH`, `SIDEWALK`.
- [ ] Extend `createTilesetTexture()` (`WorldScene.ts:146-243`) with a canvas-drawn frame per new type, using the same dithered-flat-color technique already used for the 7 existing tiles — no external art, per `CLAUDE.md`'s tech-stack rule.
- [ ] Decide and document collision behavior per new tile (e.g. `TREE` blocks movement like `WALL`; `WATER` blocks movement unless a future bridge/dock tile is added; `DIRT_PATH`/`SIDEWALK` are walkable like `FLOOR`/`ROAD`) in `CollisionSystem.ts` or wherever tile-walkability is currently determined.

## Section 2 — Reshape zones for real biome variety

`apps/web/src/world/WorldScene.ts` (`buildMap()`, `:65-127`):
- [ ] Rework the North zone (or add a new zone) into a forest/park-like area: dense `TREE` placement with winding `DIRT_PATH` connections, replacing today's uniform flat grass.
- [ ] Give the Central zone denser "town" texture — varied plaza shapes, more `SIDEWALK` edging along roads instead of today's flat `ROAD`-to-`GRASS` transitions.
- [ ] Replace the East Canal's flat color-coded water with real `WATER` tiles.
- [ ] Update the zone-label comments and `updateZone()`'s (`:912-928`) if/else boundaries to match any reshaped coordinates; update `CLAUDE.md`'s World Zones section if the zone list changes (it currently lists only 3 zones though the code already has 5 — reconcile as part of this pass, not a separate cleanup).

## Section 3 — Real outdoor decoration/prop placer

`apps/web/src/world/` (extends the existing `ResilienceDressing.ts` token+placement pattern):
- [ ] Build a general outdoor prop placer covering trees (where not already a solid `TREE` tile — e.g. isolated accent trees in plazas), bushes, benches, fences, and parked cars/bikes as static decoration (no driving — that's M34).
- [ ] Replace `updateWorldDressing()`'s current 1-2-slot resilience-tier swap with a richer per-zone placement list, keeping the existing resilience-tier-driven variation (blighted vs. thriving world state) as one axis, not the only source of variety.
- [ ] Reuse `spawnStreetlamps()`'s existing glow-circle technique as a template for any new lighting-adjacent props; reuse `PROP_BENCH`-style tokens from `InteriorProps.ts` where an equivalent outdoor prop token makes sense, rather than inventing a parallel token system.

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals — no randomized/procedural-per-playthrough generation; the map stays deterministic and headless-simulation-friendly (no game-logic code may reference these new tile types by hex color or skin-specific detail, per `CLAUDE.md`'s Critical Architecture Rule — they stay `EntityToken`/tile-enum driven like every existing tile).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new/updated tests for tile-walkability of the 4 new types and for the prop placer's deterministic output (same seed → same placement, matching the project's no-randomness convention).
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: walk the full map and confirm each zone now reads as visually distinct (forest/park vs. town vs. water's-edge) rather than uniform grass/road/plaza; confirm trees/water/fences block movement correctly and parked cars/benches don't; confirm skin-switching still correctly re-tints the new tile types (no hardcoded skin-specific colors leaking outside the palette system).
