# EPIC-19 — BitChat.free Integration & Pluggable Mesh Transport Architecture

**Agent roles:** engineering-backend-architect, engineering-frontend-developer, game-designer, security-auditor, devops-sre  
**Planning doc:** [`docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md)  
**Parent vision:** [`docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md) · [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md) · [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)

---

## Vision

Integrate **BitChat.free** as an out-of-the-box, zero-hardware, zero-internet peer-to-peer communication plugin into *District: Common Ground*. Standardize a clean `MeshTransportPlugin` interface within our Microkernel so that any off-grid transport (BitChat.free, LoRa Meshtastic, BLE, Local WiFi mDNS, PaperMesh QR) can be developed, tested, and distributed as a standalone plugin without modifying a single line of the core game engine.

---

## User Stories & Acceptance Criteria

### User Story 1: Zero-Internet Neighborhood Chat via BitChat.free
> **As a community organizer in an area without cell reception or during an internet blackout**, I want to open the game and chat with neighbors connected to the same local WiFi router or hotspot without needing external servers, so that we can coordinate mutual-aid efforts in real time.

* **Acceptance Criteria:**
  * Discovers peers automatically on local subnet via broadcast/mDNS without internet access.
  * Establishes direct WebRTC `RTCDataChannel` connections locally between phones and laptops.
  * Sends text messages, relief requests, and community announcements with sub-second latency.
  * End-to-end encrypted using ephemeral X25519 key agreements.

### User Story 2: Pluggable Transport Microkernel Contract
> **As an open-source contributor or community radio hacker**, I want to build or swap in new communication transports (like LoRa, BitChat, or Ham Radio) by creating a plugin folder, without editing the game's core simulation or state engine.

* **Acceptance Criteria:**
  * Core microkernel exposes `MeshTransportPlugin` and `TransportHostAPI` interfaces in `packages/shared-types`.
  * Game simulation logic interacts only with the unified `MeshNetworkService` packet bus.
  * A transport plugin can be added or removed with zero compile-time or runtime dependencies on the Phaser 3 game loop.

### User Story 3: Multi-Hop Packet Relaying (Offline Gossip)
> **As a player whose friend is just out of direct radio range**, I want intermediate neighbors to seamlessly relay mutual-aid messages and caravan dispatches, so that the entire neighborhood acts as a resilient mesh.

* **Acceptance Criteria:**
  * Packet TTL (Time-To-Live) decrements on each hop; packets with TTL = 0 are dropped to prevent broadcast storms.
  * De-duplication table by packet hash (`id`) prevents rebroadcasting already-seen packets.
  * Multi-hop relay functions completely in background while game is open.

---

## Technical Deliverables (Standalone Plugin Architecture)

### `packages/shared-types/src/mesh.ts`
* `MeshPacket`, `PeerDescriptor`, `MeshTransportPlugin`, `TransportHostAPI` interfaces.

### `apps/web/src/core/mesh/`
* `MeshNetworkService.ts` — Unified packet routing, deduplication, signature verification, and multi-hop gossip host.
* `TransportRegistry.ts` — Dynamic registry managing active transport plugins.

### `apps/web/src/plugins/bitchat/` (100% Standalone Plugin)
* `manifest.json` — Plugin declaration for BitChat.free.
* `index.ts` — Exporting `createTransportPlugin(): MeshTransportPlugin`.
* `BitChatProtocol.ts` — Discovery, signaling, and local WebRTC DataChannel manager.
* `SubnetBeacon.ts` — Local LAN mDNS / UDP broadcast discovery engine.
* `BleBeacon.ts` — Web Bluetooth Low Energy discovery for close-range handshakes.
* `ProofOfWork.ts` — Client-side Hashcash anti-spam proof verification.
