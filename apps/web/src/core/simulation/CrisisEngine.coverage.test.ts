// @vitest-environment jsdom
// Closes the mutation-testing gap the 2026-09-20 Stryker audit found in
// CrisisEngine.ts (182 surviving mutants) — CrisisEngine.test.ts and
// CrisisEngine.dynamic.test.ts cover the happy path but never exercise
// checkForCrisis()'s gating logic, resolveCrisis()'s per-field delta signs,
// applyWorldEffect()'s DOM side effects, or triggerCommunityDefenseAction()
// at all.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import {
  initCrisisQueue,
  checkForCrisis,
  triggerCrisis,
  resolveCrisis,
  addDynamicScenario,
  triggerCommunityDefenseAction,
  scenarios,
} from './CrisisEngine';
import type { CrisisScenario } from './CrisisEngine';

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash: 100, energy: 80, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
      name: '', gender: 'prefer-not-to-say', appearance: 'APPEARANCE_TONE_1',
    },
    commons: {
      resilienceScore: 50,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
    pulseState: null,
    world: { currentRegionId: 'REGION_COMMON_GROUND' },
  });
  document.body.innerHTML = '<div id="game-container"></div>';
}

// Fully-controlled scenario with distinct, non-boundary deltas on every
// field and both worldEffect variants, so before/after magnitudes are
// unambiguous instead of depending on the real (larger, less predictable)
// crisis_scenarios.json pool.
const COVERAGE_SCENARIO: CrisisScenario = {
  id: 'coverage-test-scenario',
  title: 'Coverage Test',
  context: 'A controlled scenario for mutation-testing assertion coverage.',
  choiceA: {
    label: 'Crack down',
    type: 'authoritarian',
    description: 'chose the authoritarian path',
    consequences: { cashDelta: 20, energyDelta: -10, trustDelta: -5, resilienceDelta: -8, stressDelta: 12, worldEffect: 'desaturate' },
  },
  choiceB: {
    label: 'Organise together',
    type: 'solidarity',
    description: 'chose the solidarity path',
    consequences: { cashDelta: -15, energyDelta: -6, trustDelta: 9, resilienceDelta: 7, stressDelta: -4, worldEffect: 'bloom' },
  },
};

