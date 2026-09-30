import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE } from '../state/useGameStore';
import { updateCommonsProgress } from '../state/actions';
import {
  resolveCrisis, triggerCrisis, scenarios, effectiveConsequences, choiceAvailability, getScapegoatStreak,
  SCAPEGOAT_TRUST_PENALTY, type CrisisScenario,
} from './CrisisEngine';
import { BASE_RESILIENCE } from './EconomyMath';

// 2026-09-29 launch audit §1.4/§1.5 — crisis outcomes must be applied in
// full, shown honestly, and paid for.

const TEST_ID = 'economy-test-crisis';
const scenario: CrisisScenario = {
  id: TEST_ID,
  title: 'Test',
  context: 'x',
  choiceA: {
    label: 'Blame them', type: 'authoritarian', description: 'a',
    consequences: { cashDelta: 30, energyDelta: 10, trustDelta: -5, resilienceDelta: -10, stressDelta: 5, worldEffect: 'none' },
  },
  choiceB: {
    label: 'Organise', type: 'solidarity', description: 'b',
    consequences: { cashDelta: -20, energyDelta: -15, trustDelta: 10, resilienceDelta: 12, stressDelta: -5, worldEffect: 'none' },
  },
};

function setup(player: Partial<typeof INITIAL_STATE.player> = {}) {
  const fresh = structuredClone(INITIAL_STATE);
  fresh.meta.phase = 'playing';
  fresh.player = { ...fresh.player, classRole: 'pip', cash: 100, energy: 50, socialTrust: 40, stressLevel: 30, ...player };
  useGameStore.setState(fresh, true);
  if (!scenarios.some(s => s.id === TEST_ID)) scenarios.push(scenario);
  triggerCrisis(TEST_ID);
}

describe('crisis consequences are applied in full', () => {
  beforeEach(() => setup());

  it('positive energy from a choice is granted (it used to be ignored)', () => {
    resolveCrisis('A');
    expect(useGameStore.getState().player.energy).toBe(60);
  });

  it('the resilience outcome survives later build contributions', () => {
    resolveCrisis('B');
    const afterCrisis = useGameStore.getState().commons.resilienceScore;
    expect(afterCrisis).toBe(BASE_RESILIENCE + 12);
    updateCommonsProgress('kitchenProgress', 1);
    expect(useGameStore.getState().commons.resilienceScore).toBeGreaterThanOrEqual(afterCrisis);
  });

  it('the scapegoat trust penalty is part of the shown consequences, not hidden', () => {
    expect(effectiveConsequences(scenario.choiceA).trustDelta).toBe(-5 - SCAPEGOAT_TRUST_PENALTY);
    resolveCrisis('A');
    expect(useGameStore.getState().player.socialTrust).toBe(40 + effectiveConsequences(scenario.choiceA).trustDelta);
  });

  it('the scapegoat streak and crisis cooldown are saved in game state', () => {
    resolveCrisis('A');
    const { crisisState } = useGameStore.getState();
    expect(crisisState.scapegoatStreak).toBe(1);
    expect(getScapegoatStreak()).toBe(1);
    expect(crisisState.lastCrisisDay).toBe(useGameStore.getState().meta.day);
  });
});

describe('crisis costs are enforced', () => {
  it('a choice the player cannot pay for is unavailable and cannot be resolved', () => {
    setup({ cash: 5, energy: 50 });
    const avail = choiceAvailability(scenario, useGameStore.getState().player);
    expect(avail).toEqual({ A: true, B: false, forced: false });
    expect(resolveCrisis('B')).toBe(false);
    expect(useGameStore.getState().crisisState.activeCrisisId).toBe(TEST_ID);
    expect(useGameStore.getState().player.cash).toBe(5);
  });

  it('when neither choice is affordable both stay open and the shortfall turns into stress', () => {
    const bothCost: CrisisScenario = {
      ...scenario,
      id: 'economy-test-both-cost',
      choiceA: { ...scenario.choiceA, consequences: { ...scenario.choiceA.consequences, cashDelta: -10, energyDelta: 0 } },
    };
    scenarios.push(bothCost);
    setup({ cash: 4, energy: 0, stressLevel: 30 });
    triggerCrisis(bothCost.id);
    expect(choiceAvailability(bothCost, useGameStore.getState().player)).toEqual({ A: true, B: true, forced: true });
    expect(resolveCrisis('A')).toBe(true);
    const p = useGameStore.getState().player;
    expect(p.cash).toBe(0);
    // stressDelta +5, plus $6 that couldn't be paid
    expect(p.stressLevel).toBe(30 + 5 + 6);
  });
});

// 2026-09-29 launch audit §2.5 — the crisis look was DOM-only and reset on reload.
describe('crisis world look is saved', () => {
  beforeEach(() => setup());

  it('a scapegoat choice desaturates the saved world look', () => {
    const desat: CrisisScenario = {
      ...scenario, id: 'economy-test-desat',
      choiceA: { ...scenario.choiceA, consequences: { ...scenario.choiceA.consequences, worldEffect: 'desaturate' } },
    };
    scenarios.push(desat);
    triggerCrisis(desat.id);
    resolveCrisis('A');
    expect(useGameStore.getState().crisisState.worldSaturation).toBeLessThan(1);
  });
});
