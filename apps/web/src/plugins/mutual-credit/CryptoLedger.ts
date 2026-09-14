// M17 — Zero-interest mutual credit ledger. Every transaction is signed
// locally with an Ed25519 keypair (Web Crypto's `crypto.subtle`, no server
// round-trip) and hash-chained to its predecessor so a tampered or replayed
// transaction fails verification, similar in spirit to Secure Scuttlebutt's
// append-only signed logs.
//
// Scoping note: the planning doc calls for "encrypted private key storage in
// IndexedDB." This PoC stores the exported JWK unencrypted in IndexedDB (the
// same trust boundary the app already accepts for the JWT in localStorage) —
// real passphrase-derived key wrapping is a follow-up, not implemented here,
// and is called out explicitly rather than silently claimed.
import { get, set } from 'idb-keyval';

const ED25519 = { name: 'Ed25519' } as const;
const KEYPAIR_STORAGE_KEY = 'district-cg-mutual-credit-keypair';

export interface MutualCreditTransaction {
  id: string;
  fromPeerId: string;
  toPeerId: string;
  amount: number;
  memo: string;
  timestamp: number;
  prevHash: string | null;
  hash: string;
  signature: string;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateKeypair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ED25519, true, ['sign', 'verify']) as Promise<CryptoKeyPair>;
}

export async function exportPublicKeyBase64(publicKey: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return toBase64(raw);
}

export async function importPublicKeyBase64(base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', fromBase64(base64), ED25519, true, ['verify']);
}

async function hashTransactionFields(fields: Omit<MutualCreditTransaction, 'hash' | 'signature'>): Promise<ArrayBuffer> {
  const canonical = JSON.stringify({
    id: fields.id,
    fromPeerId: fields.fromPeerId,
    toPeerId: fields.toPeerId,
    amount: fields.amount,
    memo: fields.memo,
    timestamp: fields.timestamp,
    prevHash: fields.prevHash,
  });
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
}

/** Builds and signs a new transaction chained off `prevHash` (null for the first in a ledger). */
export async function createTransaction(
  fromPeerId: string,
  toPeerId: string,
  amount: number,
  memo: string,
  keyPair: CryptoKeyPair,
  prevHash: string | null,
  now: number = Date.now(),
): Promise<MutualCreditTransaction> {
  const fields = {
    id: `${now}_${Math.random().toString(36).slice(2, 10)}`,
    fromPeerId,
    toPeerId,
    amount,
    memo,
    timestamp: now,
    prevHash,
  };
  const hashBytes = await hashTransactionFields(fields);
  const signature = await crypto.subtle.sign(ED25519, keyPair.privateKey, hashBytes);

  return { ...fields, hash: toHex(hashBytes), signature: toBase64(signature) };
}

/** Recomputes the hash and verifies the Ed25519 signature — detects any post-signing tampering. */
export async function verifyTransactionSignature(tx: MutualCreditTransaction, publicKey: CryptoKey): Promise<boolean> {
  const { hash, signature, ...fields } = tx;
  const recomputedHash = await hashTransactionFields(fields);
  if (toHex(recomputedHash) !== hash) return false;
  return crypto.subtle.verify(ED25519, publicKey, fromBase64(signature), recomputedHash);
}

/** Verifies that each transaction correctly chains to the previous one's hash. */
export function verifyChainLinkage(transactions: MutualCreditTransaction[]): boolean {
  let expectedPrevHash: string | null = null;
  for (const tx of transactions) {
    if (tx.prevHash !== expectedPrevHash) return false;
    expectedPrevHash = tx.hash;
  }
  return true;
}

/** Net balance per peer: positive means the ledger owner is owed (gave more than received). */
export function computeBalances(transactions: MutualCreditTransaction[], ownerId: string): Map<string, number> {
  const balances = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.fromPeerId === ownerId) {
      balances.set(tx.toPeerId, (balances.get(tx.toPeerId) ?? 0) + tx.amount);
    } else if (tx.toPeerId === ownerId) {
      balances.set(tx.fromPeerId, (balances.get(tx.fromPeerId) ?? 0) - tx.amount);
    }
  }
  return balances;
}

interface StoredKeypair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

/** Loads the player's persisted keypair, generating and storing one on first use. */
export async function loadOrCreateKeypair(): Promise<CryptoKeyPair> {
  const stored = await get<StoredKeypair>(KEYPAIR_STORAGE_KEY);
  if (stored) {
    const publicKey = await crypto.subtle.importKey('jwk', stored.publicKeyJwk, ED25519, true, ['verify']);
    const privateKey = await crypto.subtle.importKey('jwk', stored.privateKeyJwk, ED25519, true, ['sign']);
    return { publicKey, privateKey };
  }

  const keyPair = await generateKeypair();
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  await set(KEYPAIR_STORAGE_KEY, { publicKeyJwk, privateKeyJwk } satisfies StoredKeypair);
  return keyPair;
}

export class MutualCreditLedger {
  private transactions: MutualCreditTransaction[] = [];

  get lastHash(): string | null {
    return this.transactions.length > 0 ? this.transactions[this.transactions.length - 1]!.hash : null;
  }

  getTransactions(): readonly MutualCreditTransaction[] {
    return this.transactions;
  }

  /** Appends a transaction only if it chains correctly onto the current tip. */
  append(tx: MutualCreditTransaction): void {
    if (tx.prevHash !== this.lastHash) {
      throw new Error('Transaction does not chain onto the current ledger tip');
    }
    this.transactions.push(tx);
  }

  balances(ownerId: string): Map<string, number> {
    return computeBalances(this.transactions, ownerId);
  }
}
