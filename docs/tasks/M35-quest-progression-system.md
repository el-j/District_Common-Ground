# M35 — Real Quest & Progression System

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from a direct user complaint ("there need to be real quests to solve in every level so there is a progress"), grounded by an Explore-agent audit confirming the existing `IrlQuestSystem` is a self-attested daily buff with zero location/NPC linkage, and that `GameState` has no level/chapter concept anywhere today.

Status: **Planned — not yet implemented.**

## Section 1 — Establish a "level" concept without inventing a parallel system

`apps/web/src/core/state/useGameStore.ts` (existing `commons.*Progress` fields: `solarGridProgress`, `kitchenProgress`, etc.):
- [ ] Reuse the existing Commons build-node progress track as the game's "level" structure, since it's already the real long-horizon progression and no level/chapter field exists today. Reframe each world zone (North/Central/South/East Canal/Solar Quarter) as an explorable "level" gated loosely by its corresponding build node's progress, rather than adding a new `level`/`chapter` field to `GameState`.
- [ ] Document this mapping explicitly (zone ↔ build node ↔ "level") in this task doc's implementation, since it's a reframing of existing state rather than new state — a future reader needs to know `commons.kitchenProgress` *is* the Community Kitchen "level" progress, not find that implicit.

## Section 2 — New location-verified objective type, separate from `IrlQuestSystem`

New types alongside `apps/web/src/core/simulation/IrlQuestSystem.ts` (which stays unmodified — it's a fine, separate self-attested daily-buff mechanic, not being replaced):
- [ ] Define a new `WorldQuest` type (naming TBD at implementation time to avoid colliding with the existing `QuestId`/`QuestState` types) — each tied to a real target: a zone/coordinate to reach, a specific NPC to talk to, or a build-node milestone to complete.
- [ ] Verification must check real player state (position, dialogue-completion flag, or build-node progress) rather than a self-attested "Done" button — this is the core mechanical difference from `IrlQuestSystem`.
- [ ] Wire completion rewards into the same real state `IrlQuestSystem` already touches where appropriate (cash/energy/trust) plus, where relevant, directly advancing the associated `commons.*Progress` field (closing the loop identified in Section 1 — this is what makes it feel like "real progress" per the user's complaint, unlike today's quests which never touch Commons progress at all).

## Section 3 — Quest log / objective tracker HUD element

`apps/web/src/ui/` (coordinates with M31's HUD rework — build after M31 lands, or leave a clean seam if built in parallel):
- [ ] Add a persistent "current objective" indicator (chip or marker) to the HUD, distinct from the existing `QuestModal`'s daily-buff list — should be visible without opening a modal, similar in spirit to `#top-hud`'s existing passive stat readouts.
- [ ] Confirm it degrades gracefully (hides, doesn't error) when no `WorldQuest` is currently active.

## Section 4 — Quest-giver wiring

`apps/web/src/world/NpcDialogues.ts`:
- [ ] Wire `WorldQuest` assignment into existing NPC dialogue trees (the 6 named NPCs, each already with 5 rotating dialogue trees per `M23`) rather than building the unimplemented "Bulletin Board" concept from scratch.
- [ ] **Open item, not default scope**: building an actual Bulletin Board entity/interactable (referenced in `CLAUDE.md`'s World Zones list but never implemented) as a secondary/alternate quest-giving surface — flagged explicitly here; implement only if confirmed in scope when this task doc is picked up.

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals — `IrlQuestSystem` is not retired or merged away, it stays as a separate daily-buff mechanic alongside the new location-verified system. No multiplayer-shared quest state. Game logic for `WorldQuest` targets must stay `EntityToken`/zone-id driven, never reference skin-specific asset names, per `CLAUDE.md`'s Critical Architecture Rule.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests for `WorldQuest` completion-verification logic (position/dialogue/build-node checks, not self-attestation) and for the zone↔build-node "level" mapping.
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: pick up a `WorldQuest` from an NPC, confirm it cannot be completed by any means other than the real verified action, confirm completing it visibly advances the associated Commons build-node progress, and confirm the new HUD objective indicator reflects the active quest correctly (and hides cleanly when none is active).
