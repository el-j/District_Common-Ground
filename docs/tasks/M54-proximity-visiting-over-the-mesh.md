# M54 — Proximity Visiting Over the Mesh

Story: [`docs/stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md`](../stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 6.

Status: **Implemented.** **EPIC-38 and the entire M38–M54 backlog are now complete.**

## Section 1 — Visitable-building opt-in flag

- [x] Scoped to a player's home specifically (the recommended, and only, visitable "building type" for this milestone — see Section 2), not a generic per-building flag: `housing.visitable: boolean` added to `GameState.housing` (an existing M43 slice, not a new one — needed the same defensive-merge treatment `player` got in M48; `persistence.ts`'s `mergeWithDefaults()` now also spreads `housing` against `INITIAL_STATE.housing`, with 2 new tests proving both an old save missing the field and a real save's own value load correctly). Defaults `false`. New `setHousingVisitable(visitable)` action. Surfaced via a real toggle in `SettingsModal.ts` (the doc's own named fallback location, chosen over "near the building" since it needs no new spatial UI) — gated on `housing.currentFlatId` being set, since there's nothing to make visitable without a flat; shows an explanatory hint instead of a dead toggle otherwise.

## Section 2 — Peer discovery → visit flow

- [x] Built a real request/response protocol (`apps/web/src/core/mesh/ProximityVisiting.ts`) carried over the **existing** `'whisper'` `MeshChannel` (`packages/shared-types/src/mesh.ts`) — a deliberate, recorded decision **not** to add a new channel, since `'whisper'`'s private/1:1 intent already fits a visit probe exactly, and EPIC-38's non-goals rule out new mesh-protocol surfaces beyond what this milestone needs. `ProximityVisiting` is a pure, dependency-injected class (mirrors `TransportRegistry.test.ts`'s mockable style) with zero real mesh plumbing inside it — `sendToPeer`/`isLocallyVisitable`/`buildLocalSnapshot` are injected, so the entire probe/response/timeout/decline protocol is unit-tested with 2 wired-together in-memory instances simulating real peers (7 tests, `ProximityVisiting.test.ts`), no mesh transport needed for correctness coverage.
- [x] Wired into the real singleton mesh runtime (`meshRuntime.ts`): a new `sendVisitPayload()` reuses `sendChatMessage()`'s own signing/identity pattern exactly, just routed via `TransportRegistry.sendDirect()` (ttl:1, not `sendChatMessage`'s ttl:4 — `sendDirect` only ever targets an already-in-range peer, so there's no relay to budget for). The responder side (`ensureProximityVisiting()`'s `'whisper'` subscription) is armed unconditionally in `initMeshRuntime()`, not lazily on first `requestVisit()` — **a real bug caught and fixed before it shipped**: a lazy-only subscription would mean a player who never *initiates* a visit would also never *receive and reply to* someone else's probe, since nothing would ever arm their listener. New `requestVisit(peerId)`/`getNearbyPeers()` exports.
- [x] Scoped to exactly one visitable target (the player's home, via `housing.visitable`) and the existing `bitchat` transport (the only one this environment can exercise at all, confirmed by re-reading `meshRuntime.test.ts`'s own existing same-device-`BroadcastChannel` discovery test) — explicitly the small proof this epic's non-goals call for, not full building-type/transport coverage.
- [x] **Deliberate, recorded scope deviation from the doc's literal wording**: the "visit" entry point is a new HUD button (`TopHUD.ts`'s `proximity` entry, opening `ProximityVisitModal.ts`), **not** an in-world `InteractionPrompt` anchored to the player's position. `InteractionPrompt` (`InteractionPrompt.ts`) is a genuinely spatial Phaser object requiring a world x/y — a mesh peer has none (they're a real nearby device, not a world entity), and `WorldScene.ts`'s `update()` is already a dense, heavily-state-gated proximity/interactable-priority machine (`dialogueOpen`/`buildOpen`/`historyOpen`/`assemblyOpen`/`minigameOpen`...). Threading a new non-spatial discovery condition through it risked a real regression to that machine for a feature this environment can't live-test with 2 real peers anyway — the `registerButton()` HUD path is exactly as established and real an entry point as any (`WorldMapModal`/`SocialHubModal` open the identical way).

## Section 3 — Read-only rendering

- [x] Genuinely reused, not reimplemented: `FriendDistrictViewer.ts`'s private `renderSnapshot()` was extracted into an exported `renderDistrictSnapshotHtml(s: DistrictSnapshot): string`, which `FriendDistrictViewer` itself now calls (identical behavior, zero regression — no dedicated test file existed for this class to break) and which `ProximityVisitModal.ts` also calls directly for its mesh-fetched snapshot. The two visit paths differ only in how the `DistrictSnapshot` was fetched (`getFriendDistrict()`'s HTTP call vs. a mesh probe/response) — confirmed the shapes match exactly by reading `apps/api/internal/social/repository.go`: `activeCrisis` is the server's raw `crisisState.activeCrisisId` string, unresolved to a title, so the new local `buildLocalDistrictSnapshot()` (in `ProximityVisiting.ts`) intentionally does the same, keeping zero shape drift between the server-fetched and mesh-fetched paths.

## Architecture notes / non-goals

See [EPIC-38](../stories/EPIC-38-hub-plugin-universe-and-proximity-multiplayer.md)'s epic-wide non-goals — no live shared-state editing, no new mesh transports, no default-on visiting. Confirmed upheld: the visit is a one-shot read-only snapshot (no live sync/polling), `bitchat` is the only transport touched, and `housing.visitable` defaults `false` with no code path that flips it without a direct player click.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 609/609 (18 new: 9 `ProximityVisiting`/`buildLocalDistrictSnapshot` protocol tests, 2 `persistence.ts` housing-merge tests, 1 `setHousingVisitable` action test, 3 `SettingsModal` proximity-toggle tests, plus fixture fixes), no regressions.
3. `cd apps/web && npx oxlint src/` — clean, same pre-existing non-blocking warning.
4. Root `npm run build` — clean; PWA precache unchanged at 32 entries.
5. Live via the Vite dev server: confirmed `200` on the dev index and both new modules (`ProximityVisitModal.ts`, `ProximityVisiting.ts`).
6. **Real 2-peer live testing is not feasible in this environment, exactly as this section's own fallback anticipated — confirmed, not assumed**: `plugin-bitchat`'s actual peer connection (`BitChatConnectionPool`) is built on real `RTCPeerConnection`/WebRTC, unavailable in this environment; `meshRuntime.test.ts`'s own pre-existing test only fakes the *discovery announcement* over `BroadcastChannel`, never a completed handshake. The full probe/response protocol's correctness is instead proven by `ProximityVisiting.test.ts`'s 2-instance in-memory simulation (Section 2), which exercises the exact same protocol logic the real transport would carry — only the transport itself (proven separately, pre-existing, out of this milestone's scope) is unverified live. This gap is recorded here explicitly, not silently skipped.

---

**This completes the entire planned backlog** (M38 → M54, EPIC-33 through EPIC-38) from the 2026-09-19 Open-World, Crafting & Identity vision, implemented in order per direct instruction with no pauses between milestones.
