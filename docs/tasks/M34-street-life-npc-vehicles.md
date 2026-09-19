# M34 — Street Life: Moving NPCs, Pedestrians & Vehicles

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from a direct user request to move the game from a "Gameboy Zelda" feel toward a "GTA" direction (people on the street, bikes, cars), grounded by an Explore-agent audit confirming `NPCEntity` has zero movement code and no Vehicle/Car/Bike entity type exists anywhere in the codebase.

Status: **Planned — not yet implemented.**

## Section 1 — Give NPCs real movement

`apps/web/src/world/entities/NPCEntity.ts` (currently: positioned once, `update()` only measures distance to the player — no movement code at all):
- [ ] Add waypoint-based wander/patrol behavior confined to each NPC's home zone (reuse `CollisionSystem.ts` for wall/prop avoidance — confirm it currently only handles player-vs-wall and extend it to handle NPC-vs-wall too, or give NPCs a lighter-weight bounds check if full collision is overkill for wander movement).
- [ ] Keep existing interaction behavior (talk-prompt on player proximity, dialogue trigger) working unchanged while an NPC is mid-wander — moving NPCs must still be talkable.
- [ ] Confirm this doesn't regress any existing test that assumes NPCs are stationary (grep `NPCEntity` usage in tests before changing behavior).

## Section 2 — Background pedestrians

`apps/web/src/world/` (new, lightweight — not full `NPCEntity` instances):
- [ ] Add non-interactive "pedestrian" extras — simple wander AI, procedurally textured the same way existing NPCs are (reuse the NPC texture-generation approach, not a new art pipeline) — spawned in greater numbers than the 6 named NPCs to make streets feel populated, without each one carrying full dialogue/quest state.
- [ ] Cap the pedestrian count at a level that keeps performance reasonable (confirm via a rough frame-budget sanity check, not a full profiling pass) — this project targets Lighthouse 95+/mobile performance per `CLAUDE.md`.

## Section 3 — Vehicles (static decoration, default scope)

Coordinates with M32's outdoor prop placer:
- [ ] Ship parked cars/bikes as static street decoration (non-interactive props), placed by M32's prop placer or this milestone's own placement pass — whichever lands first should leave a clean seam for the other.
- [ ] **Stretch, not default scope**: a rideable/drivable bike (thematically consistent with the existing Courier Rush minigame's bike theme) that speeds up player movement on `ROAD`/`SIDEWALK` tiles. Flagged explicitly here rather than silently dropped — implement only if confirmed in scope when this task doc is picked up for implementation.

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals — no traffic simulation, no vehicle collision physics, no AI-driven traffic actually navigating the road network. Game logic must still never reference sprite filenames/hex colors directly for pedestrians/vehicles, per `CLAUDE.md`'s Critical Architecture Rule — route through the existing `EntityToken`/skin-resolution pattern.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests for NPC wander bounds (stays within home zone) and for talk-prompt still triggering correctly on a moving NPC.
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: confirm the 6 named NPCs now wander instead of standing still, confirm background pedestrians populate the streets, confirm parked cars/bikes appear as street decoration, and do a rough FPS sanity check (browser dev tools) with the added pedestrian count to confirm no obvious performance regression.
