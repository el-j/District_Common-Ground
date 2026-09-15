// M19 — Unified packet routing: dedupe, TTL/relay, signature verification,
// and channel pub/sub, shared by every transport plugin registered with
// TransportRegistry. Pure and transport-agnostic, same design intent as
// M18's CRDTSyncEngine — it doesn't know or care whether a packet arrived
// over bitchat.free, LoRa, or (in a future transport) ham radio.
import type { MeshPacket, PeerDescriptor, TransportHostAPI } from '@district-cg/shared-types';
import { verifyPacketSignature } from './MeshCrypto';

export type MeshChannelHandler = (packet: MeshPacket) => void;
export type RelayFn = (packet: MeshPacket) => Promise<void>;

const DEDUPE_CACHE_SIZE = 512;

export interface MeshNetworkServiceOptions {
  logSink?: (message: string) => void;
  dedupeCacheSize?: number;
}

/**
 * Implements TransportHostAPI — this is what every transport plugin's
 * init(host) receives. Relaying is wired externally via setRelay() (the
 * composition root points it at TransportRegistry.broadcast) so this class
 * has no direct dependency on any specific transport.
 */
export class MeshNetworkService implements TransportHostAPI {
  private readonly seenPacketIds = new Set<string>();
  private readonly seenOrder: string[] = [];
  private readonly peers = new Map<string, PeerDescriptor>();
  private readonly channelHandlers = new Map<string, Set<MeshChannelHandler>>();
  private readonly peerPublicKeys = new Map<string, CryptoKey>();
  private readonly dedupeCacheSize: number;
  private readonly logSink: (message: string) => void;
  private relay: RelayFn | null = null;

  constructor(options: MeshNetworkServiceOptions = {}) {
    this.logSink = options.logSink ?? (() => {});
    this.dedupeCacheSize = options.dedupeCacheSize ?? DEDUPE_CACHE_SIZE;
  }

  setRelay(relay: RelayFn | null): void {
    this.relay = relay;
  }

  registerPeerPublicKey(peerId: string, key: CryptoKey): void {
    this.peerPublicKeys.set(peerId, key);
  }

  subscribe(channel: string, handler: MeshChannelHandler): () => void {
    let handlers = this.channelHandlers.get(channel);
    if (!handlers) {
      handlers = new Set();
      this.channelHandlers.set(channel, handlers);
    }
    handlers.add(handler);
    return () => handlers?.delete(handler);
  }

  private markSeen(id: string): boolean {
    if (this.seenPacketIds.has(id)) return false;
    this.seenPacketIds.add(id);
    this.seenOrder.push(id);
    if (this.seenOrder.length > this.dedupeCacheSize) {
      const evicted = this.seenOrder.shift();
      if (evicted !== undefined) this.seenPacketIds.delete(evicted);
    }
    return true;
  }

  /** Called by a transport plugin whenever it receives a packet (from the wire, or from a peer's relay). */
  async onPacketReceived(packet: MeshPacket): Promise<void> {
    if (!this.markSeen(packet.id)) {
      this.log(`dropped duplicate packet ${packet.id}`);
      return;
    }

    const publicKey = this.peerPublicKeys.get(packet.senderId);
    if (publicKey) {
      const valid = await verifyPacketSignature(packet, publicKey);
      if (!valid) {
        this.log(`rejected packet ${packet.id}: invalid signature from ${packet.senderId}`);
        return;
      }
    } else {
      this.log(`packet ${packet.id} from unrecognized peer ${packet.senderId} — signature unverified`);
    }

    for (const handler of this.channelHandlers.get(packet.channel) ?? []) handler(packet);

    if (packet.ttl > 0 && this.relay) {
      await this.relay({ ...packet, ttl: packet.ttl - 1 });
    }
  }

  onPeerDiscovered(peer: PeerDescriptor): void {
    this.peers.set(peer.peerId, peer);
  }

  onPeerLost(peerId: string): void {
    this.peers.delete(peerId);
  }

  log(message: string): void {
    this.logSink(message);
  }

  getPeers(): PeerDescriptor[] {
    return Array.from(this.peers.values());
  }
}
