# M26 — NPC Roster Expansion

Story: [`docs/stories/EPIC-26-npc-roster-expansion.md`](../stories/EPIC-26-npc-roster-expansion.md)

Planning: none new under `docs/planning/` — pulls directly from the pre-existing `09-NPC-SOCIAL-NETWORK-AND-RELATIONSHIPS.md` character bible; third of the 5-part M24–M28 follow-up sequence, scoped ad hoc matching the M21–M25 precedent.

Status: **Implemented 2026-09-17.** All sections built and tested; full verification suite green (see below).

## Section 1 — Three new NPCs, wired into every existing NPC system

Roster grows from 3 (Mira, Leo, Elena) to 6, adding **Sal** (Corner Grocer — South courtyard, no node tie), **Marcus** (retired machinist — tied to the Community Tool Library node), and **Mrs. Higgins** (Tenement Historian — tied to the Community Land Trust node), all drawn from the existing "Seven Pillars" dossier rather than invented from scratch.

- [x] `apps/web/src/world/NpcDialogues.ts`: 5-tree rotating dialogue script per new NPC (15 new trees total), matching the exact length/structure/mood-tagging convention of Mira/Leo/Elena's trees; `pickDialogueKey`'s roster map extended.
- [x] `apps/web/src/api/narrativeGossip.ts`: full `FALLBACK_LINES` entry per new NPC (7 archetypes × 2 day-parity variants + DEFAULT — 16 lines each, 48 new lines total); `scenariosToGossip`'s default `npcIds` and `fetchDailyGossip`'s call site both extended from the hardcoded 3-NPC array to a shared `ALL_NPC_IDS` 6-NPC roster, so the new NPCs actually receive daily gossip (previously would have silently never gotten a line, since `gossipMap[npc.id]` would be `undefined` for any id not in that array).
- [x] `apps/web/src/world/WorldScene.ts`: 3 new `NPCEntity` instances (position + proximity + dialogueKey, mirroring the existing 3 exactly), `npcFrame` map extended, `createNPCTextures()`'s procedural canvas widened from 3 to 6 frames with 3 new distinct color configs (olive apron / grey coveralls / silver hair + violet shawl).
- [x] `apps/web/src/skins/SkinInterface.ts`: 3 new `EntityToken`s (`NPC_SAL_ATLAS`, `NPC_MARCUS_ATLAS`, `NPC_HIGGINS_ATLAS`) added to both the union type and `ALL_ENTITY_TOKENS` — required because `fetchManifest()` calls `validateManifest()` on every skin load, which throws if any token is missing from a manifest's `assetMap`.
- [x] `apps/web/src/skins/ThemeManager.ts`: `tokenToTextureKey` map extended with the 3 new tokens → `npc_sal`/`npc_marcus`/`npc_higgins` texture keys.
- [x] All 4 skin manifests (`solarpunk`, `aurora`, `retro_gb`, `labor_woodcut`) updated with the 3 new `NPC_*_ATLAS` entries, exactly matching each skin's existing convention (declared `textureUrl`+`frameRate` for the 3 art-oriented skins, empty `{}` for `labor_woodcut`) — otherwise `validateManifest()` would throw on every skin load going forward.

## Section 2 — Tests

- [x] `apps/web/src/world/NpcDialogues.test.ts`: new test asserting the 3 new NPCs resolve through the same 5-day rotation cycle; existing "every npc has exactly 5 dialogue trees" test extended to cover all 6.
- [x] `apps/web/src/api/narrativeGossip.test.ts`: the "defaults to the standard roster" test updated from asserting `['elena','leo','mira']` to the full 6-NPC sorted set.
- [x] `apps/web/src/skins/ThemeManager.test.ts`: the manifest test fixture extended with the 3 new tokens (its `assetMap` is typed `Record<EntityToken, SkinAssetEntry>`, so this was required for `tsc` to pass, not optional).

## Architecture notes / non-goals

See [EPIC-26](../stories/EPIC-26-npc-roster-expansion.md) for the full non-goals list. In short: this milestone builds *content* (more NPCs in the existing walk-up-dialogue-plus-gossip system), not a new *mechanic* — the planning doc's aspirational favor/reciprocity/trust-graph system is explicitly out of scope, matching the M16/M17/M25 precedent of building the real testable slice and documenting the rest as scoped down rather than silently skipped.

No backend changes — NPCs are pure frontend content; nothing about them is persisted server-side today (same as the pre-existing 3).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — 384/384 passed (383 prior + 1 new dialogue-rotation test), full existing suite green, no regressions.
3. `cd apps/web && npx oxlint src/` — clean.
4. No Go changes this milestone — backend suite untouched.
