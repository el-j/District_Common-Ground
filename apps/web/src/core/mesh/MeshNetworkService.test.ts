import { describe, it, expect, vi } from 'vitest';
import type { MeshPacket, PeerDescriptor } from '@district-cg/shared-types';
import { MeshNetworkService } from './MeshNetworkService';

function makePacket(overrides: Partial<MeshPacket> = {}): MeshPacket {
  return {
    id: 'pkt-1',
    senderId: 'peer-a',
    recipientId: null,
    channel: 'broadsheet',
    ttl: 2,
    timestamp: 1000,
    payload: 'hello neighborhood',
    signature: 'unsigned-in-this-test',
    ...overrides,
  };
}

describe('MeshNetworkService', () => {
  it('dispatches a received packet to subscribers of its channel only', async () => {
    const service = new MeshNetworkService();
    const broadsheetHandler = vi.fn();
    const whisperHandler = vi.fn();
    service.subscribe('broadsheet', broadsheetHandler);
    service.subscribe('whisper', whisperHandler);

    await service.onPacketReceived(makePacket());

    expect(broadsheetHandler).toHaveBeenCalledTimes(1);
    expect(whisperHandler).not.toHaveBeenCalled();
  });

  it('Test 19.3 (Multi-Hop Relay): decrements TTL and relays once, then drops the duplicate re-arrival', async () => {
    const service = new MeshNetworkService();
    const relay = vi.fn().mockResolvedValue(undefined);
    service.setRelay(relay);

    await service.onPacketReceived(makePacket({ ttl: 2 }));

    expect(relay).toHaveBeenCalledTimes(1);
    expect(relay).toHaveBeenCalledWith(expect.objectContaining({ ttl: 1 }));

    // Simulate the packet bouncing back unchanged (a naive neighbor re-broadcasting it) —
    // deduped by id, so it must not be relayed again.
    await service.onPacketReceived(makePacket({ ttl: 2 }));
    expect(relay).toHaveBeenCalledTimes(1);
  });

  it('does not relay once TTL has been exhausted', async () => {
    const service = new MeshNetworkService();
    const relay = vi.fn().mockResolvedValue(undefined);
    service.setRelay(relay);

    await service.onPacketReceived(makePacket({ id: 'pkt-ttl-0', ttl: 0 }));

    expect(relay).not.toHaveBeenCalled();
  });

  it('rejects a packet whose signature fails verification against a known sender key', async () => {
    const service = new MeshNetworkService();
    const handler = vi.fn();
    service.subscribe('broadsheet', handler);
    // A CryptoKey we can't actually satisfy verification against without a real signature —
    // registering any key for the sender means an "unsigned-in-this-test" signature must fail.
    const keyPair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    service.registerPeerPublicKey('peer-a', keyPair.publicKey);

    await service.onPacketReceived(makePacket());

    expect(handler).not.toHaveBeenCalled();
  });

  it('tracks and forgets peers via onPeerDiscovered/onPeerLost', () => {
    const service = new MeshNetworkService();
    const peer: PeerDescriptor = { peerId: 'peer-b', alias: 'Neighbor B', transportId: 'bitchat', signalStrength: -60, lastSeen: 1000 };
    service.onPeerDiscovered(peer);
    expect(service.getPeers()).toEqual([peer]);
    service.onPeerLost('peer-b');
    expect(service.getPeers()).toEqual([]);
  });

  it('evicts the oldest packet id once the dedupe cache exceeds its configured size', async () => {
    const service = new MeshNetworkService({ dedupeCacheSize: 2 });
    const relay = vi.fn().mockResolvedValue(undefined);
    service.setRelay(relay);

    await service.onPacketReceived(makePacket({ id: 'a', ttl: 1 }));
    await service.onPacketReceived(makePacket({ id: 'b', ttl: 1 }));
    await service.onPacketReceived(makePacket({ id: 'c', ttl: 1 }));
    // 'a' should have been evicted, so it is treated as new again and relayed.
    await service.onPacketReceived(makePacket({ id: 'a', ttl: 1 }));

    expect(relay).toHaveBeenCalledTimes(4);
  });
});