describe('CrisisEngine — coverage: checkForCrisis gating', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('does not trigger a new crisis while one is already active', () => {
    initCrisisQueue();
    const firstId = useGameStore.getState().crisisState.pendingQueue[0]!;
    triggerCrisis(firstId);
    useGameStore.setState(s => ({ meta: { ...s.meta, day: s.meta.day + 1000 } }));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    checkForCrisis();
    expect(useGameStore.getState().crisisState.activeCrisisId).toBe(firstId);
  });

  it('does not trigger before the 3-day cooldown has elapsed', () => {
    initCrisisQueue();
    const firstId = useGameStore.getState().crisisState.pendingQueue[0]!;
    triggerCrisis(firstId); // sets module-level lastCrisisDay = current day
    resolveCrisis('B'); // clears activeCrisisId so the active-crisis guard doesn't mask this
    useGameStore.setState(s => ({ meta: { ...s.meta, day: s.meta.day + 2 } })); // daysSinceLast = 2 < 3
    vi.spyOn(Math, 'random').mockReturnValue(0);

    checkForCrisis();
    expect(useGameStore.getState().crisisState.activeCrisisId).toBeNull();
  });

  it('triggers once the cooldown has elapsed and the probability roll succeeds', () => {
    initCrisisQueue();
    const firstId = useGameStore.getState().crisisState.pendingQueue[0]!;
    triggerCrisis(firstId);
    resolveCrisis('B');
    const queuedNext = useGameStore.getState().crisisState.pendingQueue[0]!;
    useGameStore.setState(s => ({ meta: { ...s.meta, day: s.meta.day + 10 } })); // daysSinceLast = 10 >= 3
    vi.spyOn(Math, 'random').mockReturnValue(0); // 0 <= 0.6 → passes

    checkForCrisis();
    expect(useGameStore.getState().crisisState.activeCrisisId).toBe(queuedNext);
  });

  it('does not trigger when the probability roll fails', () => {
    initCrisisQueue();
    const firstId = useGameStore.getState().crisisState.pendingQueue[0]!;
    triggerCrisis(firstId);
    resolveCrisis('B');
    useGameStore.setState(s => ({ meta: { ...s.meta, day: s.meta.day + 10 } }));
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 > 0.6 → fails

    checkForCrisis();
    expect(useGameStore.getState().crisisState.activeCrisisId).toBeNull();
  });

  it('prioritises a MIGRATION_SANCT scenario when migrant pressure is high', () => {
    initCrisisQueue();
    useGameStore.setState(s => ({
      pulseState: { multipliers: { food: 1, energy: 1, wage: 1, transit: 1, heat: 1, migrant: 2.0 }, fetchedAt: '', source: 'live' },
      meta: { ...s.meta, day: s.meta.day + 1000 },
    }));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    checkForCrisis();
    const triggeredId = useGameStore.getState().crisisState.activeCrisisId;
    expect(scenarios.find(s => s.id === triggeredId)?.archetype).toBe('MIGRATION_SANCT');
  });

  it('falls back to the front of the queue when migrant pressure is high but no MIGRATION_SANCT scenario is pending', () => {
    initCrisisQueue();
    const nonMigrationQueue = useGameStore.getState().crisisState.pendingQueue.filter(
      id => scenarios.find(s => s.id === id)?.archetype !== 'MIGRATION_SANCT',
    );
    useGameStore.setState(s => ({
      crisisState: { ...s.crisisState, pendingQueue: nonMigrationQueue },
      pulseState: { multipliers: { food: 1, energy: 1, wage: 1, transit: 1, heat: 1, migrant: 2.0 }, fetchedAt: '', source: 'live' },
      // lastCrisisDay is CrisisEngine.ts module-level state, not reset between
      // tests — a distinctly larger offset than the previous test's guarantees
      // the 3-day cooldown clears regardless of what it was left at.
      meta: { ...s.meta, day: s.meta.day + 2000 },
    }));
    vi.spyOn(Math, 'random').mockReturnValue(0);

    checkForCrisis();
    expect(useGameStore.getState().crisisState.activeCrisisId).toBe(nonMigrationQueue[0]);
  });

  it('the reshuffled queue after exhaustion excludes the just-resolved scenario', () => {
    initCrisisQueue();
    let queue = useGameStore.getState().crisisState.pendingQueue;
    let lastId = '';
    while (queue.length > 0) {
      lastId = queue[0]!;
      triggerCrisis(lastId);
      resolveCrisis('B');
      queue = useGameStore.getState().crisisState.pendingQueue;
    }
    checkForCrisis(); // refills, excluding lastId
    const refilled = useGameStore.getState().crisisState.pendingQueue;
    expect(refilled.length).toBe(scenarios.length - 1);
    expect(refilled).not.toContain(lastId);
  });
});

describe('CrisisEngine — coverage: triggerCrisis', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('removes only the triggered id from the queue, leaving the rest intact', () => {
    initCrisisQueue();
    const before = useGameStore.getState().crisisState.pendingQueue;
    const target = before[2]!;
    const untouched = before.filter(id => id !== target);
    triggerCrisis(target);
    const after = useGameStore.getState().crisisState.pendingQueue;
    expect(after).toHaveLength(before.length - 1);
    untouched.forEach(id => expect(after).toContain(id));
  });
});

describe('CrisisEngine — coverage: resolveCrisis guards', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
    addDynamicScenario(COVERAGE_SCENARIO);
  });

  it('does nothing when there is no active crisis', () => {
    const before = useGameStore.getState();
    resolveCrisis('B');
    const after = useGameStore.getState();
    expect(after.player.cash).toBe(before.player.cash);
    expect(after.crisisState.historyLog).toEqual(before.crisisState.historyLog);
  });

  it('does nothing when the active crisis id has no matching scenario', () => {
    useGameStore.setState(s => ({ crisisState: { ...s.crisisState, activeCrisisId: 'not-a-real-scenario-id' } }));
    const before = useGameStore.getState();
    resolveCrisis('B');
    const after = useGameStore.getState();
    expect(after.crisisState.activeCrisisId).toBe('not-a-real-scenario-id'); // untouched, no early clear
    expect(after.player.cash).toBe(before.player.cash);
  });
});

