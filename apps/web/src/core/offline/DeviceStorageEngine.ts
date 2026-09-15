// M18 — local-first device storage. IndexedDB (via idb-keyval, same library
// apps/web/src/core/state/persistence.ts already uses) is the storage engine
// on every target this game actually ships to today; OPFS is only ever used
// as an availability signal here, not a second storage backend — nothing in
// this codebase needs OPFS's byte-range file semantics yet, so building a
// bespoke OPFS schema alongside IndexedDB would be speculative. When it's
// unavailable (most browsers, and every current test environment) storage
// falls back to IndexedDB-only, which is already this app's baseline.
import { get, set, del } from 'idb-keyval';

const KEY_PREFIX = 'district-cg-offline-';

export interface StorageQuotaInfo {
  usageBytes: number | null;
  quotaBytes: number | null;
  usageRatio: number | null;
  /** True once usage crosses 90% of quota — the game should warn the player. */
  low: boolean;
}

function hasStorageManager(): boolean {
  return typeof navigator !== 'undefined' && 'storage' in navigator && navigator.storage != null;
}

/** Requests the browser's Persistent Storage grant so IndexedDB survives eviction under pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!hasStorageManager() || typeof navigator.storage.persist !== 'function') return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  if (!hasStorageManager() || typeof navigator.storage.persisted !== 'function') return false;
  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

export async function checkStorageQuota(): Promise<StorageQuotaInfo> {
  if (!hasStorageManager() || typeof navigator.storage.estimate !== 'function') {
    return { usageBytes: null, quotaBytes: null, usageRatio: null, low: false };
  }
  try {
    const { usage, quota } = await navigator.storage.estimate();
    const usageBytes = usage ?? null;
    const quotaBytes = quota ?? null;
    const usageRatio = usageBytes != null && quotaBytes ? usageBytes / quotaBytes : null;
    return { usageBytes, quotaBytes, usageRatio, low: usageRatio != null && usageRatio > 0.9 };
  } catch {
    return { usageBytes: null, quotaBytes: null, usageRatio: null, low: false };
  }
}

/** True only when the OPFS root directory handle is actually reachable — feature detection, not a second backend. */
export function isOpfsAvailable(): boolean {
  return hasStorageManager() && typeof (navigator.storage as { getDirectory?: unknown }).getDirectory === 'function';
}

/** A small typed IndexedDB-backed key/value slot, namespaced under the offline-storage prefix. */
export class DeviceStorageEngine<T> {
  private readonly fullKey: string;

  constructor(key: string) {
    this.fullKey = `${KEY_PREFIX}${key}`;
  }

  async load(): Promise<T | undefined> {
    return get<T>(this.fullKey);
  }

  async save(value: T): Promise<void> {
    await set(this.fullKey, value);
  }

  async clear(): Promise<void> {
    await del(this.fullKey);
  }
}
