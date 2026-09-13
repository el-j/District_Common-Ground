# EPIC-17 — Off-Grid Mesh Networks, Real-Time Geo-Weather, and Decentralized Mutual Credit

**Agent roles:** engineering-backend-architect, engineering-frontend-developer, game-designer, level-designer, brand-guardian  
**Planning doc:** [`docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/17-OFF-GRID-MESH-REALTIME-WEATHER-AND-LOCAL-CURRENCY.md)  
**Parent vision:** [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md) · [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)

---

## Vision
Elevate the game into a **self-reliant civic operating system** that runs totally off-grid without corporate servers:
1. **Real-Time Astronomical Solar & Weather Sync:** Daylight, streetlamp ignition, rainfall, and temperature match 1:1 with real physical conditions at the player's geographic location.
2. **LoRa & P2P Mesh Communication:** Neighbors communicate, dispatch mutual-aid caravans, and broadcast emergency alerts via **LoRa radio hardware (Meshtastic via Web Serial / Web Bluetooth)** and serverless P2P protocols (BitChat / WebRTC) even when internet and cell towers are offline.
3. **Decentralized Mutual Credit Ledger:** In-game Solidarity Tokens interface with a local cryptographic, zero-fee mutual credit accounting engine, enabling real-world neighbor-to-neighbor trades (pantry goods, repairs, tool lending).
4. **Zero-Server Privacy Sovereignty:** Complete client-side autonomy with zero tracking or central logging after initial PWA caching.

---

## User Stories & Acceptance Criteria

### User Story 1: Real-Time Solar & Live Weather Sync
> **As a player in Real-World Mode**, I want the in-game world to mirror the exact daylight, temperature, and rain occurring outside my window, so that my virtual neighborhood feels deeply rooted in physical reality.

* **Acceptance Criteria:**
  * SunCalc calculates exact solar elevation: sunrise, golden hour, twilight, and night streetlamp lighting match local physical time.
  * Open-Meteo fetches real temperature, rain, and cloud cover without requiring API keys.
  * Freezing temperatures increase district heating energy upkeep; summer heatwaves increase cooling demands.
  * Real rainfall triggers rain shaders and automatically waters community garden beds.

### User Story 2: Off-Grid LoRa & P2P Mesh Comms
> **As a neighborhood organizer**, I want the game to connect to my low-cost LoRa radio (Meshtastic) via USB or Bluetooth, so that our community can coordinate mutual aid, send alerts, and chat totally off-grid during an internet blackout.

* **Acceptance Criteria:**
  * Web Serial API and Web Bluetooth API detect and connect to a local Meshtastic LoRa node.
  * Compact binary packets broadcast over 868/915 MHz radio: emergency alerts, mutual aid caravan shipments, peer deed handshakes.
  * WebRTC DataChannels allow direct local phone-to-phone encrypted chat without internet access.
  * Zero centralized telemetry or tracking.

### User Story 3: Decentralized Mutual Credit & Local Trade
> **As a neighbor**, I want a fair, non-speculative way to exchange homegrown food, bike repairs, and tools with nearby players, so that we build economic self-reliance independent of commercial banks.

* **Acceptance Criteria:**
  * Local Ed25519 cryptographic keypair generated and stored in browser `SubtleCrypto`.
  * Mutual credit transactions signed offline and verified peer-to-peer via QR code scan or LoRa gossip.
  * Zero gas fees, zero interest, zero middleman cuts.
  * Balance journals persist safely in client-side IndexedDB.

---

## Technical Deliverables (Microkernel Plugins)

### `apps/web/src/plugins/geo-weather/`
* `OpenMeteoAdapter.ts` — Live weather fetcher with offline sinusoidal fallback.
* `SunCalcEngine.ts` — Real-time astronomical solar angle calculator.
* `WeatherModifierBridge.ts` — Applies ambient temperature and rain modifiers to game state.

### `apps/web/src/plugins/mesh-comms/`
* `WebSerialDriver.ts` / `WebBluetoothDriver.ts` — Hardware serial port bridge to Meshtastic LoRa devices.
* `PacketCodec.ts` — CBOR/binary encoder for compact radio payloads.
* `MeshChatModal.ts` — Off-grid walkie-talkie and emergency bulletin interface.

### `apps/web/src/plugins/mutual-credit/`
* `CryptoLedger.ts` — Local Ed25519 keypair and hash-chained transaction log.
* `TradeModal.ts` — Neighbor trade negotiation and QR payment generator.
