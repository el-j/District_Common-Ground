# M14 Follow-up — Missing QA Coverage (Tests 14.2, 14.4, 14.5)

Found: 2026-09-15, full repo audit
Status: `[x] Complete` — all 3 tests built 2026-09-15, see `docs/SPRINT-2026-09-15-PLAN.md` §3.
Parent: [`M14-microkernel-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/M14-microkernel-minigames.md)

---

## The Gap

M14's underlying implementation (Go microkernel, `MinigameLoader`/`MinigameContainer`/`HostPlatformAPI`, the Living District Builder, the standalone courier-rush minigame, the trusted-plugin review flow) is real, correct, and confirmed by direct code reading — this is not a "feature doesn't exist" gap. But 3 of the milestone's 5 named acceptance tests have no actual automated coverage:

- **Test 14.2 (Zero Memory Leaks):** No test mounts/unmounts a minigame instance repeatedly and asserts clean teardown. `MinigameLoader.test.ts` only covers registration (`listMinigames`) and a single `grantRewards` mutation — never lifecycle or teardown.
- **Test 14.4 (Full Courier Delivery Loop):** No integration test exercises session-start → deliveries → score submission → DB wallet credit end-to-end. The pieces are each unit-tested individually (`session_manager_test.go` for tokens, `registry_test.go` for plugin lookup) but never chained together.
- **Test 14.5 (Trusted Plugin Review Flow):** `apps/api/internal/kernel/verification_requests.go` has real submit/list/review handlers wired into the router, but there is no `verification_requests_test.go` at all — zero test coverage on this handler.

## Why This Matters

This is the general risk the whole audit was looking for: code that's real and looks done, but whose "it's tested" claim doesn't hold up under direct inspection for every acceptance criterion. None of these three are hard to build — the underlying pieces already exist and are individually solid — they just were never stitched into the specific test scenarios the milestone doc named.

## Acceptance Criteria

- [x] **Test 14.2:** Added to `MinigameLoader.test.ts` — mounts/unmounts 10× via the real `MinigameLoader.launchMinigame()` + `MinigameContainer.unmount()`, asserts zero leaked DOM nodes. Required adding `jsdom` as a devDependency + a per-file `// @vitest-environment jsdom` pragma, since the project default is `node` (no DOM) and this is the first test to actually mount real DOM-touching code.
- [x] **Test 14.4:** Added `apps/api/internal/kernel/courier_delivery_loop_test.go` — real `StartSession`/`CompleteSession` handlers, real courier-rush plugin, real Postgres. **Correction to this doc's original wording:** there is no server-side wallet to assert against — `RecordSession` only persists an anti-cheat audit row (`plugin_sessions`); reward application happens client-side via the already-tested `HostPlatformAPI.grantRewards()`. The test verifies the server computes and persists the correct reward grant, plus rejects an implausible (anti-cheat-violating) payload.
- [x] **Test 14.5:** Added `apps/api/internal/kernel/verification_requests_test.go` — submit quarantines, owner-approve promotes to the verified catalog, owner-reject never promotes, non-owner review attempt gets `403`.
- [x] `M14-microkernel-minigames.md`'s section 7 checkboxes flipped to `[x]`; M14's top-level status updated to reflect zero remaining gaps.
- [x] `npm test` (311/311) and `go test -race -short ./...` (plus the real-Postgres integration runs) pass with no regressions.
