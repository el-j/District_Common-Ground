import { describe, it, expect, vi } from 'vitest';
import type { MeshPacket, MeshTransportPlugin, PeerDescriptor, TransportHostAPI } from '@district-cg/shared-types';
import { TransportRegistry } from './TransportRegistry';

function makeHost(): TransportHostAPI {
  return { onPacketReceived: vi.fn(), onPeerDiscovered: vi.fn(), onPeerLost: vi.fn(), log: vi.fn() };
}

function makePacket(): MeshPacket {
  return { id: 'p1', senderId: 's', recipientId: null, channel: 'broadsheet', ttl: 1, timestamp: 0, payload: '', signature: '' };
}

function makeTransport(id: string, peers: PeerDescriptor[] = []): MeshTransportPlugin {
  return {
    id,
    init: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    broadcast: vi.fn().mockResolvedValue(undefined),
    sendDirect: vi.fn().mockResolvedValue(undefined),
    getActivePeers: vi.fn(() => peers),
  };
}

describe('TransportRegistry', () => {
  it('initializes a plugin with the host on register, and refuses a duplicate id', async () => {
    const host = makeHost();
    const registry = new TransportRegistry(host);
    const plugin = makeTransport('bitchat');

    await registry.register(plugin);
    expect(plugin.init).toHaveBeenCalledWith(host);
    expect(registry.listTransportIds()).toEqual(['bitchat']);

    await expect(registry.register(makeTransport('bitchat'))).rejects.toThrow(/already registered/);
  });

  it('destroys and removes a plugin on unregister', async () => {
    const registry = new TransportRegistry(makeHost());
    const plugin = makeTransport('bitchat');
    await registry.register(plugin);

    await registry.unregister('bitchat');

    expect(plugin.destroy).toHaveBeenCalledTimes(1);
    expect(registry.listTransportIds()).toEqual([]);
  });

  it('multiplexes a broadcast across every active transport, tolerating one that throws', async () => {
    const host = makeHost();
    const registry = new TransportRegistry(host);
    const good = makeTransport('bitchat');
    const bad = makeTransport('lora');
    bad.broadcast = vi.fn().mockRejectedValue(new Error('radio offline'));
    await registry.register(good);
    await registry.register(bad);

    const packet = makePacket();
    await registry.broadcast(packet);

    expect(good.broadcast).toHaveBeenCalledWith(packet);
    expect(bad.broadcast).toHaveBeenCalledWith(packet);
    expect(host.log).toHaveBeenCalledWith(expect.stringContaining('lora'));
  });

  it('routes sendDirect to whichever transport currently sees that peer', async () => {
    const registry = new TransportRegistry(makeHost());
    const withoutPeer = makeTransport('lora', []);
    const withPeer = makeTransport('bitchat', [{ peerId: 'peer-b', alias: 'B', transportId: 'bitchat', signalStrength: null, lastSeen: 0 }]);
    await registry.register(withoutPeer);
    await registry.register(withPeer);

    const packet = makePacket();
    await registry.sendDirect('peer-b', packet);

    expect(withPeer.sendDirect).toHaveBeenCalledWith('peer-b', packet);
    expect(withoutPeer.sendDirect).not.toHaveBeenCalled();
  });

  it('throws when sendDirect targets a peer no active transport currently has', async () => {
    const registry = new TransportRegistry(makeHost());
    await registry.register(makeTransport('bitchat', []));
    await expect(registry.sendDirect('ghost-peer', makePacket())).rejects.toThrow(/No active transport/);
  });

  it('aggregates active peers across all registered transports', async () => {
    const registry = new TransportRegistry(makeHost());
    const peerB: PeerDescriptor = { peerId: 'peer-b', alias: 'B', transportId: 'bitchat', signalStrength: null, lastSeen: 0 };
    const peerC: PeerDescriptor = { peerId: 'peer-c', alias: 'C', transportId: 'lora', signalStrength: -70, lastSeen: 0 };
    await registry.register(makeTransport('bitchat', [peerB]));
    await registry.register(makeTransport('lora', [peerC]));

    expect(registry.getAllActivePeers()).toEqual([peerB, peerC]);
  });
});
