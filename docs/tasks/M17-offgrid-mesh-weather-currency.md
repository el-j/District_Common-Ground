# M17 — Off-Grid Mesh Networks, Real-Time Geo-Weather & Decentralized Mutual Credit

Story: [`docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md)  
Planning: [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md)  
Status: `[x] PoC Complete` — see scoping notes below for four deliberate PoC-level simplifications (plugin trust gate, WorldScene wiring, hardware verification, key storage).

> **Scoping notes (read before extending):**
> 1. **Plugin trust gate.** The M14 `PluginRegistry`/`PluginSandbox`/`SandboxedPluginRuntime` quarantine flow is built specifically around `MinigameManifest` + an iframe-sandboxed `MinigameInstance` (`mount(root, context)`, host calls limited to `playSFX`/`grantRewards`/`notify`/`closeMinigame`). That sandbox structurally cannot grant Web Serial, Web Bluetooth, WebRTC, or `crypto.subtle` access to a plugin (browsers refuse hardware/crypto permissions inside a sandboxed iframe without a top-level user gesture). Building a real permission-scoped capability-grant trust gate for hardware/crypto plugins is a distinct, larger problem than "quarantine + hash + iframe" and is out of scope here. **Update:** these three plugins are no longer direct static imports — they were relocated into standalone workspace packages (`packages/plugin-geo-weather/`, `packages/plugin-mesh-comms/`, `packages/plugin-mutual-credit/`, same shape as `packages/minigame-courier-rush`) and now self-register with the new trusted-tier `apps/web/src/core/kernel/Kernel.ts` instead of being imported by `TopHUD.ts` (see `docs/tasks/M14-microkernel-minigames.md`'s Kernel addendum). They remain in the *trusted, first-party* tier — not the iframe-sandboxed `PluginRegistry` path — for exactly the reason above: that sandbox cannot grant them the hardware/crypto access they need.
> 2. **WorldScene wiring.** None of `SunCalcEngine`'s real solar state, `OpenMeteoAdapter`'s live weather, or `WeatherModifierBridge`'s gameplay modifiers are wired into the live `WorldScene`'s accelerated 120-second day/night tint (`updateDayNight()`) or `EconomyMath.ts`'s resilience calc. That tint is an arbitrary in-game cycle, unrelated to real clock time — splicing 1:1 real-world time into it is a bigger, riskier change than this PoC's scope (same reasoning M16 used to keep Geo-Mode's tilemap in a standalone preview rather than the live world). The engine is real and fully tested; wiring it into gameplay is follow-up work.
> 3. **Hardware verification.** `WebSerialDriver.ts` and `WebBluetoothDriver.ts` are written against the real Web Serial / Web Bluetooth API shapes and are feature-detected everywhere, but this environment has no physical Meshtastic/LoRa radio to test against — their tests mock `navigator.serial`/`navigator.bluetooth`, not real hardware. `WebRtcP2pDriver.ts` similarly has no live two-browser signaling harness; its offer/answer exchange is unit-tested against an injected fake `RTCPeerConnection`. All three correctly throw a clear, caught error when a real handshake fails, surfaced as plain status text in `MeshChatModal.ts`.
> 4. **QR / camera scanning.** Per the planning doc's own precedent (M16's `PeerVerification.ts` 4-word code instead of a QR scan), `QrTradeScanner.ts` and `WebRtcP2pDriver.ts`'s signaling exchange use a pasteable base64 text blob — the exact payload a real QR encoder/camera scanner would render/read — rather than adding a camera-permission + QR-library dependency for a PoC. Swappable later without touching `CreditTransferModal.ts`/`MeshChatModal.ts`'s calling code.
> 5. **Private key storage.** `CryptoLedger.ts` stores the player's Ed25519 keypair as an unencrypted JWK in IndexedDB (via `idb-keyval`), not the planning doc's "encrypted... storage." This matches the trust boundary the app already accepts for the JWT in `localStorage`; real passphrase-derived key wrapping is a follow-up, called out explicitly rather than silently claimed as done.

---

## 1. Real-Time Geo-Weather Engine Plugin (`packages/plugin-geo-weather/src/`)
- [x] `plugin.ts` exports the manifest requesting `geo:read` permission (also declares `weather:sync`) — superseded the old standalone `manifest.json` file when this plugin was relocated into its own package (see scoping note 1's update)
- [x] `SunCalcEngine.ts`:
  - [x] Exact astronomical solar angle, dawn, noon, golden hour, twilight, nightfall (`getSolarPosition`/`getSolarDayTimes`/`classifySolarPhase`/`getSolarState`, standard low-precision solar-position formulas)
  - [x] Ambient lighting controller: smooth canvas sky tint and automatic streetlamp activation — represented as `SolarState.isNight`/`phaseName`, the exact signal a live controller would consume; not wired into `WorldScene`'s render loop (see scoping note 2)
  - [x] Moon phase calculator for night brightness (`getMoonState`)
- [x] `OpenMeteoAdapter.ts`:
  - [x] Real-time temperature, precipitation (mm), wind speed, cloud cover fetcher (`fetchWeather`, zero-API-key Open-Meteo `current=` query)
  - [x] 1-hour cache (`idb-keyval`, same convention as `GeoCache.ts`) and offline sinusoidal seasonal fallback (`offlineSeasonalWeather`, latitude/hemisphere-aware)
- [x] `WeatherModifierBridge.ts`:
  - [x] Rain triggers Phaser puddle shaders & auto-waters community garden beds — `gameModifiers.gardenWaterBonus`; the puddle *shader* itself is not implemented (no Phaser scene wiring per scoping note 2), the boolean a shader would key off of is
  - [x] Freezing weather scales heating energy upkeep; heatwaves scale cooling demand — `energyHeatingUpkeep` + `isHeatwave()`
  - [x] Courier bike drift physics modifier on wet roads — `courierFrictionMult` (0.8 on rain/snow/slick roads)
- [x] `index.ts` — added beyond the literal spec: `getGeoWeatherState()` facade combining all three modules for a future UI/WorldScene tick.

---

## 2. Off-Grid LoRa & Mesh Networking Plugin (`packages/plugin-mesh-comms/src/`)
- [x] `plugin.ts` exports the manifest declaring permissions for `serial:connect`, `bluetooth:connect`
- [x] Hardware Web Serial & Web Bluetooth Driver:
  - [x] `WebSerialDriver.ts` — connect to a Meshtastic-class LoRa node over USB at baud 115200 (see scoping note 3 re: no physical hardware to verify against)
  - [x] `WebBluetoothDriver.ts` — connect to a Meshtastic BLE peripheral, using Meshtastic's public service/characteristic UUIDs (see scoping note 3)
  - [x] Device detection and auto-reconnect logic — feature-detected via `isWebSerialSupported()`/`isWebBluetoothSupported()`; automatic *background* reconnect-on-drop is not implemented (out of scope for a PoC with no hardware to test the reconnect path against) — `connect()`/`disconnect()` are both explicit and idempotent, callable again by the UI
- [x] Radio Packet Protocol:
  - [x] Compact binary encoder (`PacketCodec.ts`) — hand-rolled TLV-style binary layout rather than a CBOR/protobuf dependency, since all 4 packet shapes are small and fixed; enforces the real 237-byte LoRa payload ceiling
  - [x] Packet types: `COMMONS_ALERT`, `CARAVAN_DISPATCH`, `PEER_HANDSHAKE`, `MESH_CHAT`
- [x] Serverless P2P Comms:
  - [x] `WebRtcP2pDriver.ts` — direct phone-to-phone data channel; handshake relayed via a pasteable text blob rather than a QR scan (see scoping note 4)
  - [x] `MeshChatModal.ts` — in-game walkie-talkie & emergency broadcast terminal, transport picker (Serial/Bluetooth/WebRTC) + composer + received-packet log; its HUD button is registered by `plugin.ts` through the kernel, not imported by `TopHUD.ts` directly

---

## 3. Decentralized Mutual Credit & Local Ledger Plugin (`packages/plugin-mutual-credit/src/`)
- [x] `plugin.ts` exports the manifest declaring permissions for `crypto:sign`, `wallet:ledger`
- [x] Cryptographic Keypair & Storage:
  - [x] Ed25519 keypair generation using `crypto.subtle` (`generateKeypair`, verified working end-to-end on this project's Node/browser WebCrypto)
  - [x] Private key storage in browser `IndexedDB` (`loadOrCreateKeypair`, `idb-keyval`) — unencrypted JWK, not the planning doc's "encrypted" storage (see scoping note 5)
- [x] Mutual Credit Engine (`CryptoLedger.ts`):
  - [x] Double-entry zero-sum mutual credit clearing (trust balances) — `computeBalances`/`MutualCreditLedger.balances`
  - [x] Hash-chained transaction receipts signed with Ed25519 — `createTransaction`/`verifyTransactionSignature`/`verifyChainLinkage`
  - [x] Transaction gossip over LoRa mesh and WebRTC P2P — receipts are encodable via `QrTradeScanner.ts`'s `encodeReceiptText` and any `MeshPacket`/`WebRtcP2pDriver` transport carries arbitrary bytes, but no dedicated auto-gossip loop is wired up (out of scope beyond the literal spec's own "PoC" framing; the primitives it would use all exist and are tested)
- [x] Community Trade UI:
  - [x] `CreditTransferModal.ts` (fulfills the planning doc's `TradeModal.ts` / TASK-STATUS's `CreditTransferModal.ts` naming — see naming-drift note) — negotiate goods/services (pantry crops, tool loans, repair hours)
  - [x] `QrTradeScanner.ts` — offline scan-to-pay and transaction receipt handshake via pasteable text (see scoping note 4)

---

## 4. Disaster Resilience & Offline Verification Tests
- [x] **Test 17.1 (Solar Day/Night Sync):** `packages/plugin-geo-weather/src/WeatherModifierBridge.test.ts` — real `getSolarState()` at 22:00, 52.5°N in winter reports `isNight: true`, and the resulting `solarEfficiencyMult` is 0 (streetlamp activation is represented by `isNight`, not a live sprite toggle — see scoping note 2).
- [x] **Test 17.2 (Live Weather Modifiers):** `packages/plugin-geo-weather/src/WeatherModifierBridge.test.ts` — a -5°C / 4.2mm-rain reading increases `energyHeatingUpkeep` above 1 and sets `gardenWaterBonus: true`.
- [x] **Test 17.3 (LoRa Serial Codec):** `packages/plugin-mesh-comms/src/PacketCodec.test.ts` — a 20 kW caravan dispatch packet encodes under 200 bytes (well inside the 237-byte LoRa ceiling) and decodes back to an identical object.
- [x] **Test 17.4 (Zero-Server P2P Transaction):** `packages/plugin-mutual-credit/src/CryptoLedger.test.ts` — a 15 ST transaction is signed offline with a locally generated Ed25519 keypair, its signature validates, and `fetch` is never called during signing or verification.
- [x] Added beyond the literal spec: `SunCalcEngine.test.ts` (14 tests — solar-noon altitude peak, ~12h equatorial equinox day length, chronological event ordering, phase classification, moon illumination bounds), `OpenMeteoAdapter.test.ts` (5 tests — live parse, 1h cache reuse, network/HTTP-error fallback), `WebSerialDriver.test.ts` / `WebBluetoothDriver.test.ts` / `WebRtcP2pDriver.test.ts` (19 tests total against mocked hardware/RTC surfaces), `QrTradeScanner.test.ts` (4 tests), plus hash-chain tamper-detection and cross-keypair rejection tests in `CryptoLedger.test.ts`.
