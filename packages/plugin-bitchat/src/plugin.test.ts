import { describe, it, expect, vi } from 'vitest';
import type { KernelContext, KernelHudButtonDescriptor, MeshPacket, PeerDescriptor, TransportHostAPI } from '@district-cg/shared-types';
import { manifest, register, bitchatPlugin, BitChatTransportPlugin, type BitChatConnectionPoolLike } from './plugin';

function makeFakeContext(): KernelContext & { registered: KernelHudButtonDescriptor[] } {
  const registered: KernelHudButtonDescriptor[] = [];
  return {
    uiRoot: {} as HTMLElement,
    hud: { registerButton: (b) => registered.push(b) },
    theme: { switchSkin: vi.fn(), getActiveSkinId: vi.fn(() => 'default') },
    audio: { playUIClick: vi.fn(), playSolidarityChime: vi.fn() },
    input: { setLocked: vi.fn() },
    mesh: { sendChatMessage: vi.fn(), onChatMessage: vi.fn(() => () => {}), getActivePeerCount: vi.fn(() => 0), getTransportBadges: vi.fn(() => []) },
    registered,
  };
}

function makeHost(): TransportHostAPI & { received: MeshPacket[]; discovered: PeerDescriptor[]; lost: string[] } {
  const received: MeshPacket[] = [];
  const discovered: PeerDescriptor[] = [];
  const lost: string[] = [];
  return {
    onPacketReceived: (p) => received.push(p),
    onPeerDiscovered: (p) => discovered.push(p),
    onPeerLost: (id) => lost.push(id),
    log: vi.fn(),
    received,
    discovered,
    lost,
  };
}

function makeFakePool(): BitChatConnectionPoolLike & { sent: Array<[string, string]> } {
  const sent: Array<[string, string]> = [];
  const active = new Set<string>();
  return {
    sent,
    async createOfferEnvelope(peerId) {
      active.add(peerId);
      return { sdp: { type: 'offer', sdp: `offer-to-${peerId}` }, ephemeralPublicKey: 'pub', powNonce: 1 };
    },
    async acceptOfferEnvelope(peerId) {
      active.add(peerId);
      return { sdp: { type: 'answer', sdp: `answer-to-${peerId}` }, ephemeralPublicKey: 'pub', powNonce: 1 };
    },
    async acceptAnswerEnvelope() {},
    async send(peerId, plaintext) {
      sent.push([peerId, plaintext]);
    },
    close(peerId) {
      active.delete(peerId);
    },
    activePeerIds() {
      return Array.from(active);
    },
  };
}

describe('bitchat kernel plugin', () => {
  it('exposes a manifest matching the standard kernel plugin shape', () => {
    expect(manifest.id).toBe('bitchat');
    expect(bitchatPlugin.manifest).toBe(manifest);
  });

  it('registers exactly one HUD button describing the off-grid walkie-talkie', () => {
    const ctx = makeFakeContext();
    register(ctx);
    expect(ctx.registered).toHaveLength(1);
    expect(ctx.registered[0]).toMatchObject({ id: 'bitchat', icon: '📡', className: 'bitchat-open-btn' });
  });
});

describe('BitChatTransportPlugin', () => {
  it('Test 19.1 (Zero Core Touch): init and destroy cleanly with zero uncaught errors, even with no peers ever discovered', async () => {
    const plugin = new BitChatTransportPlugin(() => makeFakePool());
    const host = makeHost();

    await expect(plugin.init(host)).resolves.toBeUndefined();
    expect(plugin.getActivePeers()).toEqual([]);
    await expect(plugin.broadcast({ id: 'x', senderId: 's', recipientId: null, channel: 'broadsheet', ttl: 1, timestamp: 0, payload: '', signature: '' })).resolves.toBeUndefined();
    await expect(plugin.destroy()).resolves.toBeUndefined();
  });

  it('initiates a handshake only when this plugin has the lexicographically lower peerId', async () => {
    const pool = makeFakePool();
    const plugin = new BitChatTransportPlugin(() => pool);
    // Force a known selfPeerId ordering deterministically for the assertion below.
    Object.defineProperty(plugin, 'selfPeerId', { value: 'aaa-self' });
    const host = makeHost();
    await plugin.init(host);

    (plugin as unknown as { handleDiscovered: (p: { peerId: string; alias: string; lastSeen: number }) => void }).handleDiscovered({
      peerId: 'zzz-other',
      alias: 'Other',
      lastSeen: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(host.discovered).toHaveLength(1);
    expect(pool.activePeerIds()).toContain('zzz-other');

    await plugin.destroy();
  });

  it('does not initiate a handshake when the discovered peer has the lower peerId', async () => {
    const pool = makeFakePool();
    const plugin = new BitChatTransportPlugin(() => pool);
    Object.defineProperty(plugin, 'selfPeerId', { value: 'zzz-self' });
    const host = makeHost();
    await plugin.init(host);

    (plugin as unknown as { handleDiscovered: (p: { peerId: string; alias: string; lastSeen: number }) => void }).handleDiscovered({
      peerId: 'aaa-other',
      alias: 'Other',
      lastSeen: Date.now(),
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(pool.activePeerIds()).not.toContain('aaa-other');

    await plugin.destroy();
  });

  it('broadcast() sends the serialized packet to every active peer', async () => {
    const pool = makeFakePool();
    const plugin = new BitChatTransportPlugin(() => pool);
    const host = makeHost();
    await plugin.init(host);
    await pool.createOfferEnvelope('peer-x');
    await pool.createOfferEnvelope('peer-y');

    const packet: MeshPacket = { id: 'p1', senderId: 's', recipientId: null, channel: 'broadsheet', ttl: 1, timestamp: 0, payload: 'hi', signature: '' };
    await plugin.broadcast(packet);

    expect(pool.sent).toHaveLength(2);
    expect(pool.sent.map(([peerId]) => peerId).sort()).toEqual(['peer-x', 'peer-y']);
    expect(JSON.parse(pool.sent[0]![1])).toEqual(packet);

    await plugin.destroy();
  });

  it('sendDirect() rejects when the plugin has not been initialized', async () => {
    const plugin = new BitChatTransportPlugin(() => makeFakePool());
    await expect(plugin.sendDirect('peer-x', { id: 'p1', senderId: 's', recipientId: 'peer-x', channel: 'whisper', ttl: 1, timestamp: 0, payload: '', signature: '' })).rejects.toThrow(/not initialized/);
  });

  it('forwards a valid received plaintext packet to the host, and drops a malformed one', async () => {
    let onReceive: ((peerId: string, plaintext: string) => void) | null = null;
    const plugin = new BitChatTransportPlugin((receiveFn) => {
      onReceive = receiveFn;
      return makeFakePool();
    });
    const host = makeHost();
    await plugin.init(host);

    const packet: MeshPacket = { id: 'p1', senderId: 's', recipientId: null, channel: 'broadsheet', ttl: 1, timestamp: 0, payload: 'hi', signature: '' };
    onReceive!('peer-x', JSON.stringify(packet));
    onReceive!('peer-x', 'not json at all');

    expect(host.received).toEqual([packet]);
    expect(host.log).toHaveBeenCalledWith(expect.stringContaining('malformed'));

    await plugin.destroy();
  });
});
