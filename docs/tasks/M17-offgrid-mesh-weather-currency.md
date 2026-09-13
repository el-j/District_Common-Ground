# M17 — Off-Grid Mesh Networks, Real-Time Geo-Weather & Decentralized Mutual Credit

Story: [`docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-17-offgrid-mesh-weather-and-mutual-credit.md)  
Planning: [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md)  
Status: `[ ] Planned (Off-Grid PoC)`

---

## 1. Real-Time Geo-Weather Engine Plugin (`apps/web/src/plugins/geo-weather/`)
- [ ] `manifest.json` — plugin configuration requesting `geo:read` permission
- [ ] `SunCalcEngine.ts`:
  - [ ] Exact astronomical solar angle, dawn, noon, golden hour, twilight, nightfall
  - [ ] Ambient lighting controller: smooth canvas sky tint and automatic streetlamp activation
  - [ ] Moon phase calculator for night brightness
- [ ] `OpenMeteoAdapter.ts`:
  - [ ] Real-time temperature, precipitation (mm), wind speed, cloud cover fetcher
  - [ ] 1-hour cache and offline sinusoidal seasonal fallback
- [ ] `WeatherModifierBridge.ts`:
  - [ ] Rain triggers Phaser puddle shaders & auto-waters community garden beds
  - [ ] Freezing weather scales heating energy upkeep; heatwaves scale cooling demand
  - [ ] Courier bike drift physics modifier on wet roads

---

## 2. Off-Grid LoRa & Mesh Networking Plugin (`apps/web/src/plugins/mesh-comms/`)
- [ ] `manifest.json` — permissions for `serial:connect`, `bluetooth:connect`
- [ ] Hardware Web Serial & Web Bluetooth Driver:
  - [ ] `WebSerialDriver.ts` — connect to Meshtastic LoRa node over USB (baud 115200)
  - [ ] `WebBluetoothDriver.ts` — connect to Meshtastic BLE peripheral on mobile/desktop
  - [ ] Device detection and auto-reconnect logic
- [ ] Radio Packet Protocol:
  - [ ] Compact binary encoder (`PacketCodec.ts` using CBOR / protobuf)
  - [ ] Packet types: `COMMONS_ALERT`, `CARAVAN_DISPATCH`, `PEER_HANDSHAKE`, `MESH_CHAT`
- [ ] Serverless P2P Comms:
  - [ ] `WebRtcP2pDriver.ts` — direct phone-to-phone data channel via QR handshake
  - [ ] `MeshChatModal.ts` — in-game walkie-talkie & emergency broadcast terminal

---

## 3. Decentralized Mutual Credit & Local Ledger Plugin (`apps/web/src/plugins/mutual-credit/`)
- [ ] `manifest.json` — permissions for `crypto:sign`, `wallet:ledger`
- [ ] Cryptographic Keypair & Storage:
  - [ ] Ed25519 keypair generation using `crypto.subtle`
  - [ ] Encrypted private key storage in browser `IndexedDB`
- [ ] Mutual Credit Engine (`CryptoLedger.ts`):
  - [ ] Double-entry zero-sum mutual credit clearing (trust balances)
  - [ ] Hash-chained transaction receipts signed with Ed25519
  - [ ] Transaction gossip over LoRa mesh and WebRTC P2P
- [ ] Community Trade UI:
  - [ ] `TradeModal.ts` — negotiate goods/services (pantry crops, tool loans, repair hours)
  - [ ] `QrTradeScanner.ts` — offline scan-to-pay and transaction receipt handshake

---

## 4. Disaster Resilience & Offline Verification Tests
- [ ] **Test 17.1 (Solar Day/Night Sync):** Mock device clock to 22:00 at 52.5°N; verify streetlamps light up and solar generation drops to zero.
- [ ] **Test 17.2 (Live Weather Modifiers):** Mock Open-Meteo response of -5°C and 4.2mm rain; verify district heating upkeep increases and garden soil receives water bonus.
- [ ] **Test 17.3 (LoRa Serial Codec):** Encode a 20 kW caravan dispatch payload; verify serialized packet fits under 200 bytes and decodes identically.
- [ ] **Test 17.4 (Zero-Server P2P Transaction):** Sign a 15 ST mutual-aid credit transaction offline; verify cryptographic signature validates without external internet connection.
