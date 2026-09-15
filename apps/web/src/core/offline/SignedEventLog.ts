// M18 — append-only, Ed25519-signed, SHA-256 hash-chained local action log.
// Same crypto.subtle pattern as packages/plugin-mutual-credit/src/CryptoLedger.ts
// (proven to work under this repo's Node-environment Vitest run), applied to
// the general SignedActionDelta shape from docs/planning/18-....md instead of
// mutual-credit transactions specifically. Deliberately a separate keypair
// and IndexedDB key from the mutual-credit ledger's — a leaked/rotated device
// identity for one shouldn't affect the other.
import type { SignedActionDelta, SyncActionType, VectorClock } from '@district-cg/shared-types';
import { DeviceStorageEngine } from './DeviceStorageEngine';
import { merge } from './VectorClockManager';

const ED25519 = { name: 'Ed25519' } as const;
const KEYPAIR_KEY = 'event-log-device-identity';

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
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

interface StoredDeviceIdentity {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  deviceId: string;
}

export interface DeviceIdentity {
  keyPair: CryptoKeyPair;
  deviceId: string;
}

async function hashDeltaFields(fields: Omit<SignedActionDelta, 'hash' | 'signature'>): Promise<ArrayBuffer> {
  const canonical = JSON.stringify({
    id: fields.id,
    deviceId: fields.deviceId,
    sequence: fields.sequence,
    timestamp: fields.timestamp,
    vectorClock: fields.vectorClock,
    actionType: fields.actionType,
    payload: fields.payload,
    prevHash: fields.prevHash,
  });
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
}

/** Builds and signs a new delta, chained off `prevHash` (null for the very first entry in a device's log). */
export async function createSignedDelta(
  deviceId: string,
  sequence: number,
  vectorClock: VectorClock,
  actionType: SyncActionType,
  payload: Record<string, unknown>,
  keyPair: CryptoKeyPair,
  prevHash: string | null,
  now: number = Date.now(),
): Promise<SignedActionDelta> {
  const fields = {
    id: `${now}_${Math.random().toString(36).slice(2, 10)}`,
    deviceId,
    sequence,
    timestamp: now,
    vectorClock,
    actionType,
    payload,
    prevHash,
  };
  const hashBytes = await hashDeltaFields(fields);
  const signature = await crypto.subtle.sign(ED25519, keyPair.privateKey, hashBytes);
  return { ...fields, hash: toHex(hashBytes), signature: toBase64(signature) };
}

/** Recomputes the hash and checks the Ed25519 signature — detects any post-signing tampering. */
export async function verifyDeltaSignature(delta: SignedActionDelta, publicKey: CryptoKey): Promise<boolean> {
  const { hash, signature, ...fields } = delta;
  const recomputed = await hashDeltaFields(fields);
  if (toHex(recomputed) !== hash) return false;
  return crypto.subtle.verify(ED25519, publicKey, fromBase64(signature), recomputed);
}

/** Verifies every entry correctly chains onto the one before it. */
export function verifyChainLinkage(deltas: SignedActionDelta[]): boolean {
  let expectedPrevHash: string | null = null;
  for (const delta of deltas) {
    if (delta.prevHash !== expectedPrevHash) return false;
    expectedPrevHash = delta.hash;
  }
  return true;
}

/** Loads this device's persisted identity, generating and storing one (with a derived short deviceId) on first use. */
export async function loadOrCreateDeviceIdentity(): Promise<DeviceIdentity> {
  const storage = new DeviceStorageEngine<StoredDeviceIdentity>(KEYPAIR_KEY);
  const stored = await storage.load();
  if (stored) {
    const publicKey = await crypto.subtle.importKey('jwk', stored.publicKeyJwk, ED25519, true, ['verify']);
    const privateKey = await crypto.subtle.importKey('jwk', stored.privateKeyJwk, ED25519, true, ['sign']);
    return { keyPair: { publicKey, privateKey }, deviceId: stored.deviceId };
  }

  const keyPair = (await crypto.subtle.generateKey(ED25519, true, ['sign', 'verify'])) as CryptoKeyPair;
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const deviceId = toHex(await crypto.subtle.digest('SHA-256', publicRaw)).slice(0, 16);
  await storage.save({ publicKeyJwk, privateKeyJwk, deviceId });
  return { keyPair, deviceId };
}

/**
 * This device's append-only signed action log. `append()` auto-increments the
 * local sequence and stamps a vector clock merging any remote knowledge folded
 * in via `mergeRemoteClock` — so deltas this device produces after reconciling
 * with a peer/gateway correctly reflect causal knowledge of that peer's state.
 */
export class SignedEventLog {
  private deltas: SignedActionDelta[] = [];
  private sequence = 0;
  private knownClock: VectorClock = {};
  private readonly storage = new DeviceStorageEngine<SignedActionDelta[]>('event-log');

  constructor(
    private readonly deviceId: string,
    private readonly keyPair: CryptoKeyPair,
  ) {}

  get lastHash(): string | null {
    return this.deltas.length > 0 ? this.deltas[this.deltas.length - 1]!.hash : null;
  }

  get localVectorClock(): VectorClock {
    return { ...this.knownClock, [this.deviceId]: this.sequence };
  }

  getDeltas(): readonly SignedActionDelta[] {
    return this.deltas;
  }

  /** Restores previously-persisted deltas from IndexedDB (call once at boot). */
  async hydrate(): Promise<void> {
    const saved = await this.storage.load();
    if (saved && saved.length > 0) {
      this.deltas = saved;
      this.sequence = saved[saved.length - 1]!.sequence;
      for (const delta of saved) this.knownClock = merge(this.knownClock, delta.vectorClock);
    }
  }

  /** Folds in vector-clock knowledge learned from a sync exchange, without appending a delta. */
  mergeRemoteClock(remote: VectorClock): void {
    this.knownClock = merge(this.knownClock, remote);
  }

  async append(actionType: SyncActionType, payload: Record<string, unknown>): Promise<SignedActionDelta> {
    this.sequence += 1;
    const vectorClock = this.localVectorClock;
    const delta = await createSignedDelta(
      this.deviceId,
      this.sequence,
      vectorClock,
      actionType,
      payload,
      this.keyPair,
      this.lastHash,
    );
    this.deltas.push(delta);
    await this.storage.save(this.deltas);
    return delta;
  }
}
