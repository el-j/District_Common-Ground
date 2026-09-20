# EPIC-33 — Crafting, Materials & Upcycling System

## Origin

From the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): a direct request to make the game's building/interior system work "a bit like Minecraft" — find materials, upcycle and build things (interior furniture, but also sellable goods like a bike), broadened to "many more things," with recipes discovered as "cookbooks" earned or found in the world.

## Design Intent — grounded in the real current code

**There is no materials or inventory concept anywhere today.** `GameState` (`useGameStore.ts:29-80`, confirmed by direct read) tracks exactly `cash, energy, maxEnergy, socialTrust, stressLevel` per player and nothing resembling an item or resource. The only "earn cash" action is M24's once-daily archetype-specific "Work" button (`actions.ts`) — a single fixed payout, no materials or crafted goods involved at all.

**The crisis-consequence and quest-reward shapes are the closest existing precedent for "gain something concrete from an action."** `CrisisEngine.ts`'s `consequences` (`{cashDelta, energyDelta, trustDelta, stressDelta, worldEffect}`) and `IrlQuestSystem`'s reward application are both small, pure, data-driven "apply this outcome" functions — the natural shape a "craft this item" or "sell this upcycled good" action should follow, rather than inventing a new mutation pattern.

**`InteriorProps.ts`'s token+placement pattern is the closest existing precedent for "a fixed catalog of placeable things."** `PropToken`/`PropPlacement`/`OutdoorDressing.ts`'s `OutdoorPropToken` both already establish: a flat string-literal token union, a `drawSpec` lookup resolved only at the Phaser render boundary, and deterministic placement lists — this is the direct template for `MaterialToken`/`RecipeId`/crafted-`ItemToken` design in this epic, keeping the Critical Architecture Rule (no hardcoded colors/asset names in game logic) intact from day one.

**No world-scavenging/pickup mechanic exists yet.** The world has fixed decoration (`OutdoorDressing.ts`) and fixed interaction points (NPCs, construction nodes, minigame portals) via the existing `InteractionPrompt` pattern, but nothing the player can pick up and add to a personal inventory. This epic's first milestone has to build that primitive before recipes or crafting can mean anything.

## Scope and sequencing

Three milestones, each building directly on the last:

- **M38 — Materials, Scavenging & Inventory Foundation**
- **M39 — Recipes, Cookbooks & Crafting Stations**
- **M40 — Upcycled Goods, Selling & the Deep Crafting Chain**

M38 must land before M39 (recipes need materials to consume); M39 must land before M40 (selling/using needs something to have been crafted). None of the three are blocked on any other new epic, but M39's crafting-station concept is designed to be picked up by [EPIC-34](EPIC-34-buildings-as-plugins-and-interiors.md) once that epic's building-interior framework exists, and M40's flagship "build a computer"/"build a bike" chains are written to make that connection explicit rather than leaving crafting stations placeless.

## Non-Goals (epic-wide)

- **No real-money or player-to-player item marketplace.** Selling upcycled goods pays the existing in-game cash currency only, through the existing single-player economy hooks.
- **No true randomness in material spawns, recipe discovery, or crafting outcomes.** Material pickup points and recipe locations are fixed, hand-authored placement lists (the `OutdoorDressing.ts` pattern), never randomly rolled — consistent with CLAUDE.md's headless-simulation rule.
- **No inventory weight/slot-limit simulation in v1.** A simple per-material-token count is enough to prove the system; a capacity/weight system is explicitly deferred, not silently assumed.
- **No rideable-vehicle physics.** A crafted bike (M40) is sellable and, at most, a simple flavor/cosmetic ride — real ride mechanics are explicitly out of scope here (and already flagged as an EPIC-31/M34 stretch item, not duplicated).
- **No multiplayer/shared crafting economy changes.** Out of scope for all 3 milestones; the existing M25 trade-offer system is not touched by this epic (a future cross-epic connection, not built here).