describe('CrisisEngine — coverage: resolveCrisis per-field deltas (authoritarian, choice A)', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
    addDynamicScenario(COVERAGE_SCENARIO);
    triggerCrisis(COVERAGE_SCENARIO.id);
  });

  it('applies a positive cashDelta via gainCash (adds, does not subtract)', () => {
    const before = useGameStore.getState().player.cash;
    resolveCrisis('A');
    expect(useGameStore.getState().player.cash).toBe(before + 20);
  });

  it('applies a negative energyDelta via spendEnergy, floored at 0', () => {
    const before = useGameStore.getState().player.energy;
    resolveCrisis('A');
    expect(useGameStore.getState().player.energy).toBe(Math.max(0, before - 10));
  });

  it('applies a negative trustDelta plus the extra -15 scapegoat penalty', () => {
    const before = useGameStore.getState().player.socialTrust;
    resolveCrisis('A');
    // trustDelta -5, plus loseTrust(15) scapegoat penalty applied separately = -20 total
    expect(useGameStore.getState().player.socialTrust).toBe(Math.max(0, before - 5 - 15));
  });

  it('applies a positive stressDelta via addStress, capped at 100', () => {
    const before = useGameStore.getState().player.stressLevel;
    resolveCrisis('A');
    expect(useGameStore.getState().player.stressLevel).toBe(Math.min(100, before + 12));
  });

  it('applies a negative resilienceDelta, floored at 0', () => {
    const before = useGameStore.getState().commons.resilienceScore;
    resolveCrisis('A');
    expect(useGameStore.getState().commons.resilienceScore).toBe(Math.max(0, Math.min(100, before - 8)));
  });

  it('does NOT apply the solidarity construction-speed buff or unlock the greenhouse', () => {
    resolveCrisis('A');
    const { commons } = useGameStore.getState();
    expect(commons.constructionSpeedBuff).toBe(0);
    expect(commons.greenhouseUnlocked).toBe(false);
  });

  it('adds the world--police-state class to the game container', () => {
    resolveCrisis('A');
    expect(document.getElementById('game-container')!.classList.contains('world--police-state')).toBe(true);
  });

  it('applies the desaturate world effect, dropping saturation but flooring at 0.15', () => {
    resolveCrisis('A');
    const filter = document.getElementById('game-container')!.style.filter;
    expect(filter).toBe('saturate(0.82)'); // starts at 1 (no filter set), 1 - 0.18 = 0.82
  });

  it('increments the scapegoat streak', () => {
    resolveCrisis('A');
    // Second authoritarian resolution in a row should push the streak to 2 and
    // beyond the world-emergency threshold (>=3) on a third.
    triggerCrisis(COVERAGE_SCENARIO.id);
    resolveCrisis('A');
    triggerCrisis(COVERAGE_SCENARIO.id);
    resolveCrisis('A');
    expect(document.getElementById('game-container')!.classList.contains('world-emergency')).toBe(true);
  });
});

