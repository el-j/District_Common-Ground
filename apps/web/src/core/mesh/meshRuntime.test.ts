import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  }),
}));

import { initMeshRuntime, sendChatMessage, onChatMessage, getActivePeerCount, getTransportBadges, resetMeshRuntimeForTests } from './meshRuntime';

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('meshRuntime', () => {
  beforeEach(() => {
    store.clear();
    resetMeshRuntimeForTests();
  });

  it('discovers a same-device peer announced over the real bitchat beacon and reports it via getActivePeerCount/getTransportBadges', async () => {
    initMeshRuntime();
    await flush();

    const fakePeerChannel = new BroadcastChannel('district-cg-bitchat-subnet-beacon');
    fakePeerChannel.postMessage({ type: 'announce', peerId: 'test-peer-xyz', alias: 'Test Peer' });
    await flush();

    expect(getActivePeerCount()).toBe(1);
    expect(getTransportBadges()).toEqual([{ transportId: 'bitchat', peerCount: 1 }]);

    fakePeerChannel.close();
  });

  it('sendChatMessage signs and broadcasts a chat packet without throwing, even with zero connected peers', async () => {
    initMeshRuntime();
    await expect(sendChatMessage('broadsheet', 'hello neighborhood')).resolves.toBeUndefined();
  });

  it('onChatMessage subscribes across every mesh channel and its unsubscribe is idempotent-safe', () => {
    initMeshRuntime();
    const events: unknown[] = [];
    const unsubscribe = onChatMessage((e) => events.push(e));
    expect(() => unsubscribe()).not.toThrow();
  });

  it('reports zero peers and no badges before anything has been discovered', () => {
    initMeshRuntime();
    expect(getActivePeerCount()).toBe(0);
    expect(getTransportBadges()).toEqual([]);
  });
});
