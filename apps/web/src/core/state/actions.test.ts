import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import { setArchetype, spendCash, gainCash, spendEnergy, advanceDay } from './actions';

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', phase: 'select' },
    player: { classRole: null, cash: 0, energy: 0, maxEnergy: 100, socialTrust: 0, stressLevel: 0, position: { x: 0, y: 0 }, facing: 'down' },
    commons: { resilienceScore: 0, solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0 },
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
