# M18 — Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync

Story: [`docs/archive/EPIC-18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-18-offline-first-device-storage-and-sync.md)  
Planning: [`docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md)  
Status: `[x] PoC Complete`

---

## 1. Local-First Device Storage Engine (`apps/web/src/core/offline/`)
- [x] `DeviceStorageEngine.ts`:
  - [x] IndexedDB schema manager (via `idb-keyval`, same library `persistence.ts` already uses), with OPFS feature-detected (`isOpfsAvailable()`) purely as an availability signal — no bespoke OPFS storage backend was built, since nothing in this codebase needs OPFS's byte-range file semantics yet; IndexedDB is the real, single storage backend, matching the app's existing baseline
  - [x] Requests a permanent storage lease via `navigator.storage.persist()`
  - [x] Storage quota monitor (`checkStorageQuota()`, backed by `navigator.storage.estimate()`) flags `low: true` above 90% usage
- [x] `SignedEventLog.ts`:
  - [x] Local Ed25519 cryptographic keypair management (`crypto.subtle`), reusing the exact pattern already proven in `packages/plugin-mutual-credit/src/CryptoLedger.ts` — a separate keypair/IndexedDB key, namespaced apart from the mutual-credit ledger's
  - [x] Append-only action delta ledger (`SignedEventLog` class) with SHA-256 hash chaining
  - [x] Tamper-evident transaction signing over `(id, vectorClock, payload, ...)` — `createSignedDelta`/`verifyDeltaSignature`
- [x] `VectorClockManager.ts`:
  - [x] Monotonic logical clock (`increment`) and multi-node vector clock `merge` (pointwise max)
  - [x] Causality tracking (`compare` → equal/before/after/concurrent) to distinguish concurrent vs. sequential edits

