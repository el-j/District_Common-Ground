// M13 Test 13.4 — the three real telemetry call sites (CRISIS_RESOLVED,
// COMMONS_MILESTONE, LAND_TRUST_RATIFIED) each record through the existing
// M18 signed event log with the right event type and a PII-free payload.
// Mocks offlineRuntime's recordAction directly rather than letting the real
// Ed25519/IndexedDB path run, since this test only cares about *what* gets
// recorded, not the signing pipeline (that's SignedEventLog.test.ts's job).
import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordAction = vi.fn();
vi.mock('../offline/offlineRuntime', () => ({ recordAction: (...args: unknown[]) => recordAction(...args) }));

import { useGameStore } from './useGameStore';
import { updateCommonsProgress } from './actions';
import { initCrisisQueue, triggerCrisis, resolveCrisis, scenarios } from '../simulation/CrisisEngine';

const NO_PII_KEYS = ['email', 'userId', 'password', 'ip', 'name', 'deviceName'];

function assertNoPii(payload: Record<string, unknown>) {
  for (const key of Object.keys(payload)) {
    expect(NO_PII_KEYS).not.toContain(key);
  }
}

function resetStore() {
  useGameStore.setState({
    meta: { day: 5, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: { classRole: 'pip', cash: 100, energy: 80, maxEnergy: 100, socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null },
    commons: {
      resilienceScore: 50,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
  });
}

describe('COMMONS_MILESTONE / LAND_TRUST_RATIFIED telemetry', () => {
  beforeEach(() => {
    resetStore();
    recordAction.mockClear();
  });

  it('fires COMMONS_MILESTONE exactly once, the moment a node first crosses 100%', () => {
    updateCommonsProgress('kitchenProgress', 90);
    expect(recordAction).toHaveBeenCalledWith('COMMONS_RESOURCE_CONTRIBUTION', expect.anything());
    expect(recordAction).not.toHaveBeenCalledWith('COMMONS_MILESTONE', expect.anything());

    recordAction.mockClear();
    updateCommonsProgress('kitchenProgress', 90); // crosses 100 this time
    const call = recordAction.mock.calls.find(c => c[0] === 'COMMONS_MILESTONE');
    expect(call).toBeDefined();
    const payload = call![1] as Record<string, unknown>;
    expect(payload.node).toBe('kitchenProgress');
    expect(payload.completedOnDay).toBe(5);
    assertNoPii(payload);

    recordAction.mockClear();
    updateCommonsProgress('kitchenProgress', 10); // already complete — must not re-fire
    expect(recordAction).not.toHaveBeenCalledWith('COMMONS_MILESTONE', expect.anything());
  });

  it('fires LAND_TRUST_RATIFIED exactly once, alongside its own COMMONS_MILESTONE', () => {
    updateCommonsProgress('landTrustProgress', 100);
    const milestoneCall = recordAction.mock.calls.find(c => c[0] === 'COMMONS_MILESTONE');
    const ratifiedCall = recordAction.mock.calls.find(c => c[0] === 'LAND_TRUST_RATIFIED');
    expect(milestoneCall).toBeDefined();
    expect(ratifiedCall).toBeDefined();
    const payload = ratifiedCall![1] as Record<string, unknown>;
    expect(payload.completedOnDay).toBe(5);
    expect(typeof payload.globalResilience).toBe('number');
    expect(payload.playerTrustScore).toBe(40);
    assertNoPii(payload);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);

    recordAction.mockClear();
    updateCommonsProgress('landTrustProgress', 0); // no-op amount, already ratified — must not re-fire
    expect(recordAction).not.toHaveBeenCalledWith('LAND_TRUST_RATIFIED', expect.anything());
  });
});

describe('CRISIS_RESOLVED telemetry', () => {
  beforeEach(() => {
    resetStore();
    recordAction.mockClear();
    initCrisisQueue();
  });

  it('records archetype, choice, day, resilienceBefore and total trustDelta with no PII', () => {
    const scenario = scenarios[0]!;
    triggerCrisis(scenario.id);
    resolveCrisis('B'); // choiceB

    const call = recordAction.mock.calls.find(c => c[0] === 'CRISIS_RESOLVED');
    expect(call).toBeDefined();
    const payload = call![1] as Record<string, unknown>;
    expect(payload.crisisId).toBe(scenario.id);
    expect(payload.archetype).toBe('pip');
    expect(payload.dayNumber).toBe(5);
    expect(payload.resilienceBefore).toBe(50); // snapshotted before this crisis's own delta lands
    expect(typeof payload.trustDelta).toBe('number');
    expect(['scapegoat', 'solidarity']).toContain(payload.choice);
    assertNoPii(payload);
  });
});
