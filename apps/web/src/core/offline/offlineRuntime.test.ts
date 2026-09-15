import { describe, it, expect, vi, beforeEach } from 'vitest';

const hydrate = vi.fn().mockResolvedValue(undefined);
const append = vi.fn().mockResolvedValue(undefined);

vi.mock('./SignedEventLog', () => ({
  loadOrCreateDeviceIdentity: vi.fn().mockResolvedValue({ keyPair: {}, deviceId: 'device-a' }),
  SignedEventLog: vi.fn().mockImplementation(function SignedEventLogMock() {
    return { hydrate, append };
  }),
}));

import { recordAction, resetOfflineRuntimeForTests } from './offlineRuntime';
import { SignedEventLog } from './SignedEventLog';

/** Flushes the microtask chain a fire-and-forget promise runs on. */
async function flushMicrotasks(times = 3): Promise<void> {
  for (let i = 0; i < times; i += 1) await Promise.resolve();
}

describe('offlineRuntime', () => {
  beforeEach(() => {
    resetOfflineRuntimeForTests();
    vi.mocked(SignedEventLog).mockClear();
    hydrate.mockClear();
    append.mockClear();
  });

  it('lazily creates and hydrates a single shared SignedEventLog, then appends via it', async () => {
    recordAction('SHOP_ITEM_ACQUIRED', { itemId: 'x' });
    await flushMicrotasks();

    expect(SignedEventLog).toHaveBeenCalledTimes(1);
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith('SHOP_ITEM_ACQUIRED', { itemId: 'x' });
  });

  it('reuses the same log instance across multiple recordAction calls', async () => {
    recordAction('SHOP_ITEM_ACQUIRED', {});
    recordAction('IRL_DEED_LOGGED', {});
    await flushMicrotasks();

    expect(SignedEventLog).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(2);
  });

  it('never throws even if appending fails', async () => {
    append.mockRejectedValueOnce(new Error('signing failed'));
    expect(() => recordAction('SHOP_ITEM_ACQUIRED', {})).not.toThrow();
    await flushMicrotasks();
  });
});
