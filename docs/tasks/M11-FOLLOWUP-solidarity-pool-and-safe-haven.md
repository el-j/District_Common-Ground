# M11 Follow-up — Wire the Global Solidarity Pool for Real & Build the Safe Haven Ending

Found: 2026-09-15, full repo audit
Status: `[x] Complete` — both fixed 2026-09-15, see `docs/SPRINT-2026-09-15-PLAN.md` §1.
Parent: [`M11-shared-commons.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M11-shared-commons.md)

---

## The Gaps

### 1. The Global Solidarity Pool is functionally hollow (higher priority)

`apps/api/internal/save/solidarity_pool.go` computes its global index from `COUNT(*) FROM crisis_log`. Nothing in the entire codebase ever `INSERT`s a row into `crisis_log` during real gameplay:

- Frontend crisis resolutions (`actions.ts`, `CrisisEngine.ts`) only mutate local Zustand state, which persists as one opaque JSONB blob via the existing `PUT /api/v1/save` — never as normalized per-choice rows.
- The only `INSERT INTO crisis_log` anywhere in the repo is inside `solidarity_pool_test.go`'s own test fixture setup.
- **Net effect:** `GET /api/v1/district/resilience` always returns its neutral default in actual play, no matter what any player does. The endpoint, its Go tests, and the `TopHUD.ts` "District Pulse" badge that renders it are all individually well-built and correctly tested — the whole thing "works" only in isolation, because the one thing that's supposed to feed it real data never runs.

This is exactly the kind of gap that automated tests don't catch: the unit/integration tests seed `crisis_log` themselves and pass, giving false confidence that the feature works end-to-end.

### 2. "Safe Haven" ending doesn't exist

`M11-shared-commons.md` lists this as a manual smoke-test item ("complete Land Trust → banner displays"), implying the feature exists and just needs a human to confirm it visually. It doesn't exist at all — no banner, ending state, or `landTrustProgress`-completion trigger anywhere in `actions.ts`, `CrisisEngine.ts`, or `WorldScene.ts`. `EPIC-11-shared-commons.md`'s Test 11.2 asserts this as an acceptance criterion, so this is a real missing feature, not an unverified one.

## Options to Resolve

**For the Solidarity Pool:**
1. **(Recommended)** Add a genuine, minimal write path: when a crisis resolves client-side, fire a small authenticated `POST` (e.g. `/api/v1/district/crisis-log`) recording only the anonymous choice (scapegoat/solidarity) + archetype — no other player data — and have the Go handler insert into `crisis_log`. This is a small, well-scoped addition; the read side, schema, and tests already exist and don't need to change.
2. Re-scope: if a cross-player global pool isn't actually wanted right now, replace it with a per-player "personal resilience history" stat instead (data already available locally) and remove/relabel the "global" framing in the HUD badge and docs.

**For Safe Haven:**
1. **(Recommended)** Build the actual trigger: on `landTrustProgress` reaching 100, show a one-time celebratory banner/modal (matching the existing `ConstructionStages.ts`/`TactileEffects.ts` completion-celebration pattern from M14) and log the milestone to `historyLog`.
2. Drop the promise from `EPIC-11-shared-commons.md`'s Test 11.2 if it's no longer wanted as a distinct ending state.

## Acceptance Criteria

- [x] Decided the Solidarity Pool approach (real write path — Option 1) and implemented it: `POST /api/v1/district/crisis-log` in `apps/api/internal/save/solidarity_pool.go`, wired from `CrisisEngine.ts`'s `resolveCrisis()`. `TestHandleRecordCrisisChoice_EndToEnd_ChangesAggregate` proves a *live* crisis resolution (not a test-seeded row) changes the aggregate index.
- [x] Decided the Safe Haven approach (build — Option 1) and implemented it: `commons.safeHavenUnlocked` in `useGameStore.ts`, set in `actions.ts`, shown once via `WorldScene.ts`'s `checkSafeHaven()` + new `SafeHavenBanner.ts`.
- [x] `M11-shared-commons.md`'s manual-test section updated to reflect reality.
- [x] `npm test` (303/303) and `go test -race -short ./...` + full `go test ./...` (testcontainers) pass with no regressions.
