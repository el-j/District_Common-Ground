# EPIC-34 — Buildings as Plugins & Fine-Grained Interiors

## Origin

From the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): buildings — metal/wood workshops, a Baumarkt hardware store, a supermarket, and others — should really be enterable: a roof and a door on the worldmap, and entering loads a real interior with people in it, built as small, independently-developable pieces ("plugins") so the world can grow very fine-grained.

## Design Intent — grounded in the real current code, and in what this supersedes

**This epic directly supersedes [EPIC-31](EPIC-31-world-hud-progression-overhaul.md)'s M33 (Real Building Interiors).** M33's own task doc (`docs/tasks/M33-building-interiors.md`) already identified the right first question — "resolve the interior-isolation design question" — before extending content to all 14 footprints with more colored-rectangle props. This epic answers that same question, but commits to the generalized, plugin-shaped answer the broader vision calls for (real per-building loaded interiors) rather than the narrower "more props on the shared tilemap" scope M33 was written at. M33's task doc is marked superseded below `docs/TASK-STATUS.md`'s milestone table, not deleted — its audit findings (14 footprints, only 3 with any interior, no isolation) are the grounding this epic's M41 starts from.

**This epic also absorbs [EPIC-32](EPIC-32-home-and-housing.md) (Home & Housing, M36/M37) in full.** EPIC-32's audit and decisions (two apartment buildings, only one furnished; no housing/rent field in `GameState`; map housing tradeoffs onto the existing Cash/Energy/Trust/Stress quartet rather than a new stat; recurring rent via `applyDailyTick()`; furniture placement needs a real prop-redraw path that doesn't exist yet) all carry forward unchanged into this epic's M43. The one real upgrade: EPIC-32 planned furniture as a fixed slot-based cosmetic catalog; this epic makes furniture an application of [EPIC-33](EPIC-33-crafting-materials-and-upcycling.md)'s crafting/upcycling system instead, which is strictly richer for no extra architectural cost once M41's redraw capability exists. The `M36`/`M37` labels are retired, not reused.

**The two proven plugin systems in this codebase are the direct architectural template.** `MinigameLoader`/`MinigameModule` (M14/M29) and `SkinRendererLoader`/`SkinRenderer` (M30) both already establish: a typed module contract, a manifest pointing at a dynamically-`import()`ed ESM bundle, and a standalone `packages/*` workspace package with its own Vite library build emitting straight to `apps/web/public/plugins/...`. This epic's `BuildingInterior` plugin contract (M41) follows that same shape rather than inventing a third loading mechanism.

**Interiors today have no destroy/redraw path.** `renderInteriorProps()` (`WorldScene.ts`) draws one-shot `Rectangle`s with no stored references — unlike `updateWorldDressing()`'s `dressingSprites` array, which does support redraw. Any building with mutable contents (a player's furnished home, a shop whose stock changes) needs this fixed first; M41 builds it once, generalized, rather than each later milestone needing its own workaround.

## Scope and sequencing

Three milestones:

- **M41 — Building-Interior Plugin Architecture** (resolves the interior-isolation question from M33; builds the generalized load/enter/exit + redraw framework)
- **M42 — Workshop & Retail District** (Metalwork Workshop, Woodworking Workshop, Baumarkt, Supermarket, Library — content built on M41's framework, each wired to EPIC-33's materials/recipes)
- **M43 — Housing, Rental & Home Furniture Editor** (absorbs EPIC-32's full scope, rebuilt on M41's framework, furniture sourced via EPIC-33's crafting system)

M41 is a hard prerequisite for M42 and M43. M42 should land before or alongside M43 where practical (the Baumarkt is a natural material/furniture-recipe source for the home editor), but is not a strict blocker.

## Non-Goals (epic-wide)

- **No full room-by-room physics or AI navigation inside interiors.** Interiors reuse the existing tile-collision model (`isWalkableTile()`), not a new pathing system.
- **No requirement that every one of the 14+ buildings becomes a full `packages/building-*` plugin.** Small, one-off interiors may stay as data-only definitions in `apps/web/src/world/` (today's `InteriorProps.ts` pattern, generalized); the packaged-plugin route is for buildings substantial enough to earn it (workshops, retail spaces with real logic).
- **No dynamic real-estate market and no new `health` stat** (carried forward from EPIC-32, unchanged).
- **No freeform drag-and-drop furniture placement** (carried forward from EPIC-32, unchanged) — slot-based, extended only in *what* fills a slot (crafted/upcycled items instead of a fixed cosmetic list).
- **No sandboxing of third-party building-plugin content.** Same open, flagged (not solved) risk EPIC-30 already named for community skin-renderer code — carried forward, not re-litigated here.
