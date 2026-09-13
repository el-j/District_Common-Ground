# 17 — Off-Grid Mesh Networks, Real-Time Geo-Weather, and Decentralized Mutual Credit

**Studio Agent Consortium:** Backend Architect 🛠️, Level Designer 🏛️, Economy Designer 💰, Game Designer 🎮, Frontend Developer 💻, Whimsy Injector ✨, Brand Guardian 🛡️  
**Status:** Living Architectural Specification & Vision Bible (Decentralized & Off-Grid PoC)  
**Parent Documents:** [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md) · [`docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md) · [`docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md)  

---

## 1. Vision Statement: The Game as an Off-Grid Civic Operating System

*District: Common Ground* transcends traditional gaming to become a **resilient, decentralized civic information and coordination platform**. 

When played in **Real-World Geo-Mode**, the game transforms into a living mirror of physical reality and an autonomous, off-grid communication terminal:
1. **Hyper-Local Atmospheric & Solar Sync:** The in-game world synchronizes 1:1 with real physical reality at the player's coordinates: exact solar elevation (sunrise, golden hour, twilight, streetlamp ignition, moon phases) and real-time live weather (temperature, rain precipitation, wind, cloud cover via open meteorological APIs).
2. **100% Off-Grid Mesh Communication (LoRa & P2P):** The game operates completely without centralized corporate servers or ISP tracking. Neighbors and friends communicate directly via **LoRa radio hardware (Meshtastic via Web Serial / Web Bluetooth)** and peer-to-peer protocols (**BitChat, WebRTC DataChannels, Freenet stubs**). Even during a total blackout or internet cutoff, the game functions as a local neighborhood disaster dispatch and mutual-aid coordination hub!
3. **Decentralized Mutual Credit & Real-World Community Currency:** In-game Solidarity Tokens (ST) and Community Credits (CC) interface with a cryptographic, decentralized peer-to-peer mutual credit ledger. Real neighbors can exchange home-grown vegetables, bicycle repairs, tool lending, and child care without dependency on commercial banking institutions.
4. **Zero-Tracking Sovereignty:** Once the client PWA is launched and cached, zero telemetry or location data is ever transmitted to a central server. All state is held locally and replicated peer-to-peer.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    THE DECENTRALIZED OFF-GRID COMMONS ENGINE                            │
│                                                                                         │
│   ┌────────────────────────┐   ┌─────────────────────────┐   ┌───────────────────────┐  │
│   │ REAL-TIME GEO-WEATHER  │   │ OFF-GRID LORA MESH HUB  │   │ DECENTRALIZED MUTUAL  │  │
│   │ • Live Temp (Open-Met) │   │ • Meshtastic WebSerial  │   │   CREDIT & CURRENCY   │  │
│   │ • Exact SunCalc Solar  │   │ • BitChat / WebRTC P2P  │   │ • Peer-to-Peer Wallet │  │
│   │ • Precipitation Shaders│   │ • Emergency Dispatch    │   │ • Real-world Goods    │  │
│   │ • Weather Upkeep Drain │   │ • Zero Central Server   │   │   & Services Exchange │  │
│   └───────────┬────────────┘   └────────────┬────────────┘   └───────────┬───────────┘  │
│               │                             │                            │              │
│               ▼                             ▼                            ▼              │
│   ═══════════════════════════════════════════════════════════════════════════════════   │
│                      MICROKERNEL PLUGIN EXTENSION SLOTS                                 │
│    `GeoWeatherPlugin`            `MeshCommsPlugin`            `MutualCreditPlugin`      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. System 1: Real-Time Geo-Weather & Solar Cycle Sync

### 2.1 Astronomical Solar Time (Exact Day/Night at Player Coordinates)
Instead of arbitrary accelerated game clocks, Real-World Mode allows running in **1:1 Real-Time**:
* **Solar Geometry Calculation (`SunCalc`):** Uses standard astronomical equations based on the player's latitude, longitude, and device clock:
  - *Dawn & Sunrise:* Soft golden rays pierce the street grid; solar arrays begin generating trickle wattage.
  - *Solar Noon:* Maximum ambient brightness, shortest shadows, peak solar battery charging.
  - *Golden Hour & Dusk:* Sky turns into rich terracotta and violet gradients; building windows illuminate.
  - *Nightfall:* Sidewalk streetlamps flicker to life with warm pool-lighting; pedestrian traffic calms; nocturnal NPCs (and Scraps the cat) become active.
  - *Lunar Phases:* New moon causes darker nights requiring flashlights; full moon casts crisp silver shadows.

