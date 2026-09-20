import { describe, it, expect, vi } from 'vitest';
import type { DistrictSnapshot } from '@district-cg/shared-types';
import { ProximityVisiting, buildLocalDistrictSnapshot, type ProximityVisitPayload } from './ProximityVisiting';

const SNAPSHOT: DistrictSnapshot = {
  handle: 'Pip',
  day: 12,
  resilienceScore: 42,
  activeCrisis: null,
  commons: { solarGridProgress: 10, kitchenProgress: 20, legalFundProgress: 0, toolLibraryProgress: 5, landTrustProgress: 0 },
};

/** Wires two ProximityVisiting instances together as if they were 2 real
 *  peers exchanging packets directly — no real mesh transport needed,
 *  since the class only depends on the injected sendToPeer/subscribe shape
 *  TransportRegistry.test.ts already establishes as this project's
 *  standard mocking style for mesh code. */
function wireTwoPeers(aVisitable: boolean, bVisitable: boolean) {
  let a!: ProximityVisiting;
  let b!: ProximityVisiting;
  a = new ProximityVisiting({
    sendToPeer: async (_peerId, payload) => { b.handleIncomingPayload('peer-a', JSON.stringify(payload)); },
    isLocallyVisitable: () => aVisitable,
    buildLocalSnapshot: () => ({ ...SNAPSHOT, handle: 'A' }),
  });
  b = new ProximityVisiting({
    sendToPeer: async (_peerId, payload) => { a.handleIncomingPayload('peer-b', JSON.stringify(payload)); },
    isLocallyVisitable: () => bVisitable,
    buildLocalSnapshot: () => ({ ...SNAPSHOT, handle: 'B' }),
  });
  return { a, b };
}

describe('ProximityVisiting', () => {
  it('resolves the peer\'s real snapshot when they are visitable', async () => {
    const { a } = wireTwoPeers(true, true);
    const result = await a.requestVisit('peer-b');
    expect(result).toEqual({ ...SNAPSHOT, handle: 'B' });
  });

  it('resolves null when the probed peer is not visitable', async () => {
    const { a } = wireTwoPeers(true, false);
    const result = await a.requestVisit('peer-b');
    expect(result).toBeNull();
  });

  it('times out to null if no response ever arrives', async () => {
    vi.useFakeTimers();
    const unresponsive = new ProximityVisiting({
      sendToPeer: async () => {}, // never calls back
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => SNAPSHOT,
    });
    const promise = unresponsive.requestVisit('ghost-peer', 5000);
    await vi.advanceTimersByTimeAsync(5000);
    await expect(promise).resolves.toBeNull();
    vi.useRealTimers();
  });

  it('resolves null (not a rejection) if sending the probe itself fails', async () => {
    const flaky = new ProximityVisiting({
      sendToPeer: async () => { throw new Error('peer out of range'); },
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => SNAPSHOT,
    });
    await expect(flaky.requestVisit('unreachable-peer')).resolves.toBeNull();
  });

  it('ignores a malformed (non-JSON) whisper payload without throwing', () => {
    const visiting = new ProximityVisiting({
      sendToPeer: async () => {},
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => SNAPSHOT,
    });
    expect(() => visiting.handleIncomingPayload('someone', 'not json at all')).not.toThrow();
  });

  it('ignores a visit-response with no matching pending request', () => {
    const visiting = new ProximityVisiting({
      sendToPeer: async () => {},
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => SNAPSHOT,
    });
    const stray: ProximityVisitPayload = { type: 'visit-response', requestId: 'never-asked', visitable: true, snapshot: SNAPSHOT };
    expect(() => visiting.handleIncomingPayload('someone', JSON.stringify(stray))).not.toThrow();
  });

  it('runs two concurrent probes to different peers independently', async () => {
    let visitingC!: ProximityVisiting;
    const a = new ProximityVisiting({
      sendToPeer: async (peerId, payload) => {
        if (peerId === 'peer-b') return; // simulate peer-b silently ignoring
        if (peerId === 'peer-c') visitingC.handleIncomingPayload('peer-a', JSON.stringify(payload));
      },
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => SNAPSHOT,
    });
    visitingC = new ProximityVisiting({
      sendToPeer: async (_peerId, payload) => a.handleIncomingPayload('peer-c', JSON.stringify(payload)),
      isLocallyVisitable: () => true,
      buildLocalSnapshot: () => ({ ...SNAPSHOT, handle: 'C' }),
    });

    const bPromise = a.requestVisit('peer-b', 200);
    const cPromise = a.requestVisit('peer-c', 200);

    const [bResult, cResult] = await Promise.all([bPromise, cPromise]);
    expect(cResult).toEqual({ ...SNAPSHOT, handle: 'C' });
    expect(bResult).toBeNull(); // timed out — peer-b never replied
  });
});

describe('buildLocalDistrictSnapshot', () => {
  it('builds a DistrictSnapshot from primitive state fields', () => {
    const snapshot = buildLocalDistrictSnapshot({
      handle: 'Pip',
      day: 12,
      resilienceScore: 42,
      activeCrisisId: null,
      commons: SNAPSHOT.commons,
    });
    expect(snapshot).toEqual(SNAPSHOT);
  });

  it('falls back to "A traveler" for a blank/whitespace-only handle', () => {
    const snapshot = buildLocalDistrictSnapshot({
      handle: '   ',
      day: 1,
      resilienceScore: 0,
      activeCrisisId: null,
      commons: SNAPSHOT.commons,
    });
    expect(snapshot.handle).toBe('A traveler');
  });

  it('passes the raw activeCrisisId through unresolved, matching the Go backend\'s own semantics', () => {
    const snapshot = buildLocalDistrictSnapshot({
      handle: 'Pip',
      day: 1,
      resilienceScore: 0,
      activeCrisisId: 'warehouse-displacement',
      commons: SNAPSHOT.commons,
    });
    expect(snapshot.activeCrisis).toBe('warehouse-displacement');
  });
});
