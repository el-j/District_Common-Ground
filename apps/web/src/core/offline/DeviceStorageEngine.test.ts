import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

import { get, set, del } from 'idb-keyval';
import {
  DeviceStorageEngine,
  requestPersistentStorage,
  isStoragePersisted,
  checkStorageQuota,
  isOpfsAvailable,
} from './DeviceStorageEngine';

describe('DeviceStorageEngine', () => {
  it('load/save/clear delegate to idb-keyval with a namespaced key', async () => {
    const engine = new DeviceStorageEngine<{ n: number }>('my-log');

    await engine.save({ n: 1 });
    expect(set).toHaveBeenCalledWith('district-cg-offline-my-log', { n: 1 });

    vi.mocked(get).mockResolvedValueOnce({ n: 1 });
    await expect(engine.load()).resolves.toEqual({ n: 1 });
    expect(get).toHaveBeenCalledWith('district-cg-offline-my-log');

    await engine.clear();
    expect(del).toHaveBeenCalledWith('district-cg-offline-my-log');
  });
});

describe('storage-manager helpers without navigator.storage (node test env)', () => {
  it('all report unsupported/false rather than throwing', async () => {
    await expect(requestPersistentStorage()).resolves.toBe(false);
    await expect(isStoragePersisted()).resolves.toBe(false);
    await expect(checkStorageQuota()).resolves.toEqual({
      usageBytes: null,
      quotaBytes: null,
      usageRatio: null,
      low: false,
    });
    expect(isOpfsAvailable()).toBe(false);
  });
});

describe('storage-manager helpers with a stubbed navigator.storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requestPersistentStorage forwards the browser grant result', async () => {
    vi.stubGlobal('navigator', { storage: { persist: vi.fn().mockResolvedValue(true) } });
    await expect(requestPersistentStorage()).resolves.toBe(true);
  });

  it('requestPersistentStorage fails safe to false when the API throws', async () => {
    vi.stubGlobal('navigator', { storage: { persist: vi.fn().mockRejectedValue(new Error('denied')) } });
    await expect(requestPersistentStorage()).resolves.toBe(false);
  });

  it('checkStorageQuota computes usageRatio and flags low storage above 90%', async () => {
    vi.stubGlobal('navigator', {
      storage: { estimate: vi.fn().mockResolvedValue({ usage: 95, quota: 100 }) },
    });
    const result = await checkStorageQuota();
    expect(result.usageRatio).toBeCloseTo(0.95);
    expect(result.low).toBe(true);
  });

  it('isOpfsAvailable is true only when getDirectory exists', () => {
    vi.stubGlobal('navigator', { storage: { getDirectory: vi.fn() } });
    expect(isOpfsAvailable()).toBe(true);
  });
});

beforeEach(() => {
  vi.mocked(get).mockReset();
  vi.mocked(set).mockReset();
  vi.mocked(del).mockReset();
});
