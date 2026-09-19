# EPIC-31 — World, HUD & Progression Overhaul

## Origin

The user gave 8 pieces of direct feedback in one message (2026-09-19): the HUD is strange with every button crammed at the bottom of the screen; the map never changes and has no trees, cars, or anything that reads as "village/town/forest"; buildings are all empty inside; restarting a game removes the whole HUD; color/theme settings and other settings should live in one menu; the game still reads as "Gameboy Zelda" and should move toward a "GTA" direction (people on the street, bikes, cars); there need to be real quests to solve per level so there's a sense of progress; and some overlays aren't closable with an "×". The instruction was to "deeply investigate and make comprehensive planning" — not to implement yet.

Three Explore agents independently audited the live code before any design work — the UI/HUD/settings/modal layer, the world/map generation layer, and the quest system — so this epic is grounded in what the code actually does, not assumptions from the complaint list alone.

## Design Intent — what the audit actually found

**The HUD complaint is real and deliberate, not accidental.** `#top-hud` (the stats strip) is pinned to the top of the screen but is purely passive — `pointer-events:none`, no buttons. Every one of the 12 interactive controls (settings, share, radio, mute, quest, work, builder, plugins, shop, social, civic, journal), plus End Day and the context action button, are separate DOM nodes each given `position:absolute; bottom:*` in `style.css`. An M28 code comment (`TopHUD.ts:72-77`) documents a prior consolidation of scattered per-button positioning rules into one bottom toolbar — but that toolbar itself was never redistributed. Nothing is visually at the top except inert numbers.

**The restart bug has a precise, single-line root cause.** `SettingsModal`'s "New Game" handler correctly resets the store to `INITIAL_STATE` (`meta.phase: 'select'`), and `TopHUD.render()` correctly hides every HUD element when `phase === 'select'` (`TopHUD.ts:313-325`). But `CharacterSelect` — the screen that's supposed to appear next — is only ever instantiated once, at initial page load, behind a plain `if` in `main.ts:118-125`. Nothing re-mounts it when `phase` flips back to `'select'` later. The HUD correctly vanishes; nothing replaces it. The game isn't broken so much as half-wired for a reset that was never actually built.

**"Unify settings" is 80% already true.** There's exactly one settings surface (`SettingsModal.ts`, one gear icon) and it already bundles skin/theme, civic region, and New Game. The one real inconsistency: the music mute toggle lives as its own separate HUD icon, outside settings entirely.

**Modal-close is already consistent almost everywhere.** A shared `bindEscapeClose()` helper is used by 13 modals with both a visible × and Escape. Three modals genuinely have neither — `CrisisWireModal`, `AuthOverlay`, `CharacterSelect` — but each is a deliberate forced-choice or onboarding gate, not an oversight (a crisis response, initial auth, and initial character pick must not be dismissible mid-flow). The one real gap is `TownHallAssembly`, which has Escape wired up but no visible × button and no backdrop-click — an inconsistency with every other modal's affordance, not a design choice.

**The map is a single hand-authored tilemap with zero procedural variety and almost no dressing.** `buildMap()` builds one fixed 64×80 grid from literal rectangle coordinates — no noise, no data-driven level file, one map, ever. Only 7 tile types exist and none are "nature" beyond flat grass. "Zones" are just comment-labeled coordinate ranges, not real data. Decoration is close to nonexistent: streetlamps are lighting-only glow circles with no geometry, and `updateWorldDressing()` swaps at most 1-2 prop rectangles based on resilience tier — there are zero trees, benches, fences, or parked cars anywhere on the map.

**Buildings are mostly literal empty shells.** 14 building footprints exist; only 3 have any interior content at all, and even those are just a handful of colored-rectangle props drawn over the *same* shared tilemap — no room isolation, no hidden exterior. The other 11 are walled rectangles with one door tile and nothing inside.

**There is no street life at all, and no vehicle concept exists anywhere.** `NPCEntity.update()` has zero movement code — every NPC is positioned once at scene creation and never moves again. Grepping the whole codebase for "vehicle"/"car"/"bike" finds nothing but the Courier Rush minigame's flavor theme — no Vehicle/Car/Bike entity class exists.

**Quests are real state but not real objectives, and "levels" don't exist as a concept.** `IrlQuestSystem` is a self-attested daily buff: 6 flavor definitions, a 3-of-6 rotation, a "Done! ✓" button with no verification of any actual in-world action, and zero connection to the Commons build-node progress track. `GameState` has no level/chapter field anywhere — the game is one open-ended sandbox. "Bulletin Board," referenced in `CLAUDE.md`'s world-zone list, has zero implementation.

## Scope and sequencing

This epic spans four architecturally independent layers — UI/DOM layout, tilemap/rendering, entity AI, and a brand-new progression system — each carrying its own risk and its own reasonable design choices. Rather than one oversized milestone, it's split into 5 milestones, ordered so early ones fix real, high-annoyance-per-effort bugs first and later ones build on a stable foundation:

- **M31 — HUD Rework, Unified Settings, Restart Fix, Modal-Close Consistency**
- **M32 — World Variety: Biomes, Nature & Street Dressing**
- **M33 — Real Building Interiors**
- **M34 — Street Life: Moving NPCs, Pedestrians & Vehicles**
- **M35 — Real Quest & Progression System**

Each has its own task doc under `docs/tasks/`, linked from `docs/TASK-STATUS.md`, and is implemented independently — most likely one at a time given the total size, on explicit go-ahead per milestone.

## Non-Goals (epic-wide)

- **No engine/perspective change.** Stays a top-down 2D Phaser game — "GTA direction" here means street life (pedestrians, parked/eventually-moving vehicles, denser town texture), not an open-world 3D rebuild.
- **No licensed real-world map data or procedural random-per-playthrough generation.** The map stays deterministic and hand-authored-but-varied, consistent with `CLAUDE.md`'s headless-simulation architecture rule — this is about authored variety, not randomized levels.
- **No full vehicle physics or traffic simulation.** Any vehicles that move (a stretch item, not default scope — see M34) get simple arcade movement, not a physics/traffic system.
- **No retiring the existing self-attested `IrlQuestSystem` daily-buff mechanic.** M35 adds a new, separate, location-verified objective system alongside it rather than replacing it.
- **No sandboxing or multiplayer-shared-world changes.** Out of scope for all 5 milestones.
