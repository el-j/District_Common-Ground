# M47 — Birth & Family Generation

Story: [`docs/stories/EPIC-36-character-origin-family-and-identity.md`](../stories/EPIC-36-character-origin-family-and-identity.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 4.

Status: **Implemented 2026-09-19.**

## Section 1 — Family template data model

New `apps/web/src/core/simulation/FamilyTemplates.ts`:
- [x] `FamilyTemplateId` + `FamilyTemplate { id, familyName, circumstance, startingStats, homeRegion, members, classRole }` — 3 fixed, hand-authored templates reframing the existing Pip/Morgan/Arthur economic circumstances as family origin stories (courier/commuter/landlord families), each with 2 named members. **Deviation, recorded not silent:** added `classRole` (not in the doc's original field list) — it's what still lets `CharacterSelect.ts` call the existing, unchanged `setArchetype()` stat-seeding mechanism (see Section 3's note on why `startingStats` isn't wired to actually seed stats yet). `startingStats` is proven, not just asserted, to match `actions.ts`'s real `ARCHETYPE_SEEDS` exactly via a real test — no retroactive rebalance, per EPIC-36's own non-goal.

## Section 2 — Deterministic selection sequence (the new origin flow)

- [x] **"Random family" resolved as *varied*, not procedurally generated** — the player picks among the fixed 3-template library, the exact same sense `CharacterSelect`'s existing archetype pick already worked in. No dice roll anywhere in this milestone.
- [x] Inherits `CharacterSelect`'s existing non-dismissible forced-choice-gate treatment unchanged (still no ×/Escape, same M31-documented convention) — restructuring the flow internally didn't touch that property.

## Section 3 — Origin sequence UI

- [x] `CharacterSelect.ts` restructured into a 2-step flow: family template pick → confirm (showing the chosen family's circumstance and both named members) → "Begin Your Story". **Scope note, recorded not silent:** the doc's "family template pick → (M48's name/identity step) → confirm" 3-step sequence collapses to 2 steps in this milestone, since M48 hasn't landed yet — the confirm step slots directly after the pick step for now, and M48 will insert its name/identity step between them without needing to restructure this flow again (the 2-step `step: 'family' | 'confirm'` state machine already generalizes to 3 steps cleanly).
- [x] Reuses the existing `.archetype-card`/`.card-name`/`.card-title`/`.card-desc`/`.card-stats`/`.cs-*` CSS classes throughout, per the doc's own "reusing its existing card-based layout conventions" instruction — only the confirm step's member-list needed a handful of new, minimal classes (`.cs-family-member*`, `.cs-confirm-actions`, `.cs-begin-btn`).
- [x] New `origin: { familyTemplateId }` top-level `GameState` slice (another brand-new top-level key, safe against old saves with no migration code, same established pattern every prior milestone's new slice has used) and a new `chooseFamilyTemplate()` action, called from the confirm step's "Begin Your Story" button alongside the existing `setArchetype(template.classRole)` call — both fire together, but remain two separate, independently-testable actions (recording the *choice* vs. *seeding stats* are different concerns, and M49 will change which one actually drives `player`'s starting numbers).

## Architecture notes / non-goals

See [EPIC-36](../stories/EPIC-36-character-origin-family-and-identity.md)'s epic-wide non-goals — no true randomness, no full life simulation. Starting-stat wiring to the chosen template (having `startingStats` itself, not `setArchetype(classRole)`, actually seed `player`) stays M49's job, exactly as this doc originally specified — `FamilyTemplate.startingStats` exists in the data model and is proven equal to the archetype seeds it mirrors, but nothing reads it directly yet. `FamilyTemplate.homeRegion` is likewise present but unwired to spawn logic (also M49's "tied into EPIC-35's starting region" job).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 566/566 passing (12 new: `FamilyTemplates.test.ts` (determinism, all 3 archetypes carried forward, `startingStats` verified equal to the real `ARCHETYPE_SEEDS`, member/homeRegion coverage), `CharacterSelect.test.ts` (family-step card count, confirm-step member rendering without premature completion, back navigation, full begin-flow proving `origin.familyTemplateId`/`player.classRole`/`meta.phase` all land correctly)).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (160 modules).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 5 changed/new source files return HTTP 200. A pre-existing test-infrastructure gap was found and fixed along the way: `CharacterSelect.ts` has never had a unit test before this milestone, and writing one surfaced that it transitively imports `GeoPreviewModal.ts` → `world/InputManager.ts` → real Phaser at module scope, crashing under plain jsdom — mocked out with the same `InputManager` stub `DialogueOverlay.test.ts`/`TopHUD.test.ts` already use, not a regression this milestone introduced. Full interactive origin-flow walkthrough from boot stays manual, the same limitation noted for every prior visual/interaction milestone.
