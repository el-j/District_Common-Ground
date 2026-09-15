# M14 Follow-up — Missing QA Coverage (Tests 14.2, 14.4, 14.5)

Found: 2026-09-15, full repo audit
Status: `[ ] Not Started`
Parent: [`M14-microkernel-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M14-microkernel-minigames.md)

---

## The Gap

M14's underlying implementation (Go microkernel, `MinigameLoader`/`MinigameContainer`/`HostPlatformAPI`, the Living District Builder, the standalone courier-rush minigame, the trusted-plugin review flow) is real, correct, and confirmed by direct code reading — this is not a "feature doesn't exist" gap. But 3 of the milestone's 5 named acceptance tests have no actual automated coverage:

- **Test 14.2 (Zero Memory Leaks):** No test mounts/unmounts a minigame instance repeatedly and asserts clean teardown. `MinigameLoader.test.ts` only covers registration (`listMinigames`) and a single `grantRewards` mutation — never lifecycle or teardown.
- **Test 14.4 (Full Courier Delivery Loop):** No integration test exercises session-start → deliveries → score submission → DB wallet credit end-to-end. The pieces are each unit-tested individually (`session_manager_test.go` for tokens, `registry_test.go` for plugin lookup) but never chained together.
- **Test 14.5 (Trusted Plugin Review Flow):** `apps/api/internal/kernel/verification_requests.go` has real submit/list/review handlers wired into the router, but there is no `verification_requests_test.go` at all — zero test coverage on this handler.

## Why This Matters

This is the general risk the whole audit was looking for: code that's real and looks done, but whose "it's tested" claim doesn't hold up under direct inspection for every acceptance criterion. None of these three are hard to build — the underlying pieces already exist and are individually solid — they just were never stitched into the specific test scenarios the milestone doc named.

## Acceptance Criteria

- [ ] **Test 14.2:** Add a test (Vitest, using `MinigameContainer`/`MinigameLoader`) that mounts and unmounts a minigame instance 10 times consecutively and asserts no leaked event listeners/timers/DOM nodes remain (or whatever teardown contract `MinigameInstance.unmount()` actually guarantees).
- [ ] **Test 14.4:** Add a Go integration test (or a combined frontend+backend httptest chain) that starts a courier-rush session, submits a plausible score payload, and asserts the wallet balance and any trust-related store field actually increase — using the real `StartSession`/`CompleteSession` handlers, not mocks.
- [ ] **Test 14.5:** Add `apps/api/internal/kernel/verification_requests_test.go` covering: submitting a request quarantines the plugin, an owner-approved review promotes it to the verified catalog, and a non-owner review attempt is rejected.
- [ ] `M14-microkernel-minigames.md`'s section 7 checkboxes are flipped to `[x]` once each test lands.
- [ ] `npm test` and `go test -short ./...` pass with no regressions.
