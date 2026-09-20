# M49 — Origin-Linked Starting Conditions & Archetype Blending

Story: [`docs/stories/EPIC-36-character-origin-family-and-identity.md`](../stories/EPIC-36-character-origin-family-and-identity.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 4.

Status: **Implemented 2026-09-19.** Completes EPIC-36.

## Section 1 — Family template → starting stats

- [x] New `actions.ts` action `beginFromFamilyTemplate(templateId)` replaces `CharacterSelect.ts`'s old `setArchetype(role)` call site, seeding `player.cash/energy/socialTrust/stressLevel` from the chosen `FamilyTemplate.startingStats` directly — not `ARCHETYPE_SEEDS[classRole]`. The existing Pip/Morgan/Arthur numbers carry over unchanged (proven equal by M47's own test), but the *mechanism* is now real: a future template can diverge from the fixed 3 archetypes without any seeding code changing. `setArchetype()` itself stays in the codebase, untouched, still exported — this milestone only stopped calling it from the one place that used to.

## Section 2 — Family NPCs in-world

- [x] Each `FamilyTemplate.members` now spawns as a real, talkable NPC inside the template's actual home building — a genuine link into EPIC-34's housing and (structurally) EPIC-35's regions. New `FamilyTemplate.homeInteriorId` (an `InteriorId`, kept as `string` per this project's established cross-layer convention) maps each template to a real `InteriorProps.ts` interior: `courier-family` → `pipsCourierRoom`, `commuter-family`/`landlord-family` → `apartmentBlockB`. New `InteriorDefinition.familyNpcSlots` (2 fixed, collision-checked points per apartment interior) is genuinely different from every other NPC field in this file: **who** occupies those slots is *player-state-dependent* (whichever family template `origin.familyTemplateId` names), not fixed content — `InteriorScene.ts` reads `FamilyTemplates.ts` at render time rather than the slots being tied to a specific NPC in static data. All 6 family members got real single-fixed-tree dialogue in `NpcDialogues.ts` (the same scope reduction M42/M45 already established for minor NPCs) — no gossip/recipe-teaching, just characterful flavor tied to each family's circumstance.
- [x] **A real pre-existing bug found and fixed while wiring this, not left in place:** `InteriorScene.ts`'s `talkTo(npcId, dialogueKey)` derived its dialogue-overlay title from `INTERIORS[this.interiorId].npc?.name` — correct by coincidence for the single-static-NPC case (M42/M45) but would have shown the wrong title (or a generic "Talk" fallback) for a family member, who isn't that field. Refactored to `talkTo(dialogueKey, displayName)`, taking the display name explicitly at both call sites — fixes the latent bug and makes the family-NPC case correct by construction rather than accident.

## Section 3 — Archetype quartet reframed, not replaced

- [x] `ClassRole`/`setArchetype()` confirmed to remain in the codebase unchanged — grepped every call site before touching anything: `WorkSystem.ts`, `CrisisEngine.ts`, `TopHUD.ts`, `ShareModal.ts`, `MinigameLoader.ts`, and `PluginRegistry.ts` all still read `player.classRole` directly, none of them call `setArchetype()` themselves (it was only ever called from `CharacterSelect.ts`, confirmed by grep, so switching that one call site was the entire scope). **The exact mapping, recorded not left implicit** (per this section's own instruction): `classRole = FAMILY_TEMPLATES.find(t => t.id === familyTemplateId).classRole` — a direct 1:1 lookup baked into each template since M47, applied by `beginFromFamilyTemplate()`.

## Architecture notes / non-goals

See [EPIC-36](../stories/EPIC-36-character-origin-family-and-identity.md)'s epic-wide non-goals — no stat rebalance of the existing 3 archetypes. `chooseFamilyTemplate()` (M47) stays in the codebase, now unused by the real flow but still independently testable/exported — not removed, since it's harmless and small.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 591/591 passing (9 new: `FamilyTemplates.test.ts`'s `homeInteriorId`/`dialogueKey` coverage, `actions.test.ts`'s `beginFromFamilyTemplate` block (startingStats-not-ARCHETYPE_SEEDS proof, classRole mapping for all 3 templates, unknown-id no-op), `NpcDialogues.test.ts`'s member-dialogueKey-resolves-to-a-real-tree cross-check, `InteriorProps.test.ts`'s `familyNpcSlots` bounds/collision + `homeInteriorId`-references-a-real-interior checks) — every pre-M49 `classRole`-keyed test (quests, dialogue, Work action) still passes unchanged, confirming Section 3's "existing archetype logic untouched" claim for real, not just by inspection.
3. `cd apps/web && npx oxlint src/` — clean (same pre-existing non-blocking `sanitizePlayerName()` warning from M48, unrelated to this milestone).
4. `cd apps/web && npm run build` — clean production build (160 modules).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 6 changed/new source files return HTTP 200. Full interactive origin-flow walkthrough (family → name/identity → confirm, then finding the family NPCs inside the chosen home) stays manual — no headless browser available, the same limitation noted for every prior visual/interaction milestone.
