import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SignedActionDelta } from '@district-cg/shared-types';
import { SyncQueueService, type SyncTransport } from './SyncQueueService';

function makeDelta(id: string): SignedActionDelta {
  return {
    id,
    deviceId: 'device-a',
    sequence: 1,
    timestamp: Date.now(),
    vectorClock: { 'device-a': 1 },
    actionType: 'SHOP_ITEM_ACQUIRED',
    payload: {},
    prevHash: null,
    hash: 'h',
    signature: 's',
  };
}

describe('SyncQueueService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flush() sends all pending deltas and clears the queue on success', async () => {
    const send = vi.fn().mockResolvedValue({ deltas: [], vectorClock: {} });
    const onRemote = vi.fn();
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({ 'device-a': 1 }), onRemote);

    service.enqueue(makeDelta('1'));
    service.enqueue(makeDelta('2'));
    await service.flush();

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![0]).toHaveLength(2);
    expect(service.pendingCount).toBe(0);
  });

  it('flush() is a no-op while offline', async () => {
    const send = vi.fn();
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({}), vi.fn());
    service.setOnline(false);
    service.enqueue(makeDelta('1'));
    await service.flush();
    expect(send).not.toHaveBeenCalled();
    expect(service.pendingCount).toBe(1);
  });

  it('forwards remote deltas + vector clock returned by the transport to onRemoteDeltas', async () => {
    const remoteDeltas = [makeDelta('remote-1')];
    const send = vi.fn().mockResolvedValue({ deltas: remoteDeltas, vectorClock: { 'device-b': 3 } });
    const onRemote = vi.fn();
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({}), onRemote);
    service.enqueue(makeDelta('1'));
    await service.flush();
    expect(onRemote).toHaveBeenCalledWith(remoteDeltas, { 'device-b': 3 });
  });

  it('retains only deltas enqueued after a successful flush started (no data loss on concurrent enqueue)', async () => {
    let resolveSend!: (v: { deltas: SignedActionDelta[]; vectorClock: Record<string, number> }) => void;
    const send = vi.fn(() => new Promise<{ deltas: SignedActionDelta[]; vectorClock: Record<string, number> }>(res => { resolveSend = res; }));
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({}), vi.fn());

    service.enqueue(makeDelta('1'));
    const flushPromise = service.flush();
    const second = makeDelta('2');
    service.enqueue(second); // arrives mid-flight, must not be lost or double-sent
    resolveSend({ deltas: [], vectorClock: {} });
    await flushPromise;

    expect(service.pendingCount).toBe(1);
    send.mockResolvedValue({ deltas: [], vectorClock: {} });
    await service.flush();
    expect(send).toHaveBeenNthCalledWith(2, [second], {});
  });

  it('retries with exponential backoff on transport failure, then succeeds once the network recovers', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ deltas: [], vectorClock: {} });
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({}), vi.fn(), { baseDelayMs: 100, maxDelayMs: 10_000 });

    service.enqueue(makeDelta('1'));
    await service.flush(); // 1st attempt fails, schedules retry at 100ms
    expect(service.retryAttempt).toBe(1);

    await vi.advanceTimersByTimeAsync(100); // 2nd attempt fails, schedules retry at 200ms
    expect(service.retryAttempt).toBe(2);

    await vi.advanceTimersByTimeAsync(200); // 3rd attempt succeeds
    expect(service.retryAttempt).toBe(0);
    expect(service.pendingCount).toBe(0);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('coming back online after being offline immediately flushes the pending queue', async () => {
    const send = vi.fn().mockResolvedValue({ deltas: [], vectorClock: {} });
    const service = new SyncQueueService({ send } satisfies SyncTransport, () => ({}), vi.fn());

    service.setOnline(false);
    service.enqueue(makeDelta('1'));
    expect(send).not.toHaveBeenCalled();

    service.setOnline(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
