# Specification 19: BitChat.free Integration & Pluggable Mesh Transport Architecture

## 1. Executive Vision & Creative Thesis

In emergency situations, civil defense actions, and off-grid community building, relying on a single radio hardware (such as LoRa) creates a single point of failure: players must own a physical ESP32 device.

**BitChat.free** represents an accessible, serverless peer-to-peer mesh communication protocol that operates on everyday smartphones and laptops **with zero internet, zero central servers, and zero specialized hardware**. By leveraging local device radios (Bluetooth LE, WiFi Direct / local subnet mDNS broadcast, and WebRTC peer rendezvous), `bitchat.free` enables instant, encrypted, local neighborhood chat, mutual-aid dispatch, and emergency alerts.

### The Architectural Guarantee: 100% Pluggable Transports
To satisfy the strict requirement that **all communication transports are standalone plugins that do not touch the main game kernel**:
1. The **Core Microkernel** exposes a headless `MeshTransportPlugin` interface with standard primitives: `broadcast(packet)`, `sendDirect(peerId, packet)`, `onPeerDiscovered(callback)`, and `onPacketReceived(callback)`.
2. The core game simulation (District pulse, relief caravans, mutual credit, emergency broadsheet alerts) is completely agnostic to whether packets travel over **BitChat.free**, **LoRa radio**, **Local WiFi**, or **PaperMesh QR codes**.
3. Any developer can build, test, and release `bitchat.free` as a standalone plugin directory (`apps/web/src/plugins/bitchat/`) without modifying a single line of the core game engine.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CORE GAME ENGINE & COMMONS SIMULATION                │
│ (Living District, Mutual Credit, Relief Caravans, Civic Broadcaster)   │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Unified Packet Bus
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                KERNEL TRANSPORT MANAGER (HOST BRIDGE)                   │
│ • Routing & Deduplication Table                                         │
│ • Ed25519 Packet Signature Verification                                 │
│ • Multi-Hop Gossip Engine                                               │
└──────────────┬────────────────────┬────────────────────┬────────────────┘
               │                    │                    │
    Standard Plugin API     Standard Plugin API  Standard Plugin API
               │                    │                    │
               ▼                    ▼                    ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  bitchat.free Plugin │ │ LoRa Meshtastic Node │ │  PaperMesh QR Plugin │
│  (Zero-Hardware Mesh)│ │ (Long-Range Radio)   │ │  (Air-Gapped Optical)│
│ • WebRTC Local Subnet│ │ • Web Serial API     │ │ • Animated 2D Matrix │
│ • BLE Neighborhood   │ │ • Web Bluetooth API  │ │ • Camera Scanner     │
│ • Zero External Net  │ │ • 868 / 915 MHz band │ │ • 100% Zero Radio    │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 2. The `bitchat.free` Protocol Architecture

### 2.1 How `bitchat.free` Works Without Internet
`bitchat.free` operates using three local, zero-internet discovery layers:
1. **Local Subnet Multicast / mDNS**: When phones or laptops connect to any local WiFi router, access point, or tethered phone hotspot (even one with no internet uplink/WAN cable disconnected), `bitchat.free` broadcasts discovery packets across the local broadcast address (`255.255.255.255` or IPv6 link-local multicast).
2. **WebRTC Local Candidate Exchange**: Peers establish direct, encrypted WebRTC `RTCDataChannel` sockets directly across the local LAN without needing an external STUN/TURN signaling server. Signaling is performed via local HTTP/UDP beacons or peer QR code rendezvous.
3. **Web Bluetooth LE Discovery**: For devices in close physical proximity (up to 30 meters), Bluetooth Low Energy GATT advertising broadcasts ephemeral peer presence and small emergency messages without any WiFi connection whatsoever.

### 2.2 Privacy & Cryptographic Integrity
- **Zero Account Registration**: No phone numbers, email addresses, or usernames tied to real identity.
- **Ephemeral Session Keys**: Every BitChat node generates a local X25519 keypair for end-to-end encrypted direct messages and an Ed25519 keypair for signing public board announcements.
- **DDoS / Flood Resistance**: Packets enforce a Proof-of-Work (Hashcash) threshold ($\approx 12$ leading zero bits, computed in $< 50\text{ms}$ on modern phones) to prevent malicious flood attacks in dense local gatherings.

