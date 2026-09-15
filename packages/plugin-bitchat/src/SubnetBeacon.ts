// M19 — Local subnet peer discovery. True cross-device LAN discovery
// (mDNS/UDP broadcast) has no browser-JS API — there is no raw socket
// access in a sandboxed web page, so real multi-device subnet discovery
// would require a native shell (M18's Tauri packaging) with OS socket
// access, which is out of scope here. What IS real here, and exactly what
// Test 19.2 asks for ("two local browser tabs on the same device"), is
// same-origin cross-tab/window discovery via the standard BroadcastChannel
// API — genuinely zero-server, zero-internet, and fully testable.
export interface BroadcastChannelLike {
  postMessage(data: unknown): void;
  addEventListener(type: 'message', handler: (event: { data: unknown }) => void): void;
  close(): void;
}

export type BroadcastChannelFactory = (name: string) => BroadcastChannelLike;

function defaultFactory(name: string): BroadcastChannelLike {
  return new BroadcastChannel(name) as unknown as BroadcastChannelLike;
}

export function isBroadcastChannelSupported(): boolean {
  return typeof (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel !== 'undefined';
}

export const SUBNET_BEACON_CHANNEL_NAME = 'district-cg-bitchat-subnet-beacon';
export const ANNOUNCE_INTERVAL_MS = 5000;
export const PEER_TIMEOUT_MS = 15000;

interface BeaconMessage {
  type: 'announce' | 'bye';
  peerId: string;
  alias: string;
}

export interface DiscoveredPeer {
  peerId: string;
  alias: string;
  lastSeen: number;
}

export class SubnetBeacon {
  private channel: BroadcastChannelLike | null = null;
  private announceTimer: ReturnType<typeof setInterval> | null = null;
  private readonly peers = new Map<string, { alias: string; lastSeen: number }>();

  constructor(
    private readonly selfPeerId: string,
    private readonly alias: string,
    private readonly onDiscovered: (peer: DiscoveredPeer) => void,
    private readonly onLost: (peerId: string) => void,
    private readonly factory: BroadcastChannelFactory = defaultFactory,
    private readonly now: () => number = Date.now,
  ) {}

  start(): void {
    if (this.channel) return;
    this.channel = this.factory(SUBNET_BEACON_CHANNEL_NAME);
    this.channel.addEventListener('message', (event) => this.handleMessage(event.data));
    this.announce('announce');
    this.announceTimer = setInterval(() => {
      this.announce('announce');
      this.pruneStalePeers();
    }, ANNOUNCE_INTERVAL_MS);
  }

  stop(): void {
    if (this.announceTimer) clearInterval(this.announceTimer);
    this.announceTimer = null;
    this.announce('bye');
    this.channel?.close();
    this.channel = null;
    this.peers.clear();
  }

  private announce(type: 'announce' | 'bye'): void {
    this.channel?.postMessage({ type, peerId: this.selfPeerId, alias: this.alias } satisfies BeaconMessage);
  }

  private handleMessage(data: unknown): void {
    const msg = data as BeaconMessage;
    if (!msg || typeof msg.peerId !== 'string' || msg.peerId === this.selfPeerId) return;

    if (msg.type === 'bye') {
      if (this.peers.delete(msg.peerId)) this.onLost(msg.peerId);
      return;
    }

    const isNew = !this.peers.has(msg.peerId);
    const lastSeen = this.now();
    this.peers.set(msg.peerId, { alias: msg.alias, lastSeen });
    if (isNew) {
      this.onDiscovered({ peerId: msg.peerId, alias: msg.alias, lastSeen });
      // Reply immediately so a peer that started before we existed (and whose
      // one-shot startup announce we therefore missed) still discovers us.
      this.announce('announce');
    }
  }

  pruneStalePeers(): void {
    const cutoff = this.now() - PEER_TIMEOUT_MS;
    for (const [peerId, info] of this.peers) {
      if (info.lastSeen < cutoff) {
        this.peers.delete(peerId);
        this.onLost(peerId);
      }
    }
  }

  listPeers(): DiscoveredPeer[] {
    return Array.from(this.peers.entries()).map(([peerId, info]) => ({ peerId, ...info }));
  }
}