## 2. Conflict-Free Delayed Synchronization Engine (`apps/web/src/core/sync/`)
- [x] `CRDTSyncEngine.ts`:
  - [x] State-based CRDT reconciliation rules, pure and transport-agnostic (works identically whether deltas arrive from the Go gateway below or, later, an M19 mesh peer)
  - [x] PN-Counter resolver (`mergePnCounter`/`mergePnCountersByNode`) for community resource pools and resilience scores
  - [x] Last-Write-Wins (LWW) resolver with Lamport tie-breaker (`resolveLwwParcels`, deriving the Lamport time as a vector clock's max component) for district parcels
  - [x] OR-Set resolver (`resolveOrSet`) for IRL civic deeds and unlocked badges
- [x] `SyncQueueService.ts`:
  - [x] Background delta queue with unacknowledged-action tracking (`pendingCount`)
  - [x] Online/offline awareness via an externally-driven `setOnline()` (kept DOM-agnostic on purpose — the caller wires `navigator.onLine`/online/offline events at the edge, matching the project's convention of pushing browser APIs to boot-time wiring, not into pure logic classes)
  - [x] Exponential backoff retry loop (`flush()`, capped at `maxDelayMs`)
- [x] `DistrictGatewayClient.ts` + **new Go backend** (`apps/api/internal/sync/`, migration `011_create_sync_deltas`, `POST /api/v1/sync/deltas`, auth-required like `/api/v1/save`): same-account multi-device reconciliation — a device uploads its new deltas and its vector clock, and learns about any deltas already recorded from its other devices it hasn't seen yet. Verified end-to-end against real Postgres via `testutil.NewPostgres` (two simulated devices, one uploads, the other learns the delta; a duplicate re-upload doesn't duplicate the row).
  - Scoping note: this covers **Tier 2 (grid/internet)** sync only. Tier 1 (off-grid peer mesh — Bluetooth/LoRa/WebRTC) is M19's `MeshTransportPlugin` territory; `CRDTSyncEngine`/`SignedEventLog` are transport-agnostic specifically so M19 can plug into them later without rework.
  - Scoping note: `SyncQueueService`/`DistrictGatewayClient` are built and unit-tested but **not yet activated in `main.ts`'s boot sequence** — `recordAction()` (below) produces and persists the local signed log today; enqueuing those deltas onto the sync queue and running a periodic background flush against the gateway is a follow-up, not claimed here.

## 3. Zero-Network PWA & Sneakernet Air-Gap Sync
- [x] `ServiceWorkerRegistry.ts` (`apps/web/src/core/pwa/`):
  - [x] Precaching of static assets/game scripts/audio synths/tilesets — **was already fully implemented** by `apps/web/vite.config.ts`'s `vite-plugin-pwa` config (Workbox `globPatterns` covering every build asset, `navigateFallback: 'index.html'`, cache-first runtime caching for skin/data assets). This module does not duplicate that; it adds the two pieces Workbox doesn't cover: requesting the persistent-storage lease and reporting whether a service worker is actively controlling the page (`initOfflineReadiness()`, wired into `main.ts`'s `boot()`)
  - [x] Cache-first runtime strategy — pre-existing, see above
- [x] `PaperMeshQR.ts`:
  - [x] Chunking/reassembly protocol (`encodeToFrames`/`MeshQrFrameAssembler`) — splits any JSON-serializable payload into checksummed, order-independent, QR-sized string frames and reassembles + SHA-256-verifies them, tolerant of duplicate/out-of-order/partial delivery
  - Scoping note: actual QR **rendering** (frame string → scannable image) and camera-based **scanning** are not implemented — no QR library was added. This mirrors the exact boundary M16's `apps/web/src/irl/PeerVerification.ts` already drew (a 4-word code, not a QR scan): the protocol is real and tested; wiring it to `<canvas>` rendering + `getUserMedia` capture is a follow-up.
- [ ] Micro-SD / USB Snapshot Export — not built; `PaperMeshQR.ts`'s encode/decode functions work on any JSON payload so a file-based (non-QR) export/import would reuse the same protocol, but the file-drop UI itself wasn't implemented

## 4. Standalone Native Distribution Packages
- [x] `apps/web/src-tauri/tauri.conf.json` + minimal `Cargo.toml`/`build.rs`/`src/main.rs` — a standard Tauri v2 desktop-shell scaffold (window config, `district-common-ground` binary target)
- [x] `apps/web/capacitor.config.ts` — Android packaging config (`webDir: 'dist'`, `androidScheme: 'https'`)
- [x] `make build-desktop-tauri` / `make build-android-capacitor` / `make build-offline-pwa` targets in the root `Makefile`
  - Scoping note: **unverified** — this environment has no Rust toolchain and no Android SDK, so neither `make build-desktop-tauri` nor `make build-android-capacitor` has actually been run (no `android/` native project has been generated via `npx cap add android` either). This is the same boundary already drawn for M17's Meshtastic hardware drivers ("unverified against real hardware"), applied to native packaging instead.

## 5. Instrumentation — wiring real gameplay actions into the local signed log
- [x] `apps/web/src/core/offline/offlineRuntime.ts` — a lazily-initialized singleton `SignedEventLog` (device identity generated/persisted on first use) with a fire-and-forget `recordAction()`, mirroring `persistence.ts`'s never-block-gameplay convention
- [x] `actions.ts`'s `updateCommonsProgress()` records a `COMMONS_RESOURCE_CONTRIBUTION` delta (the PN-Counter case — this is exactly Test 18.4's scenario)
- [x] `apps/web/src/irl/BadgeRegistry.ts`'s `awardForDeed()` records an `IRL_DEED_LOGGED` delta (the OR-Set case) regardless of server-sync status
- [x] `apps/web/src/builder/DistrictGrid.ts`'s `upgradeParcel()` records a `PARCEL_STAGE_ADVANCE` delta (the LWW case)

## 6. Quality Assurance & Verification Tests
- [ ] **Test 18.1 (Zero-Network Boot):** manual — requires a real browser with DevTools network set to "Offline"; not attempted
- [ ] **Test 18.2 (Storage Permanence):** manual — requires a real browser memory-pressure eviction test; not attempted
- [x] **Test 18.3 (Cryptographic Delta Signing):** `SignedEventLog.test.ts` — 5+ locally-generated deltas verified with valid Ed25519 signatures and SHA-256 hash chaining (`verifyChainLinkage`), including tamper and wrong-keypair rejection
- [x] **Test 18.4 (CRDT Merge Without Loss):** `CRDTSyncEngine.test.ts` — two simulated devices, each contributing to the solidarity pool across 10 disconnected days, additively merge to the exact combined total with zero data loss; a re-merge of the same deltas (simulating a retried sync round) doesn't double-count
- [x] Go: `internal/sync/handler_test.go` — nil-pool unit tests (400s, Content-Type) + a real-Postgres integration test (two devices, upload/relay/dedupe) via `testutil.NewPostgres`
