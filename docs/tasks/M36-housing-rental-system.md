# M36 — Housing / Rental System

Story: [`docs/stories/EPIC-32-home-and-housing.md`](../stories/EPIC-32-home-and-housing.md)

Planning: none new under `docs/planning/` — scoped ad hoc from a direct user request ("users need to find a new flat or living community to rent in... brings different positive and negative things for health etc."), grounded by an Explore-agent audit of `WorldScene.ts`/`InteriorProps.ts`/`useGameStore.ts` (housing state), a second audit of `EconomyMath.ts`/`actions.ts`/`CrisisEngine.ts` (economy hook + tradeoff pattern), and a Plan-agent design pass, before writing this doc.

Status: **Planned — not yet implemented.**

## Section 1 — GameState housing slice

`apps/web/src/core/state/useGameStore.ts` + `apps/web/src/core/state/persistence.ts`:
- [ ] Add a top-level `housing: { currentFlatId: HousingOptionId | null; movedInOnDay: number | null }` slice to `GameState` (sibling to `commons`/`crisisState`, not nested under `player` — it's world-relationship state, not an intrinsic player stat). Update `INITIAL_STATE` with `currentFlatId: null, movedInOnDay: null` (no fixed home is a valid default, matching today's baseline).
- [ ] In `persistence.ts`'s `loadSave()` (both the server-load and IndexedDB-load paths), defensively merge `{ ...INITIAL_STATE.housing, ...saved.housing }` rather than trusting the loaded blob directly — there is no schema-version/migration system in this codebase, so a pre-M36 save has no `housing` field at all and would otherwise leave it `undefined`.
- [ ] No new `health` stat — this milestone does not touch `player`'s stat shape at all; housing tradeoffs apply through the existing `cash/energy/socialTrust/stressLevel` quartet only.

## Section 2 — Housing options data

New `apps/web/src/core/simulation/HousingOptions.ts`, mirroring `CrisisEngine.ts`'s static-scenario-module shape:
- [ ] Define `HousingOptionId` (string literal union) and `HousingOption { id: HousingOptionId; buildingId: 'apartmentBlockA' | 'apartmentBlockB'; unitLabel: string; label: string; description: string; rentPerDay: number; consequences: { cashDelta: number; energyDelta: number; trustDelta: number; stressDelta: number } }`.
- [ ] Populate a small static list (2-4 entries) modeling multiple "virtual" rentable units within the two existing apartment buildings (`WorldScene.ts:108-109`) — a data-only distinction, no new building geometry. Vary `rentPerDay` and `consequences` per option (e.g. a cheap/high-stress unit vs. a pricier/low-stress one) so the choice is a genuine tradeoff, following the same design spirit as `crisis_scenarios.json`'s two-path choices.
- [ ] Export a lookup helper (`getHousingOption(id)`) mirroring how `CrisisEngine.ts` looks up scenarios by id.

## Section 3 — Recurring rent wired into `advanceDay()`

`apps/web/src/core/simulation/EconomyMath.ts` + `apps/web/src/core/state/actions.ts`:
- [ ] Extend `applyDailyTick()` (`EconomyMath.ts:24-67`) to accept an optional housing-modifier parameter (same call shape already used for `commons`), and fold the current flat's `rentPerDay` (as a cash cost) and `consequences` deltas into the returned `DailyTickResult` — keep the function pure and unit-testable, matching the pattern `EconomyMath.test.ts` already exercises, rather than adding a second ad hoc deduction directly inside `actions.ts`.
- [ ] Update the call site in `advanceDay()` (`actions.ts:85-114`) to look up the active `HousingOption` (if `housing.currentFlatId` is set) and pass it into `applyDailyTick()`, applying the resulting deltas inside the existing single `setState` callback (reuse existing clamping logic already applied to cash/energy/stress there).
- [ ] If no flat is rented (`currentFlatId === null`), housing contributes zero deltas — must not regress the existing no-housing baseline.

## Section 4 — Housing-selection UI

New `apps/web/src/ui/HousingModal.ts`:
- [ ] Model directly on `CrisisWireModal.ts`'s `statChips()` (`:34-48`) and card layout (`:64-93`) — reuse the existing `delta-chip`/`delta--pos`/`delta--neg` CSS classes rather than duplicating styling. List each `HousingOption` as a card showing `label`, `description`, `rentPerDay`, and stat-delta chips for `consequences`.
- [ ] Selecting an option sets `housing.currentFlatId` and `housing.movedInOnDay = meta.day` via a new `moveIntoFlat(id)` action in `actions.ts` (mirroring `spendCash`/`gainCash`'s direct-`state.player`-patch style, but patching `state.housing`).
- [ ] Entry point: an in-world proximity prompt at the two apartment buildings, reusing the existing `InteractionPrompt` pattern already used for construction nodes (`WorldScene.ts:497`) — ties the housing choice to the physical building rather than an abstract HUD menu button.
- [ ] Switching flats later must stay allowed (re-opening the modal and choosing a different option while already housed) — this is a recurring, ongoing choice, not one-shot onboarding.
- [ ] Close via `bindEscapeClose()` (`modalDismiss.ts`), matching every other closable modal per M31's modal-close-consistency fix.

## Section 5 — Spawn / ownership interaction

`apps/web/src/ui/CharacterSelect.ts` + `apps/web/src/world/WorldScene.ts`:
- [ ] Leave the default player spawn point untouched for this milestone (`WorldScene.ts:465-466`) — do not couple spawn logic to `housing.currentFlatId` yet, to avoid churn against EPIC-31's M33, which has not yet decided its interior-isolation approach.
- [ ] Any "go home" affordance is a UI/fast-travel action (e.g. a button that pans/teleports the camera or player token to the rented building's door tile), not a change to where a fresh game or a day-reset spawns the player.
- [ ] Track ownership only at `GameState.housing` level — do not add per-player interior-variant rendering (e.g. hiding Pip's-specific decor for a non-Pip tenant) in this milestone; that risks overlapping M37's furniture-editing scope.

## Open design decisions (record resolution here when implemented)

- One-time move-in deposit/cost on switching flats, vs. frictionless switching at any time.
- Whether renting Apartment Block A changes its existing "Pip's Courier Room" flavor label, or that label stays purely cosmetic/legacy regardless of actual tenant.

## Architecture notes / non-goals

See [EPIC-32](../stories/EPIC-32-home-and-housing.md)'s epic-wide non-goals. No new `health` stat. No dependency on EPIC-31's M32/M33 landing first. No dynamic real-estate market — a small fixed `HousingOption` list, same static-data approach as `crisis_scenarios.json`. Game logic must stay `HousingOptionId`/token driven per `CLAUDE.md`'s Critical Architecture Rule — no hardcoded building-specific colors introduced by this milestone.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests for `HousingOptions` data validity, the extended `applyDailyTick()` housing-modifier math (mirroring `EconomyMath.test.ts`'s per-case style), and an `actions.test.ts`-style integration test (`resetStore()` → `setArchetype()` → `moveIntoFlat()` → `advanceDay()` → assert cash/stress/trust deltas match the chosen option).
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: approach each apartment building, confirm the housing prompt/modal appears with distinct options and visible stat-delta chips; rent a flat, advance a day, and confirm cash drops by `rentPerDay` and the other stats move per `consequences`; confirm switching to a different flat later works; confirm a fresh/unhoused game still advances days with zero housing deltas.
