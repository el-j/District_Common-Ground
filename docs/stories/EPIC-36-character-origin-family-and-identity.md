# EPIC-36 — Character Origin, Family & Identity

## Origin

From the broader vision [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) (2026-09-19): the game should open with something closer to being born from a family than picking a card — with the player able to adjust their name and gender, including diverse/non-binary options.

## Design Intent — grounded in the real current code

**Character creation today is a single upfront pick among 3 fixed archetype cards, with no name or identity input at all.** `CharacterSelect.ts` (confirmed by direct read) renders exactly `ARCHETYPES` (`pip`/`morgan`/`arthur`), each a hardcoded name, title, description, and starting-stat quartet; clicking a card calls `setArchetype(role)` and that's the entirety of character creation. There is no text input anywhere in this flow, no gender field, no appearance choice — the player's "character" is entirely determined by which of 3 fixed cards they clicked.

**`GameState.player` has no name, gender, or appearance field to extend.** `classRole: ClassRole | null` (`'pip' | 'morgan' | 'arthur'`) is the only identity-adjacent field in the whole state shape (`useGameStore.ts:49-61`, confirmed by direct read) — this epic adds new fields rather than repurposing an existing one.

**`CharacterSelect` is a deliberately non-dismissible forced-choice gate** (an explicit, documented decision from M31 — see its code comment and EPIC-31 §4), and this epic's new origin sequence inherits that same property: it is the game's mandatory opening flow, not an optional side modal, so it must be designed with the same non-dismissible, must-complete-once semantics `CharacterSelect`/`AuthOverlay`/`CrisisWireModal` already share.

**The skin/token architecture is the direct mechanism for appearance customization without breaking the Critical Architecture Rule.** Any player-chosen appearance value (skin tone, hair, etc.) must be stored as an abstract token in `GameState`, resolved to actual rendering only inside a skin's `SkinRenderer`/`createPlayerTexture()` implementation — never as a hardcoded hex value in game logic, exactly the same discipline `EntityToken` already enforces for every other visual element.

## Scope and sequencing

Three milestones:

- **M47 — Birth & Family Generation** (a fixed, hand-authored library of family/background templates, replacing/extending the current 3-archetype set; deterministic selection, never true randomness)
- **M48 — Name & Identity Customization** (free-text name input; an inclusive gender-identity selector with a self-describe option; an appearance token choice, resolved via the skin architecture)
- **M49 — Origin-Linked Starting Conditions & Archetype Blending** (family background templates determine starting stats, narratively explaining rather than replacing the existing Pip/Morgan/Arthur-style quartet; family members appear as real NPCs tied into [EPIC-34](EPIC-34-buildings-as-plugins-and-interiors.md)'s housing and [EPIC-35](EPIC-35-open-world-regions-and-travel.md)'s starting region)

M47 and M48 can be developed in parallel (family-template data vs. identity-input UI are largely independent surfaces); M49 depends on both, since it's the milestone that actually wires family template → starting stats → in-world family NPCs together.

## Non-Goals (epic-wide)

- **No true randomness in family generation.** A fixed, hand-authored template library selected deterministically (mirroring how `crisis_scenarios.json` provides "varied but not random" content) — never a procedurally generated family.
- **No full birth-to-adulthood life simulation.** The origin sequence sets narrative/mechanical context only; the player begins actual gameplay as a young adult, exactly as today — this is explicitly not a Sims-style life-stage system.
- **No retroactive rebalance of the existing Pip/Morgan/Arthur stat data.** M49 explains and extends the existing quartet via family-template framing; it does not change their numbers as part of this epic.
- **No third-party identity-verification or real-name requirements.** The name field is free text, entirely fictional, with no validation beyond basic length/content sanitization.
- **No mandatory appearance customization complexity beyond what a skin can actually render.** Appearance tokens are only as rich as the active skin's `SkinRenderer` supports — this epic does not require every one of the 8 existing skins to support every appearance token on day one; a documented fallback (default appearance per skin) is acceptable and expected.
