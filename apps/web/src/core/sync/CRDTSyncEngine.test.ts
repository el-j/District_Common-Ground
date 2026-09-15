import { describe, it, expect } from 'vitest';
import type { SignedActionDelta } from '@district-cg/shared-types';
import { dedupeDeltas, mergePnCounter, mergePnCountersByNode, resolveLwwParcels, resolveOrSet } from './CRDTSyncEngine';

function makeDelta(overrides: Partial<SignedActionDelta>): SignedActionDelta {
  return {
    id: overrides.id ?? Math.random().toString(36),
    deviceId: 'device-a',
    sequence: 1,
    timestamp: Date.now(),
    vectorClock: { 'device-a': 1 },
    actionType: 'COMMONS_RESOURCE_CONTRIBUTION',
    payload: {},
    prevHash: null,
    hash: 'hash',
    signature: 'sig',
    ...overrides,
  };
}

describe('dedupeDeltas', () => {
  it('unions multiple streams and drops duplicate ids', () => {
    const a = makeDelta({ id: '1' });
    const b = makeDelta({ id: '2' });
    const bDupe = makeDelta({ id: '2' });
    expect(dedupeDeltas([a, b], [bDupe])).toHaveLength(2);
  });
});

describe('mergePnCounter — Test 18.4 (CRDT merge without loss)', () => {
  it('additively sums two devices\' 10-day-disconnected solidarity contributions with zero data loss', () => {
    const deviceADeltas: SignedActionDelta[] = Array.from({ length: 10 }, (_, day) =>
      makeDelta({
        id: `a-${day}`,
        deviceId: 'device-a',
        sequence: day + 1,
        vectorClock: { 'device-a': day + 1 },
        payload: { node: 'toolLibraryProgress', amount: 5 },
      }),
    );
    const deviceBDeltas: SignedActionDelta[] = Array.from({ length: 10 }, (_, day) =>
      makeDelta({
        id: `b-${day}`,
        deviceId: 'device-b',
        sequence: day + 1,
        vectorClock: { 'device-b': day + 1 },
        payload: { node: 'toolLibraryProgress', amount: 3 },
      }),
    );

    const merged = dedupeDeltas(deviceADeltas, deviceBDeltas);
    expect(mergePnCounter(merged, 'toolLibraryProgress')).toBe(10 * 5 + 10 * 3);

    // Re-merging (simulating a retried sync round delivering the same deltas again)
    // must not double-count — the whole point of a PN-Counter over a signed-id set.
    const reMerged = dedupeDeltas(merged, deviceADeltas, deviceBDeltas);
    expect(mergePnCounter(reMerged, 'toolLibraryProgress')).toBe(10 * 5 + 10 * 3);
  });

  it('ignores contributions to other nodes and non-contribution action types', () => {
    const deltas = [
      makeDelta({ id: '1', payload: { node: 'toolLibraryProgress', amount: 5 } }),
      makeDelta({ id: '2', payload: { node: 'landTrustProgress', amount: 8 } }),
      makeDelta({ id: '3', actionType: 'IRL_DEED_LOGGED', payload: { node: 'toolLibraryProgress', amount: 100 } }),
    ];
    expect(mergePnCounter(deltas, 'toolLibraryProgress')).toBe(5);
  });

  it('mergePnCountersByNode groups totals across every node present', () => {
    const deltas = [
      makeDelta({ id: '1', payload: { node: 'toolLibraryProgress', amount: 5 } }),
      makeDelta({ id: '2', payload: { node: 'landTrustProgress', amount: 8 } }),
      makeDelta({ id: '3', payload: { node: 'toolLibraryProgress', amount: 2 } }),
    ];
    expect(mergePnCountersByNode(deltas)).toEqual({ toolLibraryProgress: 7, landTrustProgress: 8 });
  });
});

describe('resolveLwwParcels', () => {
  it('picks the delta with the higher Lamport timestamp (max vector-clock component) per plot', () => {
    const early = makeDelta({ id: '1', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 2 }, payload: { plotId: 'p1', stage: 1 } });
    const late = makeDelta({ id: '2', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 5 }, payload: { plotId: 'p1', stage: 2 } });
    const winners = resolveLwwParcels([late, early]);
    expect(winners.get('p1')).toBe(late);
  });

  it('is deterministic regardless of merge order — converges to the same winner either way', () => {
    const a = makeDelta({ id: '1', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 3 }, payload: { plotId: 'p1' } });
    const b = makeDelta({ id: '2', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 3 }, deviceId: 'device-z', payload: { plotId: 'p1' } });
    expect(resolveLwwParcels([a, b]).get('p1')).toBe(resolveLwwParcels([b, a]).get('p1'));
  });

  it('breaks a tied Lamport timestamp using deviceId as a deterministic tiebreaker', () => {
    const a = makeDelta({ id: '1', actionType: 'PARCEL_STAGE_ADVANCE', deviceId: 'aaa', vectorClock: { a: 3 }, payload: { plotId: 'p1' } });
    const z = makeDelta({ id: '2', actionType: 'PARCEL_STAGE_ADVANCE', deviceId: 'zzz', vectorClock: { a: 3 }, payload: { plotId: 'p1' } });
    expect(resolveLwwParcels([a, z]).get('p1')).toBe(z);
  });

  it('resolves each plotId independently', () => {
    const p1 = makeDelta({ id: '1', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 1 }, payload: { plotId: 'p1' } });
    const p2 = makeDelta({ id: '2', actionType: 'PARCEL_STAGE_ADVANCE', vectorClock: { a: 1 }, payload: { plotId: 'p2' } });
    const winners = resolveLwwParcels([p1, p2]);
    expect(winners.size).toBe(2);
  });
});

describe('resolveOrSet', () => {
  it('unions IRL deeds/badges by id and drops duplicates, sorted by timestamp', () => {
    const deeds = [
      makeDelta({ id: '2', actionType: 'IRL_DEED_LOGGED', timestamp: 200 }),
      makeDelta({ id: '1', actionType: 'IRL_DEED_LOGGED', timestamp: 100 }),
      makeDelta({ id: '1', actionType: 'IRL_DEED_LOGGED', timestamp: 100 }), // duplicate delivery
      makeDelta({ id: '3', actionType: 'SHOP_ITEM_ACQUIRED', timestamp: 50 }),
    ];
    const resolved = resolveOrSet(deeds, 'IRL_DEED_LOGGED');
    expect(resolved.map(d => d.id)).toEqual(['1', '2']);
  });
});
