# M18 — Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync

Story: [`docs/stories/EPIC-18-offline-first-device-storage-and-sync.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-18-offline-first-device-storage-and-sync.md)  
Planning: [`docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md)  
Status: `[ ] Planned (Offline-First Architecture)`

---

## 1. Local-First Device Storage Engine (`apps/web/src/core/offline/`)
- [ ] `DeviceStorageEngine.ts`:
  - [ ] IndexedDB schema manager with OPFS (Origin Private File System) fallback
  - [ ] Request permanent storage lease via `navigator.storage.persist()`
  - [ ] Storage quota monitor and warnings when device disk is low
- [ ] `SignedEventLog.ts`:
  - [ ] Local Ed25519 cryptographic keypair management (`crypto.subtle`)
  - [ ] Append-only action delta ledger with SHA-256 hash chaining
  - [ ] Tamper-evident transaction signing (`id`, `vectorClock`, `payload`)
- [ ] `VectorClockManager.ts`:
  - [ ] Monotonic logical clock and multi-node vector clock updates
  - [ ] Causality tracking to distinguish concurrent vs. sequential edits

---

## 2. Conflict-Free Delayed Synchronization Engine (`apps/web/src/core/sync/`)
- [ ] `CRDTSyncEngine.ts`:
  - [ ] State-based and operation-based CRDT reconciliation rules
  - [ ] PN-Counter resolver for community resource pools and resilience scores
  - [ ] Last-Write-Wins (LWW) resolver with Lamport tie-breaker for district parcels
  - [ ] OR-Set resolver for IRL civic deeds and unlocked badges
- [ ] `SyncQueueService.ts`:
  - [ ] Background delta queue with unacknowledged action tracking
  - [ ] Online/offline network listener (`navigator.onLine`, WebSocket, WebRTC)
  - [ ] Exponential backoff retry loop for intermittent connections
- [ ] `DistrictGatewayClient.ts`:
  - [ ] Lightweight sync protocol exchanging vector clocks with backend gateway
  - [ ] Compressed CBOR delta transmission and batch verification

---

## 3. Zero-Network PWA & Sneakernet Air-Gap Sync
- [ ] `ServiceWorkerRegistry.ts`:
  - [ ] Precache all static assets, game scripts, audio synths, and tilesets
  - [ ] Cache-first runtime strategy with instant offline boot (< 400ms)
- [ ] `PaperMeshQR.ts`:
  - [ ] Animated QR code sequence generator for high-density air-gapped data export
  - [ ] Camera QR scanner to import relief caravans, signed deeds, or credit transfers offline
- [ ] Micro-SD / USB Snapshot Export:
  - [ ] Export and import encrypted district backups via standard JSON/CBOR file drop

---

## 4. Standalone Native Distribution Packages
- [ ] `tauri.conf.json` — Lightweight desktop native wrapper with embedded SQLite WAL storage
- [ ] `capacitor.config.ts` — Android offline packaging configuration for direct APK and F-Droid release
- [ ] Automated offline release build recipe in `Makefile` (`make build-offline-pwa`, `make build-desktop-tauri`)

---

## 5. Quality Assurance & Verification Tests
- [ ] **Test 18.1 (Zero-Network Boot):** Launch game in browser with DevTools network set to "Offline"; verify complete game plays without errors.
- [ ] **Test 18.2 (Storage Permanence):** Verify `navigator.storage.persist()` is requested and IndexedDB survives browser memory pressure tests.
- [ ] **Test 18.3 (Cryptographic Delta Signing):** Generate 5 local actions; verify all 5 are signed with valid Ed25519 signatures and hash-chained.
- [ ] **Test 18.4 (CRDT Merge Without Loss):** Simulate two devices playing disconnected for 10 game days and contributing to the solidarity pool; verify both contributions merge additively with zero data loss when reconnected.
