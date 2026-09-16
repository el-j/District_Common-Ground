# EPIC-23 — Content Variety & Delight

## Origin

Direct user request, 2026-09-16: *"there are always the same messages, all seems to be very [triste] and repeating. we need to get this way better!"* This epic is a grounded response to that — not a new vision doc under `docs/planning/` (no `23-*.md` exists, matching the M21/M22 precedent of ad-hoc features scoped directly as a story+task pair), but a direct code audit of every place the game produces text/audio content, followed by fixes for the real repetition sources and one real bug found along the way.

## Grounded diagnosis

Read end-to-end: `WorldScene.ts`'s `DIALOGUES`/`pickDialogueKey`, `narrativeGossip.ts`'s `FALLBACK_LINES`, `IrlQuestSystem.ts`'s quest pool, `CrisisEngine.ts`'s queue logic, all 23 entries in `crisis_scenarios.json`, `SoundSynth.ts`'s BGM loop, and every celebratory-feedback call site (`TactileEffects.ts`, `SafeHavenBanner.ts`, `DistrictGrid.ts`).

1. **NPC dialogue hard-cycles and never grows.** `pickDialogueKey(npcId, day)` returns `options[(day - 1) % options.length]` where `options` has exactly 3 entries per NPC (Mira/Leo/Elena). From day 4 onward every conversation is a verbatim repeat of day 1, forever, for the rest of any playthrough.
2. **Gossip is a fixed 21-line table, and it's the *only* path most players ever see.** `narrativeGossip.ts`'s `FALLBACK_LINES` has exactly 7 archetype-keyed lines × 3 NPCs. `pickGossipLine()` is a pure 1:1 lookup — the same archetype always produces the identical line. Per the M8/M9 audit already on record, there is no live AI narrative feed in this environment (`fetchDailyNarrative()` always falls through to the empty/`source: 'empty'` case), so this 21-line table isn't a fallback in practice — it's the entire gossip system.
3. **Daily quests never rotate.** `IrlQuestSystem.ts` defines exactly 3 quests. `getQuestsForToday()` has no selection/rotation logic at all — it is the same 3 quests, forever, every single day of the game.
4. **A real bug: crises stop happening permanently once the pool is exhausted.** `initCrisisQueue()` shuffles all 23 scenario IDs into `pendingQueue` once. `checkForCrisis()` returns immediately if `pendingQueue.length === 0` — there is no refill. Once a playthrough has burned through all 23 scenarios, no crisis will ever trigger again, silently, with no error or signal.
5. **Every piece of narrative content is tonally uniform — grim.** All 23 crisis scenarios (evictions, disinformation, utility shutoffs, ICE activity, rate hikes) and all 21 gossip lines land in the same register: serious hardship. There is not one scenario or line anywhere in the game's content that is lighthearted, funny, or purely a good-news beat. This is very likely the concrete source of "very sad" — the mechanic (scapegoat-vs-solidarity under stress) is the intended premise and stays, but nothing ever varies the emotional temperature around it.
6. **The game's actual "you did something good" moments have no payoff.** `TactileEffects.playStageCompleteChime()` + `spawnCelebrationParticles()` already exist and are wired into the personal `DistrictGrid` parcel builder (`DistrictGrid.ts:113-117`) and the one-time `SafeHavenBanner` ending — but *not* into completing a Commons build node (Kitchen/Solar/Legal Fund/Tool Library — `actions.ts`'s `updateCommonsProgress`) or choosing solidarity in a crisis (`CrisisWireModal.ts`). The core loop's two main positive beats currently land with zero audio/visual acknowledgment.
7. **The music never changes.** `SoundSynth.ts`'s `startBGMLoop()` plays exactly one fixed Am→F→C→G, 84bpm, 11.4-second loop unconditionally for the entire session. `setBgmProfile()` exists but its own comment says "no runtime effect yet" — it's dead plumbing.

## What this epic builds concretely

1. Fix the crisis-queue exhaustion bug (#4) — reshuffle a fresh queue when the pool drains, so crises keep happening for the life of a playthrough.
2. Wire the already-built `TactileEffects` chime/particles into Commons node completion and solidarity crisis resolution (#6) — pure reuse of existing infra, no new engine work.
3. Expand NPC dialogue from 3 to 5 trees per NPC and widen the rotation (#1) — including at least one genuinely lighter/warmer beat per NPC, not just hardship escalation.
4. Add a second gossip line per archetype per NPC and alternate between them deterministically (#2), plus one lighthearted line in the `DEFAULT` tier.
5. Expand the quest pool and add day-based rotation so the same 3 quests aren't offered forever (#3).
6. Add a second BGM chord-progression variant gated by existing day/night or world-effect state, reusing the same `_scheduleChord` machinery (#7).

## Scope decisions

- **Not in scope:** standing up a live AI narrative backend to replace the fallback tables — that's the M8/M9 "real RSS/live-feed ingestion" scope decision already on record as formally deferred, not reopened here.
- **Not in scope:** rewriting the scapegoat-vs-solidarity crisis framework itself, or diluting its stakes — the ask is to break monotony and add warmth around the existing mechanic, not soften the game's actual premise.
- **Not in scope:** new art assets or a second music instrument/timbre — the BGM fix reuses the existing oscillator-based chord scheduler with a second progression, not a new synthesis engine.
- Content additions (dialogue, gossip, quests) reuse the exact existing data shapes (`DialogueTree`/`DialogueNode`, `Record<string, Partial<Record<string,string>>>`, `QuestDefinition`) — no new content pipeline.

## Acceptance Criteria Tests

- **Test 23.1** — After a playthrough resolves every scenario in the shuffled queue, the queue refills and a subsequent crisis can still trigger (once cooldown/probability allow it) instead of going silent forever.
- **Test 23.2** — Completing a Commons build node triggers the existing celebration chime/particles; choosing solidarity in a crisis triggers the existing celebration chime.
- **Test 23.3** — `pickDialogueKey`/gossip selection produce non-identical content across a wider day range than before (day 4 ≠ day 1 verbatim).
- **Test 23.4** — `getQuestsForToday()` returns a different subset of quests on different days rather than the same fixed 3 forever.
- **Test 23.5** — The BGM progression-selection logic is pure and testable, and actually varies by the input game state it's gated on.
