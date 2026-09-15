// M19 — Standalone bitchat.free transport plugin. Deviates from the M19 task
// doc's literal `apps/web/src/plugins/bitchat/` path: M20's planning doc
// ("Standalone Package/App Architecture for Minigames and Plugins") makes
// every transport/minigame a standalone `packages/*` package the exact same
// way geo-weather/mesh-comms/mutual-credit already are, so this plugin is
// built directly at that target location rather than a path M20 would just
// move it from — the same "fix docs forward" call already made for M18's
// Kernel-plugin registration pattern.
import type {
  KernelContext,
  KernelPluginManifest,
  KernelPluginModule,
  MeshPacket,
  MeshTransportPlugin,
  PeerDescriptor,
  TransportHostAPI,
} from '@district-cg/shared-types';
import { SubnetBeacon, type DiscoveredPeer } from './SubnetBeacon';
import { BitChatConnectionPool, type SignalingEnvelope } from './BitChatProtocol';
import { OfflineChatModal } from './OfflineChatModal';

const SIGNALING_CHANNEL_NAME = 'district-cg-bitchat-signaling';
const ALIAS_NOUNS = ['Courier', 'Gardener', 'Neighbor', 'Dispatcher', 'Organizer', 'Mechanic'];

interface SignalingMessage {
  kind: 'offer' | 'answer';
  fromPeerId: string;
  toPeerId: string;
  envelope: SignalingEnvelope;
}

function randomAlias(): string {
  const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
  return `${noun}-${Math.floor(Math.random() * 900 + 100)}`;
}

/** The subset of BitChatConnectionPool's surface the plugin actually drives — kept as an
 *  interface so tests can inject a fake pool and exercise the discovery/signaling glue
 *  below without needing a real RTCPeerConnection (unavailable outside a browser). */
export interface BitChatConnectionPoolLike {
  createOfferEnvelope(peerId: string): Promise<SignalingEnvelope>;
  acceptOfferEnvelope(peerId: string, envelope: SignalingEnvelope): Promise<SignalingEnvelope>;
  acceptAnswerEnvelope(peerId: string, envelope: SignalingEnvelope): Promise<void>;
  send(peerId: string, plaintext: string): Promise<void>;
  close(peerId: string): void;
  activePeerIds(): string[];
}

export type BitChatConnectionPoolFactory = (onReceive: (peerId: string, plaintext: string) => void) => BitChatConnectionPoolLike;

function defaultPoolFactory(onReceive: (peerId: string, plaintext: string) => void): BitChatConnectionPoolLike {
  return new BitChatConnectionPool(onReceive);
}

/**
 * Implements MeshTransportPlugin for bitchat.free: automatic same-device
 * discovery + WebRTC handshake (via SubnetBeacon + BitChatConnectionPool,
 * signaled over a local BroadcastChannel — see those modules' scoping
 * notes for why cross-device discovery/signaling isn't automatic yet) and
 * end-to-end encrypted delivery of whatever MeshPacket the core mesh layer
 * hands it.
 */
export class BitChatTransportPlugin implements MeshTransportPlugin {
  readonly id = 'bitchat';
  readonly selfPeerId = `bitchat-${Math.random().toString(36).slice(2, 10)}`;
  readonly alias = randomAlias();

  private host: TransportHostAPI | null = null;
  private beacon: SubnetBeacon | null = null;
  private signalingChannel: BroadcastChannel | null = null;
  private pool: BitChatConnectionPoolLike | null = null;
  private readonly peers = new Map<string, PeerDescriptor>();

  constructor(private readonly poolFactory: BitChatConnectionPoolFactory = defaultPoolFactory) {}

  async init(host: TransportHostAPI): Promise<void> {
    this.host = host;
    this.pool = this.poolFactory((peerId, plaintext) => this.handlePlaintext(peerId, plaintext));

    if (typeof BroadcastChannel === 'undefined') {
      host.log('bitchat: BroadcastChannel unavailable in this environment — same-device auto-discovery disabled');
      return;
    }

    this.signalingChannel = new BroadcastChannel(SIGNALING_CHANNEL_NAME);
    this.signalingChannel.addEventListener('message', (event) => {
      void this.handleSignaling(event.data as SignalingMessage);
    });

    this.beacon = new SubnetBeacon(
      this.selfPeerId,
      this.alias,
      (peer) => this.handleDiscovered(peer),
      (peerId) => this.handleLost(peerId),
    );
    this.beacon.start();
  }

