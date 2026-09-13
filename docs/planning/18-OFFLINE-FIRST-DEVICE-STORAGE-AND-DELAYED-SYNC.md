# Specification 18: Offline-First Device Storage, Autonomous Local Runtime & Delayed Mesh/Grid Sync

## 1. Executive Summary & Creative Vision

*District: Common Ground* is fundamentally a game about resilience, mutual aid, and antifragility. A resilience simulator that collapses when a cell tower drops or an AWS region goes down is a contradiction in terms. 

To fulfill the vision of an autonomous, un-censorable, and universally accessible community tool, the game must operate under a strict **Local-First / Zero-Cloud-Dependency Architecture**:
1. **100% On-Device Self-Containment**: The entire game engine, assets, audio synthesizers, minigames, maps, AI fallback heuristics, and database run directly on the user's phone, laptop, or low-cost hardware with zero network connectivity required.
2. **Offline-First Cryptographic Event Sourcing**: Every player decision, parcel upgrade, trade, and mutual-aid deed is recorded locally into an append-only event log signed by an on-device ed25519 keypair.
3. **Opportunistic Multi-Hop Sync (The "Delay-Tolerant Commons")**: When the device encounters another player locally (via Bluetooth LE, LoRa mesh, or local WiFi hotspot) or connects to the wider internet/grid, an intelligent reconciliation engine synchronizes state diffs without merge conflicts or data loss.

```
┌─────────────────────────────────────────────────────────────────────────┐
│              LOCAL-FIRST RUNTIME (100% DISCONNECTED)                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Browser / PWA / Tauri Native Shell                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Phaser 3 Game Engine + Web Audio Procedural Synth                 │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
│                                     │ Local Events                      │
│                                     ▼                                   │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Local Event Store (Append-Only Log + CRDT State Machine)         │  │
│  │  • IndexedDB (idb-keyval + OPFS SQLite storage)                   │  │
│  │  • Ed25519 Signed Action Deltas with Vector Clocks                 │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │ OPPORTUNISTIC DELAY-TOLERANT SYNCHRONIZATION      │
            ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ TIER 1: OFF-GRID PEER MESH    │               │ TIER 2: GRID / INTERNET       │
│ • Local WiFi Hotspot / mDNS   │               │ • Periodic HTTPS Delta Sync   │
│ • Bluetooth LE Handshakes     │               │ • Cloudflare / Self-hosted    │
│ • LoRa Meshtastic Radio Packets│               │   District Gateway Node       │
│ • Offline Sneakernet QR Codes │               │ • Global Solidarity Snapshot  │
└───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. On-Device Storage Architecture

### 2.1 Storage Tiers & Technology Selection

| Target Platform | Primary Storage Engine | Secondary Cache | Total Footprint Target | Persistence Guarantee |
|---|---|---|---|---|
| **Web Browser / Mobile PWA** | IndexedDB (`idb-keyval` / custom Dexie-like schema) | Origin Private File System (OPFS) | < 35 MB total (Zero remote fetch) | Persistent Storage API (`navigator.storage.persist()`) |
| **Native Desktop (Tauri / Electron)** | Embedded SQLite (`district_state.db`) with WAL mode | OS Local AppData Directory | < 25 MB executable bundle | 100% Durable on-disk ACID guarantees |
| **Native Mobile (Capacitor / Android APK)** | SQLite via Capacitor SQLite plugin | Device Internal Flash | < 30 MB APK package | Immune to browser cache evictions |

### 2.2 Storage Schema (Append-Only Log + Snapshot CRDT)

Rather than storing a mutable single-row game state that risks silent overwrites or sync collisions, the local device maintains a **Two-Tier Ledger**:

```
                               ┌───────────────────────────┐
                               │     Incoming Action       │
                               │ (e.g. Build Solar Plot 4) │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                               ┌───────────────────────────┐
                               │   Append to Local Log     │
                               │   (Signed with Local Key) │
                               └─────────────┬─────────────┘
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │           Local State Projection          │
                       │    (Fast In-Memory Zustand Store)         │
                       └─────────────────────┬─────────────────────┘
                                             │
                                             ▼
                       ┌───────────────────────────────────────────┐
                       │      Periodic Snapshot (Checkpoint)       │
                       │      IndexedDB / SQLite Checkpoint        │
                       └───────────────────────────────────────────┘
```

#### Schema Definitions

```typescript
export interface SignedActionDelta {
  id: string;                      // UUIDv7 (time-ordered)
  deviceId: string;                // Public Key Hash of player device
  sequence: number;                // Monotonic local counter (1, 2, 3...)
  timestamp: number;               // Unix epoch millisecond
  vectorClock: Record<string, number>; // { [nodeId]: sequence }
  actionType: 
    | 'PARCEL_STAGE_ADVANCE'
    | 'COMMONS_RESOURCE_CONTRIBUTION'
    | 'MINIGAME_SCORE_COMMITTED'
    | 'IRL_DEED_LOGGED'
    | 'PEER_MUTUAL_CREDIT_TRANSFER'
    | 'SHOP_ITEM_ACQUIRED';
  payload: Record<string, unknown>;
  signature: string;               // Ed25519 signature over (id + vectorClock + payload)
}

