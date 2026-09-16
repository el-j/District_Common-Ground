# M23 — Content Variety & Delight

Story: [`docs/stories/EPIC-23-content-variety-and-delight.md`](../stories/EPIC-23-content-variety-and-delight.md)

Planning: none under `docs/planning/` — this is a direct-request feature scoped ad hoc, matching the M21/M22 precedent (no `23-*.md` vision doc exists or is needed).

Status: **Implemented 2026-09-16.** All 6 sections built and tested; full verification suite green (see below).

## Section 1 — Fix crisis-queue exhaustion (real bug)

- [x] `CrisisEngine.ts`'s `checkForCrisis()`: when `pendingQueue.length === 0`, call `initCrisisQueue()`'s reshuffle logic to refill the queue (excluding the ID that was just resolved, if any, so the immediate next crisis isn't a guaranteed repeat) instead of returning early forever.
- [x] `initCrisisQueue()` stays as the boot-time seed; extract the reshuffle step into a shared helper (`shuffleScenarioIds`) so both call sites use the same shuffle.
- [x] **Test 23.1**: drain a queue down to empty via repeated `triggerCrisis`/`resolveCrisis` calls, assert the next `checkForCrisis()` call (with cooldown/probability forced favorable) can still trigger a crisis. (`CrisisEngine.test.ts`)

## Section 2 — Wire existing celebratory feedback into the core loop's positive beats

- [x] `actions.ts`'s `updateCommonsProgress()`: returns `{ nodeJustCompleted: boolean }` instead of void.
- [x] `ConstructionModal.ts`: on `nodeJustCompleted`, calls `TactileEffects.playStageCompleteChime()` + `TactileEffects.spawnCelebrationParticles(this.el)` — same calls already used by `DistrictGrid.ts:113-117`, no new effect code.
- [x] `CrisisWireModal.ts`: when the player picks the solidarity choice (`type === 'solidarity'`), calls `TactileEffects.playStageCompleteChime()` after `resolveCrisis()`.
- [x] **Test 23.2**: unit tests asserting the chime/particle calls fire on node completion and on a solidarity crisis choice (spy on `TactileEffects`), and do *not* fire on a partial contribution or an authoritarian choice. (`ConstructionModal.test.ts`, `CrisisWireModal.test.ts`)

## Section 3 — NPC dialogue: expand rotation and widen tone

- [x] Extracted `DIALOGUES`/`pickDialogueKey` out of `WorldScene.ts` into `NpcDialogues.ts` (scoping note: needed so the pure dialogue-selection logic is unit-testable without pulling Phaser into a node-environment Vitest run — WorldScene.ts imports Phaser at module scope). Added a 4th and 5th tree per NPC (`mira_day4`/`mira_day5`, `leo_day4`/`leo_day5`, `elena_day4`/`elena_day5` — 6 new trees total). Both new trees per NPC are deliberately lighter/warmer beats (a cardboard "employee of the month" badge, a solar panel named "Sunny", a kid's question about panels getting tired, a handwritten thank-you note) rather than more hardship escalation.
- [x] `pickDialogueKey()`: widened the rotation array to all 5 trees per NPC (`(day - 1) % 5`), so day 4/5 are new content and the full cycle only repeats every 5 days instead of every 3.
- [x] **Test 23.3a**: `pickDialogueKey('mira', 4)` and `pickDialogueKey('mira', 5)` resolve to the two new trees, not a repeat of days 1-3; day 6 wraps back to day 1's tree (cycle length 5, confirmed by test). (`NpcDialogues.test.ts`)

## Section 4 — Gossip: add a second variant per archetype and one lighthearted default

- [x] `narrativeGossip.ts`'s `FALLBACK_LINES`: each leaf now holds 2 line variants per archetype (`Record<string, [string, string]>`), including a second, deliberately lighter `DEFAULT` variant per NPC. All second variants are solidarity-wins/good-news beats, not more hardship.
- [x] `pickGossipLine(npcId, archetype, day = 1)`: alternates between the two variants via `day % 2` (defaults to day 1 / variant 0 for backward compatibility with existing callers).
- [x] `scenariosToGossip(scenarios, npcIds, day = 1)`: threads `day` through to `pickGossipLine()`; `fetchDailyGossip(day = 1)` and its `WorldScene.ts` call site now pass the current game day.
- [x] **Test 23.3b**: for a fixed archetype, gossip text differs between an even and an odd day. (`narrativeGossip.test.ts`)

## Section 5 — Daily quests: expand the pool and rotate

- [x] `IrlQuestSystem.ts`: expanded the quest pool from 3 to 6 definitions (`skillshare-swap`, `green-space-tidy`, `check-in-call` — same tone/reward shape as the existing 3). `QuestId` union and `INITIAL_STATE.quests` in `useGameStore.ts` updated to match.
- [x] `getQuestsForToday()`: deterministically selects a rotating 3-of-6 window keyed by day (`questWindowForDay`) instead of unconditionally returning all quests in the pool.
- [x] **Test 23.4**: `getQuestsForToday()` called with two different day values returns two different 3-quest subsets (not identical, not empty). (`IrlQuestSystem.test.ts`; the pre-existing "marks completed quest as unavailable" test was made rotation-agnostic since it previously hardcoded a quest ID that isn't in every day's window.)

## Section 6 — BGM: add a second progression variant

- [x] `SoundSynth.ts`: added `BGM_CHORDS_NIGHT` (Am → Dm → Em → Am, same A-minor key family as the existing `BGM_CHORDS_DAY`) and a pure selector `selectBgmChords(phase: 'day' | 'night')`, reusing `_scheduleChord` — no new synthesis path. Gated on the day/night overlay-darkness signal `WorldScene.ts` already computes in `updateDayNight()` (the same value driving the streetlamps), via a new `setBgmPhase()` setter.
- [x] `_bgmTick()`: reads `selectBgmChords(_bgmPhase)` each loop iteration instead of the single hardcoded `BGM_CHORDS` constant.
- [x] **Test 23.5**: the pure selector function returns different progressions for different inputs (day vs. night), is pure, and shares its opening chord across both phases. (`SoundSynth.test.ts`)

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — 371/371 passed, full existing suite green (no regressions).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/api && go build ./... && go test -race -short ./...` — clean; no backend changes were needed for this milestone.
