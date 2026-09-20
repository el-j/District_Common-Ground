# EPIC-35 — Open World Regions & Travel

## Origin

From the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): the main world should feel much more like a real open-world game with regions, in the spirit of World of Warcraft, rather than the single fixed town map that exists today.

## Design Intent — grounded in the real current code

**The entire game is one hand-authored 64×80 tile grid, forever.** `MapData.ts`'s `buildMap()` (extracted from `WorldScene.ts` in M32) produces exactly one deterministic map; "zones" (North Transit Hub, Central Plaza, South Quarter, East Canal, South Solar Quarter) are comment-labeled coordinate ranges within that single grid, not separate loadable areas — confirmed by direct read of `updateZone()`'s if/else. There is no concept of a second map, a travel system, or a region boundary anywhere in the codebase.

**Travel infrastructure already exists as pure narrative flavor with zero function.** The North Transit Hub's rail platform and cargo dock (`CLAUDE.md`'s World Zones list, `WorldScene.ts`'s building set) are decorative buildings with no gameplay hook. This epic's job is to give them one, rather than inventing a new travel affordance from nothing.

**M32 already proved the "add real biome variety without reworking existing geometry" discipline this epic needs at a larger scale.** M32's decision to add trees/water/paths only into genuinely free map space (never touching existing building/NPC/portal coordinates) is the direct precedent for how a second, third, and fourth region get added: fully separate tile grids and coordinate spaces, never spliced into the existing town map.

**The crisis and economy systems already support a "scenario pool" concept that can be region-tagged.** `crisis_scenarios.json` and `CrisisEngine.ts`'s pool-draw-and-reshuffle logic (hardened in M23) is static, data-driven content exactly like the new region-tagged scenario pools this epic proposes — an extension of an existing pattern, not a parallel system.

## Scope and sequencing

Three milestones:

- **M44 — Region & Overworld Data Model** (the region/travel-node data structures and the multi-map loading mechanism; no new region content yet, just the plumbing plus the existing town formally becoming "region 1")
- **M45 — Region Content Pass #1** (at least one genuinely new, hand-authored region — recommended: an industrial/scrapyard region, since it most directly feeds [EPIC-33](EPIC-33-crafting-materials-and-upcycling.md)'s metalwork material chain)
- **M46 — Fast Travel, World Map UI & Region-Aware Systems** (a player-facing travel UI, plus making the crisis/economy/quest systems region-aware where relevant)

M44 is a hard prerequisite for M45 and M46. M45 and M46 can proceed in parallel once M44 lands, though a travel UI (M46) with nowhere new to travel to (before M45) has little value, so M45-before-M46 is the recommended order in practice.

## Non-Goals (epic-wide)

- **No procedural/generated terrain of any kind.** Every region is hand-authored map data, exactly like the existing town, per CLAUDE.md's determinism rule — this epic is explicitly not building a terrain generator.
- **No open-ended, unlimited number of regions in v1.** M45 ships one real new region as a proof; further regions are additional future milestones, not promised here.
- **No real-world map/geo data.** This is unrelated to the existing, separate "Geo-Mode" OpenStreetMap proof-of-concept (M16) — that system stays as-is; this epic's regions are hand-authored fiction, like the rest of the game.
- **No currency-gated travel.** Region unlocks are tied to quest/trust/resilience milestones, consistent with the game's existing values, not a toll or paywall.
- **No region-specific save-data sharding.** All regions' state lives in the same single `GameState`/save file — no per-region save files or migration complexity in v1.
