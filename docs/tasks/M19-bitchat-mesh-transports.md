# M19 — BitChat.free Integration & Pluggable Mesh Transport Architecture

Story: [`docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-19-bitchat-free-and-pluggable-mesh-transports.md)
Planning: [`docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md)
Status: `[x] PoC Complete`

> Path/package deviation note: this doc originally specified `apps/web/src/plugins/bitchat/`. `docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md` (written after this doc) makes every transport/minigame a standalone `packages/*` package — exactly the convention `plugin-geo-weather`/`plugin-mesh-comms`/`plugin-mutual-credit` already follow. Rather than build at the doc's literal path and relocate it for M20 later, the plugin was built directly at `packages/plugin-bitchat/` (M20's mockup names it `transport-bitchat`; `plugin-bitchat` was kept for consistency with its three siblings — a naming discrepancy worth resolving in M20, not a functional gap).

---

## 1. Unified Mesh Transport Interfaces (`packages/shared-types/src/mesh.ts`)
- [x] `MeshPacket` — id, senderId, recipientId, channel, ttl, timestamp, payload, signature
- [x] `PeerDescriptor` — peerId, alias, transportId, signalStrength, lastSeen
- [x] `MeshTransportPlugin` — `init`, `destroy`, `broadcast`, `sendDirect`, `getActivePeers`
- [x] `TransportHostAPI` — `onPacketReceived`, `onPeerDiscovered`, `onPeerLost`, `log`
- [x] `KernelMeshChatBindings` (`packages/shared-types/src/kernel.ts`) — the plugin-facing `ctx.mesh` slot (`sendChatMessage`, `onChatMessage`, `getActivePeerCount`, `getTransportBadges`), added to `KernelContext` alongside `theme`/`audio`/`input` so `packages/plugin-bitchat` never imports `apps/web` internals

---

## 2. Core Kernel Transport Bridge (`apps/web/src/core/mesh/`)
- [x] `TransportRegistry.ts`:
  - [x] Dynamic registration/lifecycle (`register`/`unregister`, calls `init(host)`/`destroy()`)
  - [x] Multiplexing: `broadcast()` fans out to every active transport, one transport's rejection doesn't block the others; `sendDirect()` routes to whichever transport currently sees that peer
