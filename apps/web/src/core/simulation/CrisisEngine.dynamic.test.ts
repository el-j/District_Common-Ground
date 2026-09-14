import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import { addDynamicScenario, triggerCrisis, resolveCrisis, scenarios } from './CrisisEngine';
import type { CrisisScenario } from './CrisisEngine';

// A scenario that mirrors what the Go validator would output after clamping.
// choiceA: authoritarian — trust at max clamp boundary (-30..0), resilience (-30..0)
// choiceB: solidarity   — trust at max clamp boundary (0..30), resilience (0..30)
const DYNAMIC_SCENARIO: CrisisScenario = {
  id: 'dynamic-test-housing-ai',
  title: 'AI-Generated: Housing Speculation Alert',
  context: 'An investment firm has purchased three buildings on your block. Eviction notices arrive this morning.',
  choiceA: {
    label: 'Accept the payout',
    type: 'authoritarian',
    description: 'Take the buyout offer and stay quiet.',
    consequences: { cashDelta: 100, energyDelta: 0, trustDelta: -30, resilienceDelta: -30, stressDelta: -10, worldEffect: 'desaturate' },
  },
  choiceB: {
    label: 'Organise the tenants',
    type: 'solidarity',
    description: 'Help coordinate collective resistance to the evictions.',
    consequences: { cashDelta: -20, energyDelta: -25, trustDelta: 30, resilienceDelta: 30, stressDelta: 10, worldEffect: 'bloom' },
  },
};

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash: 50, energy: 80, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down',
    },
    commons: {
      resilienceScore: 50,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
  });
}

describe('CrisisEngine — dynamic AI scenario integration', () => {
  let injectedIdx: number;

  beforeEach(() => {
    resetStore();
    addDynamicScenario(DYNAMIC_SCENARIO);
    injectedIdx = scenarios.findIndex(s => s.id === DYNAMIC_SCENARIO.id);
  });

  afterEach(() => {
    // Clean up injected scenario to avoid polluting other test suites
    const idx = scenarios.findIndex(s => s.id === DYNAMIC_SCENARIO.id);
    if (idx >= 0) scenarios.splice(idx, 1);
    void injectedIdx; // suppress unused-var lint
  });

  it('addDynamicScenario registers the scenario', () => {
    expect(scenarios.find(s => s.id === DYNAMIC_SCENARIO.id)).toBeDefined();
  });

  it('addDynamicScenario is idempotent — no duplicates on re-add', () => {
    addDynamicScenario(DYNAMIC_SCENARIO);
    const count = scenarios.filter(s => s.id === DYNAMIC_SCENARIO.id).length;
    expect(count).toBe(1);
  });

  it('authoritarian choice applies negative trust delta within clamped bounds', () => {
    triggerCrisis(DYNAMIC_SCENARIO.id);
    const before = useGameStore.getState().player.socialTrust;
    resolveCrisis('A');
    const after = useGameStore.getState().player.socialTrust;
    // trustDelta is -30 plus -15 authoritarian scapegoat penalty; trust decreases by 45 (min 0)
    expect(after).toBe(Math.max(0, before - 30 - 15));
  });

  it('solidarity choice applies positive trust delta within clamped bounds', () => {
    triggerCrisis(DYNAMIC_SCENARIO.id);
    const before = useGameStore.getState().player.socialTrust;
    resolveCrisis('B');
    const after = useGameStore.getState().player.socialTrust;
    // trustDelta is +30 from clamp boundary; trust should increase by 30 (max 100)
    expect(after).toBe(Math.min(100, before + 30));
  });

  it('solidarity choice applies resilience delta within clamped bounds', () => {
    triggerCrisis(DYNAMIC_SCENARIO.id);
    const before = useGameStore.getState().commons.resilienceScore;
    resolveCrisis('B');
    const after = useGameStore.getState().commons.resilienceScore;
    // resilienceDelta = +30; capped at 100
    expect(after).toBe(Math.min(100, before + 30));
    expect(after).toBeGreaterThan(before);
  });

  it('authoritarian choice applies resilience delta within clamped bounds', () => {
    triggerCrisis(DYNAMIC_SCENARIO.id);
    const before = useGameStore.getState().commons.resilienceScore;
    resolveCrisis('A');
    const after = useGameStore.getState().commons.resilienceScore;
    // resilienceDelta = -30; floored at 0
    expect(after).toBe(Math.max(0, before - 30));
    expect(after).toBeLessThan(before);
  });

  it('game state stays within sane bounds after extreme AI scenario is resolved', () => {
    triggerCrisis(DYNAMIC_SCENARIO.id);
    resolveCrisis('A');
    const { player, commons } = useGameStore.getState();
    expect(player.socialTrust).toBeGreaterThanOrEqual(0);
    expect(player.socialTrust).toBeLessThanOrEqual(100);
    expect(player.stressLevel).toBeGreaterThanOrEqual(0);
    expect(player.stressLevel).toBeLessThanOrEqual(100);
    expect(commons.resilienceScore).toBeGreaterThanOrEqual(0);
    expect(commons.resilienceScore).toBeLessThanOrEqual(100);
  });
});
