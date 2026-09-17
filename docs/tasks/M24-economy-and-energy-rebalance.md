# M24 — Economy & Energy Rebalance

Story: [`docs/stories/EPIC-24-economy-and-energy-rebalance.md`](../stories/EPIC-24-economy-and-energy-rebalance.md)

Planning: none under `docs/planning/` — direct-request feature scoped ad hoc, matching the M21/M22/M23 precedent.

Status: **Implemented 2026-09-16.** All 3 sections built and tested; full verification suite green (see below).

## Section 1 — Wire the already-designed energy/inflation multiplier into the real math

- [x] `EconomyMath.ts`'s `applyDailyTick()`: `energyUpkeep` is now multiplied by `multipliers.energy` (mirrors how `foodCost` is already multiplied by `multipliers.food`) instead of being a fixed 8/10 constant immune to the multiplier system entirely.
- [x] `BalanceSimulator.ts`: replaced the "this would be a silent no-op" scope-note comment on `PERMANENT_INFLATION_MULTIPLIERS.energy: 1.75` with a note describing the real effect (base upkeep 10 → 18 at 1.75x).
- [x] **Test 24.1**: `applyDailyTick()` with `multipliers.energy = 1.75` produces a lower `energyDelta` (more upkeep cost) than the default multiplier, for a fixed archetype/commons/trust input. (`EconomyMath.test.ts`)

## Section 2 — A real, repeatable, player-initiated "Work" action

- [x] New `WorkSystem.ts` (not `EconomyMath.ts` or `actions.ts` — mirrors `IrlQuestSystem.ts`'s precedent of "one store-aware system, one file, own definitions table," since `performWork()` needs to read/gate/mutate the Zustand store, which doesn't fit `EconomyMath.ts`'s pure-function shape). `WORK_DEFINITIONS: Record<ClassRole, WorkDefinition>`:
  - `pip`: "Take a Delivery Gig" 🚴 — energy −10, cash +15
  - `morgan`: "Pick Up a Shift" 🚌 — energy −15, cash +20
  - `arthur`: "Manage the Properties" 🏢 — energy −5, cash +10
- [x] `useGameStore.ts`: added `player.lastWorkedDay: number | null` (mirrors `QuestState.completedOnDay`'s shape/semantics).
- [x] `WorkSystem.ts`: `getWorkForToday()` (shared gating logic: already-worked / too-tired / available) and `performWork(): { success: true } | { success: false; reason: 'already-worked' | 'too-tired' | 'no-archetype' }`. `'no-archetype'` was added beyond the original plan as a type-safety guard for the pre-character-select case (`classRole: null`), not exposed anywhere reachable in the real UI (the HUD button is hidden during the `'select'` phase).
- [x] `WorkModal.ts` (new, mirrors `QuestModal.ts`'s render/close pattern exactly): shows the current archetype's one work option, disabled with a reason-specific label ("✓ Done for Today" / "😴 Too Tired") if unavailable, calls `performWork()` on click and fires the existing `TactileEffects.playStageCompleteChime()` on success (same small-positive-beat convention as M23 §2).
- [x] `TopHUD.ts`: new icon-toolbar button (💼 "Work"), same registration pattern as the existing `quest` button, opens `WorkModal`.
- [x] **Test 24.2**: `performWork()` applies the correct archetype-specific cash/energy delta for all 3 archetypes; stamps `lastWorkedDay`; a second call the same day fails with `'already-worked'` and does not mutate state; fails with `'too-tired'` when `energy < energyCost` without mutating state; succeeds again on a later day; `getWorkForToday()`/`performWork()` degrade to `null`/`'no-archetype'` before character select. (`WorkSystem.test.ts` — new file, not `actions.test.ts`, matching the Section 2 file-location decision above.)

## Section 3 — Rebalance the `digital-deescalation` quest's oversized reward

- [x] `IrlQuestSystem.ts`: `digital-deescalation`'s `completeQuest()` branch changed from `player.energy = Math.round(player.maxEnergy * 1.1)` (a 110%-of-max overflow refill) to `player.energy = Math.min(player.maxEnergy, player.energy + 25)` — capped, proportionate to the rest of the energy economy (still the single biggest quest-granted energy reward, but no longer an order of magnitude outlier).
- [x] Updated the quest's displayed `reward` string from `'Energy → 110% (Refreshed Clarity)'` to `'Energy +25 (Refreshed Clarity)'`.
- [x] **Test 24.3**: completing `digital-deescalation` from a mid-energy state grants exactly +25 energy; from a near-full state, caps at `maxEnergy` rather than overflowing. Replaced the pre-existing test that asserted the old 110%-overflow behavior. (`IrlQuestSystem.test.ts`)

## Incidental fixture updates

Adding the non-optional `player.lastWorkedDay` field to `GameState` required adding `lastWorkedDay: null` to every test file that constructs a full `player` object literal (rather than a partial merge): `ConstructionModal.test.ts`, `CrisisEngine.test.ts`, `CrisisEngine.dynamic.test.ts`, `IrlQuestSystem.test.ts`, `TelemetryEvents.test.ts`, `actions.test.ts`, `DistrictGrid.test.ts`, `MinigameLoader.test.ts` (2 occurrences). No production/persistence code needed a migration — an old save missing the field resolves `lastWorkedDay !== null` to `true` (since `undefined !== null`), which combined with the `>= currentDay` check on `undefined` correctly falls through to "available," the same graceful-degradation pattern the quest system already relies on for `completedOnDay`.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — 383/383 passed (up from 371), full existing suite green, no regressions.
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/api && go build ./... && go test -race -short ./...` — clean; no backend changes were needed for this milestone (pure frontend economy/UI work).
