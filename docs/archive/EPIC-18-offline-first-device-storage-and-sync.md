# EPIC-18 — Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync

**Agent roles:** engineering-backend-architect, engineering-frontend-developer, game-designer, security-auditor, devops-sre  
**Planning doc:** [`docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md)  
**Parent vision:** [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md) · [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)

---

## Vision

Transform *District: Common Ground* into a **resilient, 100% offline-first application** that stores all state, assets, and history directly on the user's device. When disconnected, the player has full access to the game, their district, minigames, and local mutual credit. When a connection to an off-grid mesh, local peer, or the internet/grid becomes available, the game synchronizes state diffs intelligently using conflict-free CRDTs and signed event logs with zero data loss.

---

## User Stories & Acceptance Criteria

### User Story 1: 100% Autonomous On-Device Execution
> **As a player without internet or in an off-grid area**, I want to launch, play, build, and save my entire game on my phone or laptop without any network connection, so that my game never depends on third-party servers.

* **Acceptance Criteria:**
  * Application shell, game engine, assets, and sound synths are precached via Service Worker CacheStorage.
  * Launches in under 500ms in airplane mode with zero external network requests.
  * Game progress, district parcels, and stats persist automatically into IndexedDB / OPFS with permanent storage protection (`navigator.storage.persist()`).
  * Procedural offline scenario generator ensures dynamic crises even during months of disconnection.

### User Story 2: Cryptographically Signed Append-Only Event Log
> **As a player participating in local trades and mutual aid**, I want every significant action on my device to be signed with an on-device private key, so that when I sync with other players or the grid, my contributions can be verified without a central authority.

* **Acceptance Criteria:**
  * Local Ed25519 keypair generated on first launch and stored securely in IndexedDB via `SubtleCrypto`.
  * Every parcel advancement, credit transfer, and IRL civic deed produces a `SignedActionDelta` with a Lamport timestamp and vector clock.
  * Tamper-evident hash chain prevents retroactive state manipulation.

### User Story 3: Conflict-Free Delayed Reconciliation (CRDT Sync)
> **As a player returning to an internet connection or meeting another player**, I want my offline progress to merge seamlessly with the network without overwriting my buildings or losing my earned rewards.

* **Acceptance Criteria:**
  * Two-way reconciliation protocol exchanges vector clocks to discover missing action deltas.
  * Additive counters (resilience pool, resource contributions) merge via PN-Counters with zero conflicts.
  * Parcel states resolve via Last-Write-Wins (LWW) with Lamport tie-breaking.
  * Sync queue automatically retries with exponential backoff on intermittent connections.

### User Story 4: Standalone Zero-Store Packaging
> **As a community member using low-end hardware or avoiding corporate app stores**, I want to install and run the game as a standalone app (PWA, desktop executable, or direct Android APK), so that anyone can run it anywhere.

* **Acceptance Criteria:**
  * Installable PWA with full offline manifest and home-screen launcher.
  * Tauri v2 configuration for lightweight desktop builds (< 20 MB) with embedded SQLite WAL storage.
  * Capacitor Android build recipe producing a self-contained offline APK for sideloading or F-Droid.

---

## Technical Deliverables

### `apps/web/src/core/offline/`
* `DeviceStorageEngine.ts` — IndexedDB & OPFS persistent storage manager with permanent storage locking.
* `SignedEventLog.ts` — Append-only event log with on-device Ed25519 cryptographic signing.
* `VectorClockManager.ts` — Logical timestamp and vector clock tracker.
* `CRDTSyncEngine.ts` — State-based and operation-based conflict resolution and reconciliation.
* `SyncQueueService.ts` — Background sync worker with exponential backoff and network status listener.

### `apps/web/src/core/pwa/`
* `ServiceWorkerRegistry.ts` — Cache-first asset lifecycle and offline cache pre-warming.
* `PaperMeshQR.ts` — High-density animated QR code sequence encoder/decoder for zero-wire sneakernet sync.
