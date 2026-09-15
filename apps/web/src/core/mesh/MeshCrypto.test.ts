import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  }),
}));

import { loadOrCreateMeshIdentity, signPacket, verifyPacketSignature, exportPublicKeyBase64, importPublicKeyBase64 } from './MeshCrypto';
import type { MeshPacket } from '@district-cg/shared-types';

function baseFields(): Omit<MeshPacket, 'signature'> {
  return { id: 'p1', senderId: 'peer-a', recipientId: null, channel: 'broadsheet', ttl: 3, timestamp: 1000, payload: 'hello' };
}

describe('MeshCrypto', () => {
  beforeEach(() => store.clear());

  it('generates a stable peerId and reuses the same identity on subsequent loads', async () => {
    const first = await loadOrCreateMeshIdentity();
    const second = await loadOrCreateMeshIdentity();
    expect(second.peerId).toBe(first.peerId);
    expect(first.peerId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('signs a packet and verifies it against the correct public key', async () => {
    const identity = await loadOrCreateMeshIdentity();
    const fields = baseFields();
    const signature = await signPacket(fields, identity.keyPair.privateKey);
    const packet: MeshPacket = { ...fields, signature };
    await expect(verifyPacketSignature(packet, identity.keyPair.publicKey)).resolves.toBe(true);
  });

  it('rejects a signature after the payload has been tampered with', async () => {
    const identity = await loadOrCreateMeshIdentity();
    const fields = baseFields();
    const signature = await signPacket(fields, identity.keyPair.privateKey);
    const tampered: MeshPacket = { ...fields, payload: 'tampered', signature };
    await expect(verifyPacketSignature(tampered, identity.keyPair.publicKey)).resolves.toBe(false);
  });

  it('rejects a signature verified against the wrong keypair', async () => {
    const identity = await loadOrCreateMeshIdentity();
    store.clear();
    const other = await loadOrCreateMeshIdentity();
    const fields = baseFields();
    const signature = await signPacket(fields, identity.keyPair.privateKey);
    const packet: MeshPacket = { ...fields, signature };
    await expect(verifyPacketSignature(packet, other.keyPair.publicKey)).resolves.toBe(false);
  });

  it('round-trips a public key through base64 export/import', async () => {
    const identity = await loadOrCreateMeshIdentity();
    const base64 = await exportPublicKeyBase64(identity.keyPair.publicKey);
    const imported = await importPublicKeyBase64(base64);
    const fields = baseFields();
    const signature = await signPacket(fields, identity.keyPair.privateKey);
    await expect(verifyPacketSignature({ ...fields, signature }, imported)).resolves.toBe(true);
  });
});
