# EPIC-32 — Home & Housing System

> **2026-09-19 update:** This epic is **superseded** by the new [EPIC-34](EPIC-34-buildings-as-plugins-and-interiors.md)'s M43, which absorbs this epic's scope in full — see [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md). Every decision below (no new `health` stat, recurring rent via `applyDailyTick()`, slot-based furniture placement) carries forward unchanged into M43; the one upgrade is that furniture is sourced from the new crafting/upcycling system ([EPIC-33](EPIC-33-crafting-materials-and-upcycling.md)) instead of a fixed cosmetic catalog. The `M36`/`M37` milestone numbers below are **retired, not reused** — this doc is kept for its audit findings and decisions, not implemented as its own milestones.

## Origin

The user proposed a new feature (2026-09-19), following on from EPIC-31's planning pass: "a 'home-mode' will be nice where users need to find a new flat or living community to rent in. both brings different positive and negative things for health etc. also then a 'home-mode' to adjust the furniture and what is in the flat should be made." Two sub-features: (A) a housing/rental system where the player chooses among flats/living-communities with tradeoffs, and (B) a furniture/interior-decoration editor for the player's own home.

Three Explore agents independently audited the live code (housing/apartment representation, the economy/day-advance system, and existing furniture/prop-placement patterns) and a Plan agent synthesized a concrete implementation design, before any doc was written — grounded in what the code actually does, not assumptions from the request alone.

## Design Intent — what the audit actually found

**Two apartment buildings exist on the map, but only one has any interior.** `WorldScene.ts:108-109` defines Apartment Block A (footprint 2,45→13,61) and Apartment Block B (footprint 33,45→46,61), both in the South zone. Only Block A has a furnished interior — `pipsCourierRoom` in `InteriorProps.ts:51-61`, 4 hardcoded props — and even that is narratively "Pip's" without any actual `classRole` gating: any archetype can walk in and trigger the same camera framing. Block B is an empty walled shell.

**No housing, rent, or "health" concept exists anywhere in `GameState`.** The full state shape (`useGameStore.ts:29-80`) has no home/housing/rent field. The only per-player stats are `cash, energy, maxEnergy, socialTrust, stressLevel` — the CLAUDE.md-documented quartet. There is no dedicated "health" stat; `stressLevel` is the closest existing analog. `CharacterSelect.ts` never assigns a home — every archetype spawns at the same hardcoded point (`WorldScene.ts:465-466`) regardless of building. Grepping the whole codebase for "rent" turns up only narrative flavor text and one unrelated one-time crisis scenario (`housing-speculation` in `crisis_scenarios.json`) — never a recurring mechanic. There is also no schema-version/migration system for saved `GameState` — saves load via a wholesale `setState(saved)`, so any new field needs a defensive merge against `INITIAL_STATE` rather than relying on a migration step that doesn't exist.

**The economy system already has a clean hook and a ready-made tradeoff pattern to reuse.** `applyDailyTick()` (`EconomyMath.ts:24-67`) is a pure function computing daily `{energyDelta, cashDelta, stressDelta}`, called from `advanceDay()` (`actions.ts:85-114`) inside one atomic `setState` callback — a natural place to fold in a recurring housing modifier, the same way `commons` state is already passed in. The crisis-choice system's `consequences` shape (`CrisisEngine.ts:7-14`: `{cashDelta, energyDelta, trustDelta, stressDelta, worldEffect}`, rendered as delta-chips in `CrisisWireModal.ts:34-48,74-93`) is functionally identical to what "choosing a flat with pros/cons" needs — it just needs to apply recurring instead of once.

**Furniture placement has no state, no redraw path, and no free-placement UI precedent to build on.** `InteriorProps.ts` defines `PropToken`/`PropPlacement`/`InteriorDefinition` as a static, hardcoded 3-entry registry with zero Phaser dependency by design. Rendering (`WorldScene.ts:1211-1236`) resolves tokens to hardcoded `{w,h,color}` values inline in the scene file — a pre-existing, epic-predating gap against CLAUDE.md's Critical Architecture Rule that game logic must never hardcode skin-specific colors — and draws one-shot `Rectangle` objects with no stored references, so there is currently no way to destroy/redraw interior props at all (contrast `updateWorldDressing()`'s `dressingSprites` array, `WorldScene.ts:409`, which does support redraw). No inventory/item-ownership field exists in `useGameStore.ts`. The only "player places/assigns something via UI" precedent anywhere in the codebase is `DistrictGrid.ts`'s fixed-slot, click-then-confirm interaction — no drag-and-drop pattern exists anywhere to build on.

### Decisions made now (not left open)

- **No new `health` stat.** Housing tradeoffs map onto the existing Cash/Energy/Trust/Stress quartet — a 5th core stat would require a new HUD chip, a new balancing surface, and migration handling for a concept the quartet already reasonably covers (stress ≈ wellbeing, trust ≈ community fit, energy ≈ livability/commute, cash ≈ affordability).
- **M36 before M37**, hard dependency — the furniture editor needs to know which flat is "yours" before it can edit it.
- **Two existing apartment buildings model 2-4 "virtual" rentable units** (a data-only distinction between `HousingOption` entries pointing at the same two footprints) rather than blocking on new map geometry from EPIC-31's M32.
- **Furniture placement is slot-based**, reusing `DistrictGrid`'s select-then-confirm interaction, not freeform drag-and-drop.
- **Furniture is cosmetic-only in v1** — the "positive and negative things for health" language in the request was about the housing choice, not furniture; stacking stat effects onto individual furniture items is explicitly deferred rather than silently assumed.

## Scope and sequencing

Two milestones, sequential (M36 must land before M37):

- **M36 — Housing / Rental System**
- **M37 — Furniture / Home Interior Editor**

Neither milestone is blocked on EPIC-31 landing first. EPIC-31's M32 (world variety) has no overlap. M33 (building interiors) has only a soft overlap — it already plans interior content for both apartment buildings and would resolve the shared-overlay-vs-true-isolation rendering question; M37 reuses that decision if M33 has landed by the time M37 starts, otherwise does the minimal version itself scoped to just the two housing buildings.

## Non-Goals (epic-wide)

- **No dynamic real-estate market.** A small, fixed, static list of `HousingOption`s (mirroring `crisis_scenarios.json`'s static-data approach), not a procedurally generated or player-driven market.
- **No new `health` stat** — see decision above.
- **No freeform drag-and-drop placement.** Furniture placement is slot-based, matching the one existing placement-UI precedent in the codebase.
- **No retrofit of the pre-existing `PropToken`/`DressingPropToken` hardcoded-color architecture gap** outside the new furniture system specifically — that's separate, out-of-scope legacy cleanup, named explicitly so it isn't mistaken for something this epic silently ignored.
- **No furniture-driven stat effects in v1** — furniture is cosmetic only; the housing choice itself carries the stat tradeoffs.
- **No player-position/spawn-point changes** in M36 — "go home" is a UI/fast-travel affordance, not a change to where a fresh game spawns the player.