export interface LocalDeviceCheckpoint {
  checkpointId: string;
  lastSequence: number;
  snapshotTimestamp: number;
  stateSnapshot: {
    meta: { day: number; activeSkin: string; localTimeOffset: number };
    player: { cash: number; energy: number; trust: number; stress: number };
    commons: { resilience: number; parcels: DistrictParcelState[] };
    creditLedger: { balance: number; unspentTransfers: string[] };
    pendingSyncQueue: string[]; // List of action IDs not yet acknowledged by network
  };
}
```

---

## 3. The Offline-First Asset & Engine Strategy

### 3.1 Zero-Network Pre-Caching (Service Worker CacheStorage)
When loaded once or installed as a PWA, the Service Worker activates a strict **Cache-First / Offline-Immune policy**:
- **Core Assets**: All HTML, JavaScript chunks, CSS, and tileset PNGs are precached during the `install` lifecycle event.
- **Dynamic Assets**: Generated OpenStreetMap tiles and audio synthesizers generate purely from algorithmic code on-device.
- **Font & Icon Freedom**: Embedded base64 WOFF2 or system fonts only; zero Google Fonts or external CDN fetches.
- **Fail-Safe Startup**: If the network is 100% disconnected on initial launch, the Service Worker serves the application shell instantaneously from CacheStorage in under 350ms.

### 3.2 Persistent Storage Protection
Browsers under memory pressure routinely evict IndexedDB storage on unvisited sites. To prevent loss of community progress:
```typescript
async function requestPermanentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.info(`District Storage persistence granted: ${isPersisted}`);
    return isPersisted;
  }
  return false;
}
```
The game prompts the user with an in-game "Hearthstone" prompt: *"Anchor this District to this device so your community records can never be erased by browser cleanup."*

---

## 4. Conflict-Free Delayed Synchronization Engine

When a disconnected device finally connects to the internet or encounters a peer node, how does it reconcile changes made weeks apart without destroying progress?

### 4.1 CRDT Reconciliation Rules (State-Based & Operation-Based)

Different game systems require distinct conflict-resolution algorithms:

| System | Resolution Strategy | Conflict Rule | Why This Strategy? |
|---|---|---|---|
| **District Parcels** | **LWW-Element-Set (Last-Write-Wins with Lamport Tie-Breaker)** | If two devices modify Plot #3, the action with the higher logical timestamp wins. | Simple, predictable parcel ownership. |
| **Commons Resilience & Solidarity Pool** | **PN-Counter (Positive-Negative Counter)** | Each player's contributions are additive increments ($\Delta +5$). Total resilience is the sum of all player increments. | Impossible to collide: two players building at the same time simply double the total community strength. |
| **Mutual Credit Currency** | **Append-Only Double-Entry Hash-Chain** | Each credit transfer references the hash of the sender's previous transaction. | Prevents double-spending offline. Transfers are verified against the local chain before acceptance. |
| **IRL Civic Deeds & Badges** | **OR-Set (Observed-Remove Set)** | Once a deed is logged and signed, it cannot be undone by an older state. Additions always take precedence. | Preserves player effort and trust verification. |

### 4.2 The 4-Stage Delayed Synchronization Pipeline

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   STAGE 1    │      │   STAGE 2    │      │   STAGE 3    │      │   STAGE 4    │
│ Connectivity │ ───> │ Handshake &  │ ───> │ Delta Diff   │ ───> │ Checkpoint   │
│  Detection   │      │ Vector Clock │      │ Transmission │      │ Acknowledge  │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

1. **Stage 1 — Connectivity Detection**:
   - Listens to `navigator.onLine`, WebRTC ICE candidates, and LoRa serial heartbeats.
   - Probes a lightweight `/api/v1/ping` or local peer broadcast without blocking the UI.
2. **Stage 2 — Vector Clock Handshake**:
   - The device exchanges its current `VectorClock` (a dictionary of known device IDs and their latest sequence numbers) with the sync target (gateway server or peer).
   - Identifies the exact set of missing actions: $Actions_{missing} = Actions_{local} \setminus Actions_{remote}$.
3. **Stage 3 — Delta Diff Transmission**:
   - Missing signed action deltas are bundled into a compressed binary frame (CBOR or gzip JSON) and transmitted.
   - The recipient verifies each Ed25519 signature before applying the deltas to its local CRDT state machine.
4. **Stage 4 — Checkpoint Acknowledgement**:
   - The sync target returns an acknowledgement token containing the highest committed sequence number.
   - The local device marks these actions as `SYNCHRONIZED` and prunes the local pending sync queue, reclaiming storage space.

---

## 5. Offline Emergency Scenarios & Fallbacks

### 5.1 The "Long Winter" Disconnection (30+ Days Offline)
If a player is completely cut off from power grids or communications (e.g. disaster relief camp, remote commune):
- **Autonomous Timekeeping**: The game tracks time using the device's hardware RTC clock combined with SunCalc astronomical calculations.
- **Procedural Scenario Engine**: If news feeds cannot be retrieved, the engine triggers built-in seasonal crises (droughts, supply chain bottlenecks, municipal budget freezes) using deterministic seed math.
- **Sneakernet Physical Sync**: Players can export their signed state delta as a high-density animated QR code sequence ("PaperMesh") or micro-SD card dump. Another player scans it with their phone camera, importing the relief caravan or mutual credit transfer with zero electrical wiring between them.

---

## 6. Standalone Packaging Options

To make the game installable on any hardware without needing an app store:

1. **Progressive Web App (PWA)**:
   - Zero-install, works in Safari, Chrome, Firefox, and Chromium derivatives.
   - Offline install banner, app icon on home screen, runs fullscreen with no browser URL bar.
2. **Desktop Standalone (Tauri v2)**:
   - Lightweight (< 15 MB) executable for Linux, macOS, and Windows.
   - Embeds an internal SQLite database and direct USB/Serial access for LoRa radios.
3. **Android Standalone APK (Capacitor / F-Droid)**:
   - Packaged for distribution on F-Droid or direct APK download.
   - Background Bluetooth LE service for opportunistic mesh handshakes while the phone is in the player's pocket.
