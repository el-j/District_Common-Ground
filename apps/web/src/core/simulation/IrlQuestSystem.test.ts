import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../state/useGameStore';
import { isQuestAvailable, completeQuest, getQuestsForToday } from './IrlQuestSystem';

function resetStore(day = 1) {
  useGameStore.setState({
    meta: { day, tick: 0, activeSkin: 'default', phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash: 50, energy: 80, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down',
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

  it('completeQuest digital-deescalation boosts energy to 110%', () => {
    completeQuest('digital-deescalation');
    const { player } = useGameStore.getState();
    expect(player.energy).toBe(Math.round(player.maxEnergy * 1.1));
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

  it('getQuestsForToday returns all 3 quests with available flag', () => {
    const today = getQuestsForToday();
    expect(today.length).toBe(3);
    today.forEach(q => {
      expect(typeof q.available).toBe('boolean');
      expect(q.questId).toBeTruthy();
      expect(q.title).toBeTruthy();
    });
  });

  it('getQuestsForToday marks completed quest as unavailable', () => {
    completeQuest('community-reconnect');
    const today = getQuestsForToday();
    const q = today.find(q => q.questId === 'community-reconnect')!;
    expect(q.available).toBe(false);
  });
});
