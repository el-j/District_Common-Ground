# M19 — BitChat.free Integration & Pluggable Mesh Transport Architecture

Story: [`docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md)  
Planning: [`docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md)  
Status: `[ ] Planned (Decoupled Transport Plugin)`

---

## 1. Unified Mesh Transport Interfaces (`packages/shared-types/src/mesh.ts`)
- [ ] `MeshPacket` — Canonical packet structure (id, senderId, recipientId, channel, ttl, timestamp, payload, signature)
- [ ] `PeerDescriptor` — Peer tracking contract (peerId, alias, transportId, signalStrength, lastSeen)
- [ ] `MeshTransportPlugin` — Interface for pluggable communication transports (`init`, `destroy`, `broadcast`, `sendDirect`, `getActivePeers`)
- [ ] `TransportHostAPI` — Kernel callback bridge (`onPacketReceived`, `onPeerDiscovered`, `onPeerLost`, `log`)

---

## 2. Core Kernel Transport Bridge (`apps/web/src/core/mesh/`)
- [ ] `TransportRegistry.ts`:
  - [ ] Dynamic registration and lifecycle initialization of transport plugins
  - [ ] Multiplexing: dispatch outgoing broadcast packets across all active transports (LoRa + BitChat + BLE)
- [ ] `MeshNetworkService.ts`:
  - [ ] In-memory LRU packet deduplication cache (prevents broadcast loops)
  - [ ] TTL hop decrement and automatic multi-hop gossip relaying
  - [ ] Cryptographic packet signature verification via WebCrypto Ed25519
  - [ ] Channel pub/sub dispatcher for in-game subsystems (`caravan`, `alert`, `chat`, `trade`)

---

## 3. Standalone `bitchat.free` Plugin (`apps/web/src/plugins/bitchat/`)
- [ ] `manifest.json` — Plugin declaration for BitChat.free
- [ ] `index.ts` — Factory exporting `createTransportPlugin(): MeshTransportPlugin`
- [ ] `SubnetBeacon.ts`:
  - [ ] Local subnet broadcast discovery without internet
  - [ ] Local IP candidate exchange for zero-server WebRTC setup
- [ ] `BleBeacon.ts`:
  - [ ] Web Bluetooth Low Energy discovery for close-range mobile handshakes (up to 30m)
- [ ] `BitChatProtocol.ts`:
  - [ ] WebRTC `RTCDataChannel` connection pool manager
  - [ ] Ephemeral X25519 key exchange for end-to-end encrypted direct channels
- [ ] `ProofOfWork.ts`:
  - [ ] Client-side Hashcash solver (12 leading zero bits) to mitigate spam

---

## 4. UI Integrations & Walkie-Talkie Terminal (`apps/web/src/ui/`)
- [ ] `OfflineChatModal.ts`:
  - [ ] Tactile retro handheld walkie-talkie modal with rotary channel knob
  - [ ] 4-channel selector: #broadsheet, #mutual-aid, #civic-defense, #whisper
  - [ ] Audio click and squelch sound effects on channel switch and message receive
- [ ] HUD Mesh Status Indicator:
  - [ ] Displays active mesh peers count and active transport badges (e.g. `[BitChat: 4 peers] [LoRa: 12 peers]`)

---

## 5. Quality Assurance & Verification Tests
- [ ] **Test 19.1 (Zero Core Touch):** Enable and disable `bitchat.free` plugin; verify core game loop and district builder function with zero errors.
- [ ] **Test 19.2 (Subnet Loopback Discovery):** Simulate two local browser tabs on same device; verify tabs discover each other over local channel without external server.
- [ ] **Test 19.3 (Multi-Hop Relay):** Send a message with TTL = 2 through a mock intermediate relay node; verify packet arrives at destination with TTL = 1 and is not re-broadcast endlessly.
- [ ] **Test 19.4 (PoW Anti-Spam Gate):** Verify messages failing the Hashcash proof-of-work are rejected by the receiver.
