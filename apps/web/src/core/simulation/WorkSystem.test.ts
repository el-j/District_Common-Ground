import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import { getWorkForToday, performWork, WORK_DEFINITIONS } from './WorkSystem';

function resetStore(overrides: { classRole?: 'pip' | 'morgan' | 'arthur' | null; energy?: number; day?: number; lastWorkedDay?: number | null } = {}) {
  const { classRole = 'pip', energy = 80, day = 5, lastWorkedDay = null } = overrides;
  useGameStore.setState({
    meta: { day, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole, cash: 50, energy, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay,
    },
  });
}

// M24 Test 24.2 — a real, repeatable, player-initiated way to earn cash,
// gated once per day and blocked when too tired (no negative-energy overdraft).
describe('WorkSystem', () => {
  beforeEach(() => resetStore());

  it('performWork applies the correct archetype-specific cash/energy delta for pip', () => {
    resetStore({ classRole: 'pip', energy: 80 });
    const result = performWork();
    expect(result.success).toBe(true);
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(50 + WORK_DEFINITIONS.pip.cashReward);
    expect(player.energy).toBe(80 - WORK_DEFINITIONS.pip.energyCost);
  });

  it('performWork applies the correct archetype-specific cash/energy delta for morgan', () => {
    resetStore({ classRole: 'morgan', energy: 80 });
    const result = performWork();
    expect(result.success).toBe(true);
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(50 + WORK_DEFINITIONS.morgan.cashReward);
    expect(player.energy).toBe(80 - WORK_DEFINITIONS.morgan.energyCost);
  });

  it('performWork applies the correct archetype-specific cash/energy delta for arthur', () => {
    resetStore({ classRole: 'arthur', energy: 80 });
    const result = performWork();
    expect(result.success).toBe(true);
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(50 + WORK_DEFINITIONS.arthur.cashReward);
    expect(player.energy).toBe(80 - WORK_DEFINITIONS.arthur.energyCost);
  });

  it('performWork stamps lastWorkedDay to the current day', () => {
    performWork();
    expect(useGameStore.getState().player.lastWorkedDay).toBe(5);
  });

  it('a second performWork the same day fails with already-worked and does not mutate state', () => {
    performWork();
    const before = useGameStore.getState().player;
    const result = performWork();
    expect(result).toEqual({ success: false, reason: 'already-worked' });
    expect(useGameStore.getState().player).toEqual(before);
  });

  it('performWork succeeds again on a later day', () => {
    performWork();
    resetStore({ day: 6, lastWorkedDay: 5, energy: 70 });
    const result = performWork();
    expect(result.success).toBe(true);
  });

  it('performWork fails with too-tired when energy is below the cost, without mutating state', () => {
    resetStore({ classRole: 'morgan', energy: 5 }); // morgan costs 15 energy
    const before = useGameStore.getState().player;
    const result = performWork();
    expect(result).toEqual({ success: false, reason: 'too-tired' });
    expect(useGameStore.getState().player).toEqual(before);
  });

  it('getWorkForToday returns available: true when eligible', () => {
    const status = getWorkForToday();
    expect(status?.available).toBe(true);
    expect(status?.reason).toBeUndefined();
  });

  it('getWorkForToday reflects already-worked after a successful work today', () => {
    performWork();
    const status = getWorkForToday();
    expect(status?.available).toBe(false);
    expect(status?.reason).toBe('already-worked');
  });

  it('getWorkForToday and performWork return null/no-archetype before character select', () => {
    resetStore({ classRole: null });
    expect(getWorkForToday()).toBeNull();
    expect(performWork()).toEqual({ success: false, reason: 'no-archetype' });
  });
});