  async destroy(): Promise<void> {
    this.beacon?.stop();
    this.signalingChannel?.close();
    this.beacon = null;
    this.signalingChannel = null;
    this.pool = null;
    this.peers.clear();
    this.host = null;
  }

  private handleDiscovered(peer: DiscoveredPeer): void {
    const descriptor: PeerDescriptor = { peerId: peer.peerId, alias: peer.alias, transportId: this.id, signalStrength: null, lastSeen: peer.lastSeen };
    this.peers.set(peer.peerId, descriptor);
    this.host?.onPeerDiscovered(descriptor);
    // Only the lexicographically-lower peerId initiates the handshake, so
    // two tabs discovering each other simultaneously don't both send offers.
    if (this.selfPeerId < peer.peerId) void this.initiateConnection(peer.peerId);
  }

  private handleLost(peerId: string): void {
    this.peers.delete(peerId);
    this.pool?.close(peerId);
    this.host?.onPeerLost(peerId);
  }

  private async initiateConnection(peerId: string): Promise<void> {
    if (!this.pool || !this.signalingChannel) return;
    try {
      const envelope = await this.pool.createOfferEnvelope(peerId);
      this.signalingChannel.postMessage({ kind: 'offer', fromPeerId: this.selfPeerId, toPeerId: peerId, envelope } satisfies SignalingMessage);
    } catch (err) {
      this.host?.log(`bitchat: failed to initiate handshake with ${peerId}: ${String(err)}`);
    }
  }

  private async handleSignaling(msg: SignalingMessage): Promise<void> {
    if (!this.pool || !msg || msg.toPeerId !== this.selfPeerId) return;
    try {
      if (msg.kind === 'offer') {
        const answer = await this.pool.acceptOfferEnvelope(msg.fromPeerId, msg.envelope);
        this.signalingChannel?.postMessage({ kind: 'answer', fromPeerId: this.selfPeerId, toPeerId: msg.fromPeerId, envelope: answer } satisfies SignalingMessage);
      } else {
        await this.pool.acceptAnswerEnvelope(msg.fromPeerId, msg.envelope);
      }
    } catch (err) {
      this.host?.log(`bitchat: handshake with ${msg.fromPeerId} failed: ${String(err)}`);
    }
  }

  private handlePlaintext(_peerId: string, plaintext: string): void {
    try {
      const packet = JSON.parse(plaintext) as MeshPacket;
      this.host?.onPacketReceived(packet);
    } catch {
      this.host?.log(`bitchat: dropped a malformed packet from ${_peerId}`);
    }
  }

  async broadcast(packet: MeshPacket): Promise<void> {
    if (!this.pool) return;
    const serialized = JSON.stringify(packet);
    await Promise.all(this.pool.activePeerIds().map((peerId) => this.pool!.send(peerId, serialized).catch(() => {})));
  }

  async sendDirect(peerId: string, packet: MeshPacket): Promise<void> {
    if (!this.pool) throw new Error('bitchat transport is not initialized');
    await this.pool.send(peerId, JSON.stringify(packet));
  }

  getActivePeers(): PeerDescriptor[] {
    return Array.from(this.peers.values());
  }
}

export function createTransportPlugin(): MeshTransportPlugin {
  return new BitChatTransportPlugin();
}

export const manifest: KernelPluginManifest = {
  id: 'bitchat',
  version: '0.1.0',
  title: 'bitchat.free — Zero-Internet Neighborhood Chat',
  description: 'Zero-server, zero-hardware peer-to-peer mesh chat: discovers nearby devices and negotiates end-to-end encrypted channels automatically, no cell signal or WiFi router required.',
  permissions: ['bluetooth:scan'],
  requiresHardware: false,
};

export function register(ctx: KernelContext): void {
  ctx.hud.registerButton({
    id: 'bitchat',
    icon: '📡',
    label: 'Open the off-grid walkie-talkie',
    className: 'bitchat-open-btn',
    onClick: () => new OfflineChatModal(ctx),
  });
}

export const bitchatPlugin: KernelPluginModule = { manifest, register };
