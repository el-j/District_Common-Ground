// M19 — Mesh packet identity and signing. Reuses the exact Ed25519-via-
// crypto.subtle pattern already proven in SignedEventLog.ts (M18) and
// CryptoLedger.ts (M17), with its own IndexedDB key so this identity is
// namespaced separately from the offline-sync device identity and the
// mutual-credit ledger identity.
import { get, set } from 'idb-keyval';
import type { MeshPacket } from '@district-cg/shared-types';

const ED25519 = { name: 'Ed25519' } as const;
const IDENTITY_STORAGE_KEY = 'district-cg-mesh-identity';

export interface MeshIdentity {
  peerId: string;
  keyPair: CryptoKeyPair;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derivePeerId(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  const digest = await crypto.subtle.digest('SHA-256', raw);
  return toHex(digest).slice(0, 16);
}

function packetSigningFields(packet: Omit<MeshPacket, 'signature'>): string {
  return JSON.stringify({
    id: packet.id,
    senderId: packet.senderId,
    recipientId: packet.recipientId,
    channel: packet.channel,
    ttl: packet.ttl,
    timestamp: packet.timestamp,
    payload: packet.payload,
  });
}

export async function signPacket(fields: Omit<MeshPacket, 'signature'>, privateKey: CryptoKey): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(packetSigningFields(fields)));
  const signature = await crypto.subtle.sign(ED25519, privateKey, digest);
  return toBase64(signature);
}

export async function verifyPacketSignature(packet: MeshPacket, publicKey: CryptoKey): Promise<boolean> {
  const { signature, ...fields } = packet;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(packetSigningFields(fields)));
  try {
    return await crypto.subtle.verify(ED25519, publicKey, fromBase64(signature), digest);
  } catch {
    return false;
  }
}

export async function exportPublicKeyBase64(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return toBase64(raw);
}

export async function importPublicKeyBase64(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(base64), ED25519, true, ['verify']);
}

interface StoredIdentity {
  peerId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

/** Loads this device's persisted mesh identity, generating and storing one on first use. */
export async function loadOrCreateMeshIdentity(): Promise<MeshIdentity> {
  const stored = await get<StoredIdentity>(IDENTITY_STORAGE_KEY);
  if (stored) {
    const publicKey = await crypto.subtle.importKey('jwk', stored.publicKeyJwk, ED25519, true, ['verify']);
    const privateKey = await crypto.subtle.importKey('jwk', stored.privateKeyJwk, ED25519, true, ['sign']);
    return { peerId: stored.peerId, keyPair: { publicKey, privateKey } };
  }

  const keyPair = (await crypto.subtle.generateKey(ED25519, true, ['sign', 'verify'])) as CryptoKeyPair;
  const peerId = await derivePeerId(keyPair.publicKey);
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  await set(IDENTITY_STORAGE_KEY, { peerId, publicKeyJwk, privateKeyJwk } satisfies StoredIdentity);
  return { peerId, keyPair };
}