### 2.2 Live Meteorological Ingestion (Open-Meteo Open Data)
* **Open-Meteo Integration:** A 100% free, open-source weather API requiring zero API keys.
* **Mechanical Gameplay Effects of Live Weather:**
  - **Ambient Temperature ($T^\circ\text{C}$):**
    - High heat ($> 30^\circ\text{C}$): Increases character hydration and energy drain; triggers cooling center activation quests.
    - Freezing cold ($< 2^\circ\text{C}$): Increases district heating energy upkeep; boilers and insulation must be checked.
  - **Precipitation (Rain / Snow):**
    - Dynamic rain particle shaders in Phaser with puddle reflections on OSM roads.
    - Automatically waters community garden plots, boosting crop harvest yield for the next morning!
    - Heavy rain slows Pip's cargo bike courier speed and increases braking distance (drift mechanics).
  - **Wind Speed & Cloud Cover:**
    - High cloud cover reduces rooftop solar panel efficiency.
    - High wind increases potential for micro-wind turbine generation.

```typescript
export interface GeoWeatherState {
  timestamp: number;
  coordinates: { lat: number; lng: number };
  solar: {
    azimuth: number;
    altitude: number;
    isNight: boolean;
    phaseName: 'dawn' | 'day' | 'goldenHour' | 'dusk' | 'night';
  };
  weather: {
    temperatureC: number;
    apparentTempC: number;
    precipitationMm: number;
    isRaining: boolean;
    isSnowing: boolean;
    cloudCoverPct: number;
    windSpeedKmh: number;
  };
  gameModifiers: {
    solarEfficiencyMult: number; // e.g. 0.35 on overcast days
    energyHeatingUpkeep: number;  // scales with freezing temps
    gardenWaterBonus: boolean;    // true if rain > 1.0mm
    courierFrictionMult: number;  // 0.8 on slick wet asphalt
  };
}
```

---

## 3. System 2: Off-Grid Mesh Networking (LoRa, BitChat & Freenet)

### 3.1 The Vulnerability of Centralized Infrastructure
In genuine climate disasters (severe storms, power outages, grid failures) or civic crackdowns, the centralized internet often fails first: cell towers lose backhaul, power cuts take down routers, and centralized servers become unreachable. 

*District: Common Ground* is engineered to be **self-healing and off-grid resilient**.

### 3.2 Hardware Bridge: LoRa & Meshtastic via Web Serial / Web Bluetooth
Modern web browsers (Chrome, Edge, Opera on Desktop & Android) support the **Web Serial API** and **Web Bluetooth API**. This allows the browser PWA to connect directly to an inexpensive, low-power **LoRa radio transceiver** (e.g. Meshtastic on ESP32, Heltec V3, LilyGO T-Beam, costing ~$25):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OFF-GRID LORA MESH TOPOLOGY                          │
│                                                                         │
│  [PLAYER A: BROWSER PWA]                                                │
│         │ (Web Serial / Web Bluetooth over USB/BLE)                     │
│         ▼                                                               │
│  [LORA TRANSCEIVER NODE A (433 / 868 / 915 MHz)]                        │
│         │                                                               │
│         │ ~ 5 km - 15 km long-range radio packet (No Internet/Cell)    │
│         ▼                                                               │
│  [REPEATER ON HIGH ROOFTOP / TREE]                                      │
│         │                                                               │
│         ▼                                                               │
│  [LORA TRANSCEIVER NODE B]                                              │
│         │ (Web Bluetooth)                                               │
│         ▼                                                               │
│  [PLAYER B: BROWSER PWA]                                                │
│  • Receives emergency kilowatt dispatch caravan alert                   │
│  • Reads neighborhood warning: "Water main burst on 5th Street"         │
│  • Confirms mutual-aid peer deed verification                           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### LoRa Packet Payloads for Common Ground
LoRa packets are compact (237 bytes max payload). We define binary and compressed CBOR packets:
1. `COMMONS_ALERT (0x01)`: Emergency alerts (blackout, heating center open, lost pet).
2. `CARAVAN_DISPATCH (0x02)`: Signed resource transfer (sender, recipient, tokens, timestamp).
3. `PEER_HANDSHAKE (0x03)`: Proximity civic deed verification between neighbors.
4. `MESH_CHAT (0x04)`: End-to-end encrypted peer text message via BitChat channel.

