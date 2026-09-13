import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import {
  initCrisisQueue,
  triggerCrisis,
  resolveCrisis,
  getScenario,
  getScapegoatStreak,
  scenarios,
} from './CrisisEngine';

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', phase: 'playing', lastAssemblyDay: 0 },
    player: {
      classRole: 'pip', cash: 100, energy: 80, maxEnergy: 100,
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

describe('CrisisEngine', () => {
  beforeEach(() => {
    resetStore();
    // Restore module-level scapegoat streak between tests by resolving solidarity
    vi.restoreAllMocks();
  });

  it('initCrisisQueue fills pendingQueue with all scenario IDs', () => {
    initCrisisQueue();
    const { pendingQueue } = useGameStore.getState().crisisState;
    expect(pendingQueue.length).toBe(scenarios.length);
    scenarios.forEach(s => {
      expect(pendingQueue).toContain(s.id);
    });
  });

  it('initCrisisQueue does not overwrite existing queue', () => {
    useGameStore.setState(s => ({
      crisisState: { ...s.crisisState, pendingQueue: ['only-this'] },
    }));
    initCrisisQueue();
    const { pendingQueue } = useGameStore.getState().crisisState;
    expect(pendingQueue).toEqual(['only-this']);
  });

  it('triggerCrisis sets activeCrisisId and removes from queue', () => {
    initCrisisQueue();
    const firstId = useGameStore.getState().crisisState.pendingQueue[0]!;
    triggerCrisis(firstId);
    const state = useGameStore.getState().crisisState;
    expect(state.activeCrisisId).toBe(firstId);
    expect(state.pendingQueue).not.toContain(firstId);
  });

  it('resolveCrisis solidarity choice logs to historyLog', () => {
    const scenario = scenarios[0]!;
    triggerCrisis(scenario.id);
    resolveCrisis('B'); // solidarity choice
    const { historyLog, activeCrisisId } = useGameStore.getState().crisisState;
    expect(activeCrisisId).toBeNull();
    expect(historyLog.length).toBe(1);
    expect(historyLog[0]!.choice).toBe('solidarity');
    expect(historyLog[0]!.id).toBe(scenario.id);
  });

  it('resolveCrisis authoritarian choice logs scapegoat', () => {
    const scenario = scenarios[0]!;
    triggerCrisis(scenario.id);
    resolveCrisis('A'); // authoritarian choice
    const { historyLog } = useGameStore.getState().crisisState;
    expect(historyLog[0]!.choice).toBe('scapegoat');
  });

  it('resolveCrisis solidarity raises trust', () => {
    const scenario = scenarios.find(s => s.choiceB.consequences.trustDelta > 0)!;
    triggerCrisis(scenario.id);
    const beforeTrust = useGameStore.getState().player.socialTrust;
    resolveCrisis('B');
    const afterTrust = useGameStore.getState().player.socialTrust;
    expect(afterTrust).toBeGreaterThan(beforeTrust);
  });

  it('resolveCrisis applies resilience delta', () => {
    const scenario = scenarios.find(s => s.choiceB.consequences.resilienceDelta !== 0)!;
    triggerCrisis(scenario.id);
    const before = useGameStore.getState().commons.resilienceScore;
    resolveCrisis('B');
    const after = useGameStore.getState().commons.resilienceScore;
    expect(after).not.toBe(before);
  });

  it('getScenario returns matching scenario by ID', () => {
    const first = scenarios[0]!;
    expect(getScenario(first.id)).toBe(first);
  });

  it('getScenario returns undefined for unknown ID', () => {
    expect(getScenario('not-a-real-id')).toBeUndefined();
  });

  it('getScapegoatStreak increments on authoritarian choice', () => {
    const before = getScapegoatStreak();
    const scenario = scenarios[0]!;
    triggerCrisis(scenario.id);
    resolveCrisis('A');
    expect(getScapegoatStreak()).toBeGreaterThan(before);
  });
});
