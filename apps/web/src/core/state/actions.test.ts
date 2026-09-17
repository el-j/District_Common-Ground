import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { setArchetype, spendCash, gainCash, spendEnergy, advanceDay, updateCommonsProgress } from './actions';

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', phase: 'select', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: { classRole: null, cash: 0, energy: 0, maxEnergy: 100, socialTrust: 0, stressLevel: 0, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null },
    commons: { resilienceScore: 0, solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0, constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
  });
}

describe('setArchetype', () => {
  beforeEach(resetStore);

  it('seeds pip stats correctly', () => {
    setArchetype('pip');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(25);
    expect(player.energy).toBe(80);
    expect(player.socialTrust).toBe(40);
    expect(player.stressLevel).toBe(60);
    expect(player.classRole).toBe('pip');
  });

  it('seeds morgan stats correctly', () => {
    setArchetype('morgan');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(240);
    expect(player.energy).toBe(40);
    expect(player.socialTrust).toBe(25);
    expect(player.stressLevel).toBe(45);
  });

  it('seeds arthur stats correctly', () => {
    setArchetype('arthur');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(1200);
    expect(player.energy).toBe(65);
    expect(player.socialTrust).toBe(10);
    expect(player.stressLevel).toBe(30);
  });

  it('sets phase to playing', () => {
    setArchetype('pip');
    expect(useGameStore.getState().meta.phase).toBe('playing');
  });
});

describe('spendCash', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip'); // starts with $25
  });

  it('deducts cash', () => {
    spendCash(10);
    expect(useGameStore.getState().player.cash).toBe(15);
  });

  it('never goes below 0', () => {
    spendCash(1000);
    expect(useGameStore.getState().player.cash).toBe(0);
  });
});

describe('gainCash', () => {
  beforeEach(resetStore);

  it('adds cash', () => {
    gainCash(50);
    expect(useGameStore.getState().player.cash).toBe(50);
  });
});

describe('spendEnergy', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip'); // starts with 80 energy
  });

  it('deducts energy', () => {
    spendEnergy(20);
    expect(useGameStore.getState().player.energy).toBe(60);
  });

  it('never goes below 0', () => {
    spendEnergy(9999);
    expect(useGameStore.getState().player.energy).toBe(0);
  });
});

describe('updateCommonsProgress — Safe Haven ending', () => {
  beforeEach(resetStore);

  it('unlocks safeHavenUnlocked exactly when landTrustProgress first reaches 100', () => {
    updateCommonsProgress('landTrustProgress', 60);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(false);

    updateCommonsProgress('landTrustProgress', 40);
    expect(useGameStore.getState().commons.landTrustProgress).toBe(100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
  });

  it('does not unlock for other nodes reaching 100', () => {
    updateCommonsProgress('kitchenProgress', 100);
    expect(useGameStore.getState().commons.kitchenProgress).toBe(100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(false);
  });

  it('stays true and does not error on further contributions once unlocked', () => {
    updateCommonsProgress('landTrustProgress', 100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
    updateCommonsProgress('landTrustProgress', 5);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
  });
});

describe('advanceDay', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip');
  });

  it('increments day', () => {
    advanceDay();
    expect(useGameStore.getState().meta.day).toBe(2);
  });
});