### 3.3 BitChat & WebRTC Serverless P2P
For players connected to local Wi-Fi or ad-hoc hotspot networks without external internet access:
* **WebRTC DataChannels with Local mDNS / QR Signalling:** Connect two phones by scanning a connection QR code on screen. Data flows directly peer-to-peer over local radio/Wi-Fi without touching any outside server.
* **Freenet / Nostr Micro-Relay Support:** Encrypted local gossip broadcast for community broadsheet bulletins.

---

## 4. System 3: Decentralized Mutual Credit & Local Currency Ledger

### 4.1 From In-Game Token to Real-World Mutual Aid Economy
In many historical and contemporary crises (e.g. Argentina 2001, Switzerland WIR bank, Sardex in Sardinia), communities created **Mutual Credit Clearing Systems** to keep local economies alive when national currencies collapsed or banks froze.

*District: Common Ground* incorporates a **Decentralized Mutual Credit Engine**:
* **Zero-Interest Mutual Credit:** A ledger of trust between neighbors. When Player A helps Player B fix a roof, Player A's balance increases and Player B's balance records a commitment to help someone else in the network.
* **Non-Speculative:** Tokens cannot be hoarded for compound interest or traded on speculative Wall Street exchanges. They represent purely **lived labor, shared resources, and mutual aid**.
* **Cryptographic Local Validation:**
  - Every transaction is signed locally using a cryptographic keypair (Ed25519) stored securely in the browser's `SubtleCrypto` / `IndexedDB`.
  - Transaction receipts are gossiped across the local LoRa mesh or P2P network.
  - Double-spending is prevented via lightweight hash-chained local logs (similar to Holochain or Secure Scuttlebutt).

### 4.2 Real-World Exchange Capabilities
* **Neighborhood Pantry Trade:** Trade a basket of homegrown tomatoes for a jar of sourdough starter.
* **Tool Lending & Repair:** Log 2 hours of bicycle maintenance to earn credits for winter firewood or child care.
* **Zero Transaction Fees:** No bank cuts, zero middleman fees, 100% community sovereign.

---

## 5. Microkernel Plugin Architecture Integration

In full adherence to our Zero-Core-Modification rule, these capabilities are packaged as **autonomous microkernel plugins**:

```
apps/web/src/plugins/
├── geo-weather/
│   ├── manifest.json                # Plugin metadata & permissions ("geo:read", "weather:sync")
│   ├── index.ts                     # Plugin lifecycle (mount, unmount, onTick)
│   ├── OpenMeteoAdapter.ts          # REST & cache client for weather
│   └── SunCalcEngine.ts             # Astronomical solar elevation calculations
├── mesh-comms/
│   ├── manifest.json                # Permissions ("serial:connect", "bluetooth:connect")
│   ├── index.ts                     # Web Serial / Web Bluetooth bridge
│   ├── MeshtasticProtocol.ts        # Radio packet encode/decode
│   └── P2pChatModal.ts              # In-game walkie-talkie / mesh terminal UI
└── mutual-credit/
    ├── manifest.json                # Permissions ("crypto:sign", "wallet:ledger")
    ├── index.ts                     # Ed25519 local keypair & transaction ledger
    ├── CreditJournalModal.ts        # Neighbor trade & balance clearing interface
    └── QrScannerBridge.ts           # QR camera scanner for offline trades
```

---

## 6. Security, Privacy & Disaster Resilience Standards

1. **Zero Tracking by Design:** 
   - No analytics beacons, no tracking pixels, no centralized database required for core gameplay.
   - GPS coordinates are processed entirely in client-side RAM and optionally truncated to coarse 3-decimal-place grids (~100m radius) to prevent exact residence triangulation.
2. **End-to-End Encryption (E2EE):**
   - Mesh chat messages transmitted over LoRa or BitChat are encrypted with ChaCha20-Poly1305 using neighborhood group pre-shared keys (PSK) or peer public keys.
3. **Hardened Offline Durability:**
   - The entire PWA, including the OpenStreetMap parser, solar calculations, procedural sound synthesis, and local ledger, installs 100% into the Service Worker cache. The game can be launched and played indefinitely in airplane mode.