- [x] `MeshNetworkService.ts` (implements `TransportHostAPI`):
  - [x] In-memory LRU packet-id dedupe cache (`onPacketReceived`, bounded, evicts oldest)
  - [x] TTL hop decrement and automatic relay via an injected `setRelay()` callback (the composition root points it at `TransportRegistry.broadcast`) — see Test 19.3
  - [x] Cryptographic packet signature verification via WebCrypto Ed25519 (`MeshCrypto.ts`, same pattern as M18's `SignedEventLog.ts`/M17's `CryptoLedger.ts`) — a sender with no registered public key is logged as unverified rather than rejected outright (permissive-by-default; peer public-key distribution/registration is not wired automatically anywhere yet — `registerPeerPublicKey()` exists and is tested, but nothing currently calls it from the bitchat plugin's discovery flow, since that would require a small trust-on-first-use handshake protocol not built here)
  - [x] Channel pub/sub dispatcher (`subscribe(channel, handler)`) for in-game subsystems
- [x] `meshRuntime.ts` — composition-root glue (mirrors `core/offline/offlineRuntime.ts`'s lazy-singleton convention): owns the one `MeshNetworkService`/`TransportRegistry` pair, registers the bitchat transport, and implements the four `KernelMeshChatBindings` methods `main.ts` wires into `Kernel`'s `KernelHostBindings`

---

## 3. Standalone `bitchat.free` Plugin (`packages/plugin-bitchat/`)
- [x] `index.ts` — exports everything, including `createTransportPlugin(): MeshTransportPlugin`
- [x] `SubnetBeacon.ts`:
  - [x] Local subnet broadcast discovery without internet — implemented via the standard `BroadcastChannel` API, which is genuinely zero-server/zero-internet same-origin cross-tab/window discovery, and is exactly what Test 19.2 describes ("two local browser tabs on the same device")
  - Scoping note: true cross-*device* LAN discovery (mDNS/UDP broadcast) has no browser-JS API — there is no raw socket access in a sandboxed web page. That would require a native shell (M18's Tauri packaging) with OS socket access, which is out of scope here.
- [x] `BleBeacon.ts`:
  - [x] Web Bluetooth LE close-range discovery (`requestLEScan`, ~30m), presence + RSSI only — same hardware-availability boundary M17's `WebBluetoothDriver.ts` already drew: written against the real API shape, feature-detected, unverified against physical hardware. Real GATT-based packet relay over BLE is not implemented.
- [x] `BitChatProtocol.ts`:
  - [x] `BitChatConnectionPool` — multi-peer WebRTC `RTCDataChannel` connection pool manager (generalizes M17's single-peer `WebRtcP2pDriver.ts`)
  - [x] Ephemeral X25519 key exchange (WebCrypto `deriveBits`, confirmed working in this repo's Node 24 test environment) deriving an AES-GCM key that encrypts every data-channel message end-to-end
- [x] `ProofOfWork.ts`:
  - [x] Client-side Hashcash solver/verifier (12 leading zero bits default), gating every bitchat connection handshake (`BitChatConnectionPool.acceptOfferEnvelope`/`acceptAnswerEnvelope` reject an invalid solution outright) — see Test 19.4
- [x] `plugin.ts` — `BitChatTransportPlugin` (the `MeshTransportPlugin` implementation: wires `SubnetBeacon` discovery + a `BroadcastChannel`-relayed signaling handshake + `BitChatConnectionPool` together) and the Kernel HUD registration (`manifest`/`register`/`bitchatPlugin`)
  - Scoping note: automatic handshake signaling only works for same-device peers discovered via `SubnetBeacon`'s `BroadcastChannel`. Cross-device signaling (two different physical devices) has no automatic rendezvous here — M17's `WebRtcP2pDriver.ts` manual paste-relay boundary applies equally to bitchat; a manual-paste UI for it was not built.

---

## 4. UI Integrations & Walkie-Talkie Terminal (`packages/plugin-bitchat/src/OfflineChatModal.ts`)
- [x] Tactile retro walkie-talkie modal with a 4-channel rotary knob: #broadsheet, #mutual-aid, #civic-defense, #whisper
- [x] Click/chime sound effects on channel switch and message receive — reuses the two SFX Kernel already exposes (`playUIClick`, `playSolidarityChime`) rather than growing the audio contract for one modal; a dedicated squelch synth voice is a documented follow-up, not a silently-faked effect
- [x] HUD status: peer count + per-transport badges (`ctx.mesh.getActivePeerCount()`/`getTransportBadges()`), rendered as static text on open rather than a live-updating HUD chip — `KernelHudButtonDescriptor` has no update-in-place hook today, so a persistently-live badge next to the HUD icon (as opposed to inside the opened modal) is a follow-up, not built here

---

## 5. Quality Assurance & Verification Tests
- [x] **Test 19.1 (Zero Core Touch):** `plugin.test.ts` — the transport initializes and tears down with zero uncaught errors even with no peers ever discovered; the plugin is wired into `main.ts`/`Kernel` the same non-invasive way every other Kernel plugin is (no core game-loop file imports it directly)
- [x] **Test 19.2 (Subnet Loopback Discovery):** `SubnetBeacon.test.ts` — two same-device beacon instances over a shared `BroadcastChannel`-shaped bus discover each other with zero external server; `meshRuntime.test.ts` additionally proves the real, fully-wired bitchat transport discovers a peer announced on the real `BroadcastChannel` global
- [x] **Test 19.3 (Multi-Hop Relay):** `MeshNetworkService.test.ts` — a TTL=2 packet is relayed once at TTL=1 and the duplicate re-arrival is dropped by the dedupe cache, not re-relayed endlessly
- [x] **Test 19.4 (PoW Anti-Spam Gate):** `ProofOfWork.test.ts` + `BitChatProtocol.test.ts` — a message/handshake failing the Hashcash proof-of-work is rejected by the receiver
