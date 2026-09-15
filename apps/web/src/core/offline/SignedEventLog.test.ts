import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __store: store,
  };
});

import {
  createSignedDelta,
  verifyDeltaSignature,
  verifyChainLinkage,
  loadOrCreateDeviceIdentity,
  SignedEventLog,
} from './SignedEventLog';

async function makeKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
}

describe('createSignedDelta / verifyDeltaSignature', () => {
  it('signs a delta and verifies successfully against the matching public key', async () => {
    const keyPair = await makeKeyPair();
    const delta = await createSignedDelta(
      'device-a',
      1,
      { 'device-a': 1 },
      'COMMONS_RESOURCE_CONTRIBUTION',
      { node: 'toolLibraryProgress', amount: 5 },
      keyPair,
      null,
    );
    await expect(verifyDeltaSignature(delta, keyPair.publicKey)).resolves.toBe(true);
  });

  it('fails verification when the payload is tampered with after signing', async () => {
    const keyPair = await makeKeyPair();
    const delta = await createSignedDelta('device-a', 1, { 'device-a': 1 }, 'SHOP_ITEM_ACQUIRED', { itemId: 'x' }, keyPair, null);
    const tampered = { ...delta, payload: { itemId: 'stolen' } };
    await expect(verifyDeltaSignature(tampered, keyPair.publicKey)).resolves.toBe(false);
  });

  it('fails verification against an unrelated keypair', async () => {
    const keyPair = await makeKeyPair();
    const otherKeyPair = await makeKeyPair();
    const delta = await createSignedDelta('device-a', 1, {}, 'IRL_DEED_LOGGED', {}, keyPair, null);
    await expect(verifyDeltaSignature(delta, otherKeyPair.publicKey)).resolves.toBe(false);
  });
});

describe('verifyChainLinkage', () => {
  it('accepts a correctly chained sequence and rejects a reordered/broken one', async () => {
    const keyPair = await makeKeyPair();
    const d1 = await createSignedDelta('a', 1, { a: 1 }, 'SHOP_ITEM_ACQUIRED', {}, keyPair, null);
    const d2 = await createSignedDelta('a', 2, { a: 2 }, 'SHOP_ITEM_ACQUIRED', {}, keyPair, d1.hash);
    const d3 = await createSignedDelta('a', 3, { a: 3 }, 'SHOP_ITEM_ACQUIRED', {}, keyPair, d2.hash);

    expect(verifyChainLinkage([d1, d2, d3])).toBe(true);
    expect(verifyChainLinkage([d1, d3, d2])).toBe(false);
    expect(verifyChainLinkage([d2, d3])).toBe(false);
  });
});

describe('loadOrCreateDeviceIdentity', () => {
  it('generates and persists an identity on first call, then returns the same one', async () => {
    const first = await loadOrCreateDeviceIdentity();
    const second = await loadOrCreateDeviceIdentity();
    expect(second.deviceId).toBe(first.deviceId);
  });
});

describe('SignedEventLog', () => {
  it('append() increments sequence, chains hashes, and persists across a new instance via hydrate()', async () => {
    const keyPair = await makeKeyPair();
    const log = new SignedEventLog('device-x', keyPair);

    const d1 = await log.append('COMMONS_RESOURCE_CONTRIBUTION', { amount: 3 });
    const d2 = await log.append('COMMONS_RESOURCE_CONTRIBUTION', { amount: 4 });

    expect(d1.sequence).toBe(1);
    expect(d2.sequence).toBe(2);
    expect(d2.prevHash).toBe(d1.hash);
    expect(log.localVectorClock).toEqual({ 'device-x': 2 });
    expect(verifyChainLinkage(log.getDeltas() as never[])).toBe(true);

    const rehydrated = new SignedEventLog('device-x', keyPair);
    await rehydrated.hydrate();
    expect(rehydrated.getDeltas()).toHaveLength(2);
    expect(rehydrated.localVectorClock).toEqual({ 'device-x': 2 });
  });

  it('mergeRemoteClock folds remote entries into subsequent appended deltas', async () => {
    const keyPair = await makeKeyPair();
    const log = new SignedEventLog('device-y', keyPair);
    log.mergeRemoteClock({ 'device-z': 7 });

    const delta = await log.append('IRL_DEED_LOGGED', {});
    expect(delta.vectorClock).toEqual({ 'device-y': 1, 'device-z': 7 });
  });
});

beforeEach(async () => {
  const idb = await import('idb-keyval');
  (idb as unknown as { __store: Map<string, unknown> }).__store.clear();
});