---

## 3. Pluggable Transport Contract (`MeshTransportPlugin`)

The contract defined in `packages/shared-types` ensures that `bitchat.free` and any future communication system adhere to a strict sandbox:

```typescript
export interface MeshPacket {
  id: string;                      // SHA-256 hash of (senderId + sequence + payload)
  senderId: string;                // Public Key Hash of sending player
  recipientId?: string;            // Empty for broadcast, peerId for direct message
  channel: 'broadcast' | 'caravan' | 'emergency' | 'trade' | 'civic_chat';
  ttl: number;                     // Time-to-live hop counter (default: 3)
  timestamp: number;               // Unix millisecond timestamp
  payload: Uint8Array;             // Encrypted or cleartext CBOR payload
  signature: string;               // Ed25519 signature
}

export interface PeerDescriptor {
  peerId: string;
  alias: string;
  transportId: string;             // 'bitchat-free' | 'meshtastic-lora' | 'papermesh'
  signalStrength?: number;         // RSSI or ping latency in ms
  lastSeen: number;
}

export interface MeshTransportPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /**
   * Initializes the transport (e.g. listening on local mDNS, BLE, or serial ports)
   */
  init(hostAPI: TransportHostAPI): Promise<void>;

  /**
   * Shuts down all sockets, radios, and listeners
   */
  destroy(): Promise<void>;

  /**
   * Broadcasts a packet to all reachable peers across this transport
   */
  broadcast(packet: MeshPacket): Promise<void>;

  /**
   * Sends a point-to-point packet to a specific peer
   */
  sendDirect(peerId: string, packet: MeshPacket): Promise<boolean>;

  /**
   * Returns list of currently visible local peers
   */
  getActivePeers(): PeerDescriptor[];
}

export interface TransportHostAPI {
  onPacketReceived(packet: MeshPacket, transportId: string): void;
  onPeerDiscovered(peer: PeerDescriptor): void;
  onPeerLost(peerId: string): void;
  log(message: string, level: 'info' | 'warn' | 'error'): void;
}
```

---

## 4. In-Game Gameplay Integrations for `bitchat.free`

When the `bitchat.free` plugin is active, it seamlessly powers the following game features with zero internet:

### 4.1 The Walkie-Talkie & Neighborhood Dispatch UI (`OfflineChatModal.ts`)
- A tactile handheld walkie-talkie UI with rotary channel selector:
  - **Channel 1 (Open Broadsheet)**: General neighborhood chatter, morning greeting, pet sightings.
  - **Channel 2 (Mutual Aid & Food Sharing)**: Surplus soup alerts from Sal's Kitchen, requests for emergency tools.
  - **Channel 3 (Civic Defense & Alerts)**: Warning neighbors about municipal evictions, power grid shutoffs, or outside speculators.
  - **Channel 4 (Direct Whispers)**: Encrypted 1-on-1 chats with nearby friends.

### 4.2 Multi-Hop Emergency Caravans
If Player A needs emergency kWh power from Player C, but they are 200 meters apart beyond direct BLE range, Player B (standing between them with `bitchat.free` active) automatically relays the signed packet across the mesh. The delivery caravan is dispatched and credited on both ends.

### 4.3 Offline Democratic Assembly & Voting
During the monthly district assembly, neighbors in the same community park or hall connect via `bitchat.free`. Participatory budgeting ballots are cast locally, cryptographically tallied on each phone, and finalized without any server or internet connection.

---

## 5. Development & Standalone Isolation Roadmap

Because this is a decoupled plugin:
1. **Isolated Testing**: Developers can run `npm run test:bitchat` with simulated peer nodes in a virtual network without booting the Phaser 3 canvas or Go backend.
2. **Optional Loading**: On low-memory devices or strict browser environments, `bitchat.free` can be toggled off in settings without affecting core district simulation.
3. **Pluggable Expansion**: Community developers can write their own transports (e.g., Reticulum Network, Briar-like WiFi meshes, or Ham radio AX.25) by implementing the simple 4-method `MeshTransportPlugin` interface.