describe('CrisisEngine — coverage: resolveCrisis per-field deltas (solidarity, choice B)', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
    addDynamicScenario(COVERAGE_SCENARIO);
    triggerCrisis(COVERAGE_SCENARIO.id);
  });

  it('applies a negative cashDelta via spendCash (subtracts, floored at 0)', () => {
    const before = useGameStore.getState().player.cash;
    resolveCrisis('B');
    expect(useGameStore.getState().player.cash).toBe(Math.max(0, before - 15));
  });

  it('applies a negative energyDelta via spendEnergy', () => {
    const before = useGameStore.getState().player.energy;
    resolveCrisis('B');
    expect(useGameStore.getState().player.energy).toBe(Math.max(0, before - 6));
  });

  it('applies a positive trustDelta with no scapegoat penalty', () => {
    const before = useGameStore.getState().player.socialTrust;
    resolveCrisis('B');
    expect(useGameStore.getState().player.socialTrust).toBe(Math.min(100, before + 9));
  });

  it('applies a negative stressDelta via reduceStress, floored at 0', () => {
    const before = useGameStore.getState().player.stressLevel;
    resolveCrisis('B');
    expect(useGameStore.getState().player.stressLevel).toBe(Math.max(0, before - 4));
  });

  it('applies a positive resilienceDelta, capped at 100', () => {
    const before = useGameStore.getState().commons.resilienceScore;
    resolveCrisis('B');
    expect(useGameStore.getState().commons.resilienceScore).toBe(Math.max(0, Math.min(100, before + 7)));
  });

  it('raises the construction-speed buff by 0.3 per solidarity choice and caps it at 0.6', () => {
    resolveCrisis('B');
    expect(useGameStore.getState().commons.constructionSpeedBuff).toBeCloseTo(0.3);
    triggerCrisis(COVERAGE_SCENARIO.id);
    resolveCrisis('B');
    expect(useGameStore.getState().commons.constructionSpeedBuff).toBeCloseTo(0.6);
    triggerCrisis(COVERAGE_SCENARIO.id);
    resolveCrisis('B');
    expect(useGameStore.getState().commons.constructionSpeedBuff).toBeCloseTo(0.6); // capped, does not exceed
  });

  it('unlocks the greenhouse', () => {
    resolveCrisis('B');
    expect(useGameStore.getState().commons.greenhouseUnlocked).toBe(true);
  });

  it('does NOT add the world--police-state class', () => {
    resolveCrisis('B');
    expect(document.getElementById('game-container')!.classList.contains('world--police-state')).toBe(false);
  });

  it('applies the bloom world effect, raising saturation but capping at 1.5', () => {
    resolveCrisis('B');
    const filter = document.getElementById('game-container')!.style.filter;
    expect(filter).toBe('saturate(1.18)'); // starts at 1, 1 + 0.18 = 1.18
  });

  it('decrements the scapegoat streak, floored at 0, and removes world-emergency once below 3', () => {
    // Build up a streak of 3 authoritarian choices first.
    triggerCrisis(COVERAGE_SCENARIO.id); resolveCrisis('A');
    triggerCrisis(COVERAGE_SCENARIO.id); resolveCrisis('A');
    triggerCrisis(COVERAGE_SCENARIO.id); resolveCrisis('A');
    expect(document.getElementById('game-container')!.classList.contains('world-emergency')).toBe(true);

    triggerCrisis(COVERAGE_SCENARIO.id);
    resolveCrisis('B'); // streak: 3 -> 2, below threshold
    expect(document.getElementById('game-container')!.classList.contains('world-emergency')).toBe(false);
  });

  it('records a solidarity historyLog entry with the correct day and summary', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, day: 42 } }));
    resolveCrisis('B');
    const log = useGameStore.getState().crisisState.historyLog;
    const entry = log[log.length - 1]!;
    expect(entry.id).toBe(COVERAGE_SCENARIO.id);
    expect(entry.day).toBe(42);
    expect(entry.choice).toBe('solidarity');
    expect(entry.summary).toBe('chose the solidarity path');
  });
});

describe('CrisisEngine — coverage: applyWorldEffect "none"', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('leaves the filter untouched for a worldEffect of "none"', () => {
    const neutral: CrisisScenario = {
      ...COVERAGE_SCENARIO,
      id: 'coverage-neutral-scenario',
      choiceA: { ...COVERAGE_SCENARIO.choiceA, consequences: { ...COVERAGE_SCENARIO.choiceA.consequences, worldEffect: 'none' } },
    };
    addDynamicScenario(neutral);
    triggerCrisis(neutral.id);
    resolveCrisis('A');
    expect(document.getElementById('game-container')!.style.filter).toBe('');
  });
});

describe('CrisisEngine — coverage: triggerCommunityDefenseAction', () => {
  beforeEach(() => {
    resetStore();
    vi.restoreAllMocks();
  });

  it('counter-organise spends 20 energy and adds 25 trust', () => {
    const before = useGameStore.getState().player;
    triggerCommunityDefenseAction('counter-organise');
    const after = useGameStore.getState().player;
    expect(after.energy).toBe(Math.max(0, before.energy - 20));
    expect(after.socialTrust).toBe(Math.min(100, before.socialTrust + 25));
    expect(after.stressLevel).toBe(before.stressLevel); // unaffected by this branch
  });

  it('alert-network reduces stress by 10 and leaves energy/trust untouched', () => {
    const before = useGameStore.getState().player;
    triggerCommunityDefenseAction('alert-network');
    const after = useGameStore.getState().player;
    expect(after.stressLevel).toBe(Math.max(0, before.stressLevel - 10));
    expect(after.energy).toBe(before.energy);
    expect(after.socialTrust).toBe(before.socialTrust);
  });
});
