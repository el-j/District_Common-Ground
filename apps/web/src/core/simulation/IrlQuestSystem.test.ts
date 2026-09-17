import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import { isQuestAvailable, completeQuest, getQuestsForToday } from './IrlQuestSystem';

function resetStore(day = 1) {
  useGameStore.setState({
    meta: { day, tick: 0, activeSkin: 'default', phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash: 50, energy: 80, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
    },
    commons: {
      resilienceScore: 0,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
    quests: [
      { questId: 'digital-deescalation', completedOnDay: null },
      { questId: 'community-reconnect',  completedOnDay: null },
      { questId: 'local-mutual-aid',     completedOnDay: null },
      { questId: 'skillshare-swap',      completedOnDay: null },
      { questId: 'green-space-tidy',     completedOnDay: null },
      { questId: 'check-in-call',        completedOnDay: null },
    ],
  });
}

describe('IrlQuestSystem', () => {
  beforeEach(() => resetStore(5));

  it('quest is available when completedOnDay is null', () => {
    const q = { questId: 'digital-deescalation' as const, completedOnDay: null };
    expect(isQuestAvailable(q, 5)).toBe(true);
  });

  it('quest locked when completedOnDay equals current day', () => {
    const q = { questId: 'digital-deescalation' as const, completedOnDay: 5 };
    expect(isQuestAvailable(q, 5)).toBe(false);
  });

  it('quest available again on next day (day lock)', () => {
    const q = { questId: 'digital-deescalation' as const, completedOnDay: 5 };
    expect(isQuestAvailable(q, 6)).toBe(true);
  });

  // M24 Test 24.3 — rebalanced from a 110%-of-max overflow to a capped +25.
  it('completeQuest digital-deescalation grants +25 energy when not near the cap', () => {
    useGameStore.setState(state => ({ player: { ...state.player, energy: 50 } }));
    completeQuest('digital-deescalation');
    const { player } = useGameStore.getState();
    expect(player.energy).toBe(75); // 50 + 25, well under maxEnergy
  });

  it('completeQuest digital-deescalation caps at maxEnergy when near full', () => {
    useGameStore.setState(state => ({ player: { ...state.player, energy: 90 } }));
    completeQuest('digital-deescalation');
    const { player } = useGameStore.getState();
    expect(player.energy).toBe(player.maxEnergy); // 90 + 25 = 115, capped to 100
  });

  it('completeQuest community-reconnect adds trust and reduces stress', () => {
    completeQuest('community-reconnect');
    const { player } = useGameStore.getState();
    expect(player.socialTrust).toBe(55); // 40 + 15
    expect(player.stressLevel).toBe(20); // 30 - 10
  });

  it('completeQuest local-mutual-aid adds $30', () => {
    completeQuest('local-mutual-aid');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(80); // 50 + 30
  });

  it('completeQuest marks quest as completedOnDay', () => {
    completeQuest('digital-deescalation');
    const { quests, meta } = useGameStore.getState();
    const q = quests.find(q => q.questId === 'digital-deescalation')!;
    expect(q.completedOnDay).toBe(meta.day);
  });

  it('getQuestsForToday returns a 3-quest window with available flag', () => {
    const today = getQuestsForToday();
    expect(today.length).toBe(3);
    today.forEach(q => {
      expect(typeof q.available).toBe('boolean');
      expect(q.questId).toBeTruthy();
      expect(q.title).toBeTruthy();
    });
  });

  it('getQuestsForToday marks a completed quest in today\'s window as unavailable', () => {
    const before = getQuestsForToday();
    const target = before[0]!.questId;
    completeQuest(target);
    const today = getQuestsForToday();
    const q = today.find(q => q.questId === target)!;
    expect(q.available).toBe(false);
  });

  // M23 Test 23.4 — the pool rotates instead of offering the same fixed trio forever.
  it('getQuestsForToday returns a different subset on different days', () => {
    resetStore(1);
    const day1 = getQuestsForToday().map(q => q.questId).sort();
    resetStore(4);
    const day4 = getQuestsForToday().map(q => q.questId).sort();
    expect(day1).not.toEqual(day4);
    expect(day1.length).toBe(3);
    expect(day4.length).toBe(3);
  });
});
