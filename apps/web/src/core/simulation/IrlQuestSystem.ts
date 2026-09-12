import { useGameStore, type QuestId, type QuestState } from '../state/useGameStore';

export interface QuestDefinition {
  questId: QuestId;
  title: string;
  description: string;
  icon: string;
  reward: string;
}

export const QUEST_DEFINITIONS: QuestDefinition[] = [
  {
    questId: 'digital-deescalation',
    title: 'Digital De-escalation',
    description: 'Step away from doom-scrolling for 30 minutes.',
    icon: '📵',
    reward: 'Energy → 110% (Refreshed Clarity)',
  },
  {
    questId: 'community-reconnect',
    title: 'Community Reconnect',
    description: 'Reach out to a neighbour, friend, or community group today.',
    icon: '🤝',
    reward: 'Social Trust +15, Stress -10',
  },
  {
    questId: 'local-mutual-aid',
    title: 'Local Mutual Aid',
    description: 'Give or receive support through a local mutual aid network.',
    icon: '🥕',
    reward: '+$30 (Raw Materials)',
  },
];

/** Returns true when a quest is available to complete today. */
export function isQuestAvailable(quest: QuestState, currentDay: number): boolean {
  return quest.completedOnDay === null || quest.completedOnDay < currentDay;
}

/** Apply reward and mark quest completed. */
export function completeQuest(questId: QuestId): void {
  const state = useGameStore.getState();
  const currentDay = state.meta.day;

  useGameStore.setState(store => {
    const player = { ...store.player };

    switch (questId) {
      case 'digital-deescalation':
        // Energy to 110% of max (temporary overflow — refreshed clarity)
        player.energy = Math.round(player.maxEnergy * 1.1);
        break;
      case 'community-reconnect':
        player.socialTrust = Math.min(100, player.socialTrust + 15);
        player.stressLevel = Math.max(0, player.stressLevel - 10);
        break;
      case 'local-mutual-aid':
        player.cash = player.cash + 30;
        break;
    }

    return {
      player,
      quests: store.quests.map(q =>
        q.questId === questId ? { ...q, completedOnDay: currentDay } : q,
      ),
    };
  });
}

/** Called by advanceDay — unlocking is implicit (isQuestAvailable checks completedOnDay < day). */
export function getQuestsForToday(): (QuestDefinition & { available: boolean })[] {
  const { quests, meta } = useGameStore.getState();
  return QUEST_DEFINITIONS.map(def => {
    const state = quests.find(q => q.questId === def.questId);
    const available = state ? isQuestAvailable(state, meta.day) : true;
    return { ...def, available };
  });
}
