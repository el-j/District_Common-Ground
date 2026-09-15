// M19 — BitChat.free Integration & Pluggable Mesh Transport Architecture
// See docs/planning/19-BITCHAT-FREE-AND-PLUGGABLE-MESH-TRANSPORTS.md
//
// These contracts let any off-grid transport (bitchat.free, LoRa/Meshtastic,
// BLE, local WiFi) plug into apps/web/src/core/mesh/ without the core game
// loop, or any other transport, knowing which one it is talking to.

export interface MeshPacket {
  id: string;
  senderId: string;
  /** null = broadcast to the whole channel; otherwise a specific peerId. */
  recipientId: string | null;
  channel: string;
  /** Hops remaining. Decremented on every relay; dropped at 0. */
  ttl: number;
  timestamp: number;
  /** Transport-defined payload encoding (e.g. JSON string, base64 ciphertext). */
  payload: string;
  /** Base64 Ed25519 signature over the packet's other fields. */
  signature: string;
}

export interface PeerDescriptor {
  peerId: string;
  alias: string;
  /** id of the MeshTransportPlugin that currently sees this peer. */
  transportId: string;
  /** Relative signal strength (e.g. BLE RSSI in dBm); null when the transport has no concept of one. */
  signalStrength: number | null;
  lastSeen: number;
}

/** Kernel-side callback bridge a transport plugin is handed at init() time. */
export interface TransportHostAPI {
  onPacketReceived(packet: MeshPacket): void;
  onPeerDiscovered(peer: PeerDescriptor): void;
  onPeerLost(peerId: string): void;
  log(message: string): void;
}

/** The interface every pluggable communication transport implements. */
export interface MeshTransportPlugin {
  readonly id: string;
  init(host: TransportHostAPI): Promise<void>;
  destroy(): Promise<void>;
  broadcast(packet: MeshPacket): Promise<void>;
  sendDirect(peerId: string, packet: MeshPacket): Promise<void>;
  getActivePeers(): PeerDescriptor[];
}

export type MeshChannel = 'broadsheet' | 'mutual-aid' | 'civic-defense' | 'whisper';

export const MESH_CHANNELS: readonly MeshChannel[] = ['broadsheet', 'mutual-aid', 'civic-defense', 'whisper'];
