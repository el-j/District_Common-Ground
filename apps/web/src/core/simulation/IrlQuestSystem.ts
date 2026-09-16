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
  // M23 §5 — 3 additional quests so the pool can rotate instead of offering
  // the same fixed trio every day.
  {
    questId: 'skillshare-swap',
    title: 'Skill-Share Swap',
    description: 'Teach or learn a skill from someone nearby today.',
    icon: '🎓',
    reward: '+$20 (Bartered Value)',
  },
  {
    questId: 'green-space-tidy',
    title: 'Green Space Tidy-Up',
    description: 'Spend a few minutes tidying a shared or public green space.',
    icon: '🌳',
    reward: 'Stress -15 (Fresh Air)',
  },
  {
    questId: 'check-in-call',
    title: 'Check-In Call',
    description: "Call or message someone who's been isolated lately.",
    icon: '☎️',
    reward: 'Social Trust +10, Energy +10',
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
      case 'skillshare-swap':
        player.cash = player.cash + 20;
        break;
      case 'green-space-tidy':
        player.stressLevel = Math.max(0, player.stressLevel - 15);
        break;
      case 'check-in-call':
        player.socialTrust = Math.min(100, player.socialTrust + 10);
        player.energy = Math.min(player.maxEnergy, player.energy + 10);
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

const QUESTS_PER_DAY = 3;

/**
 * M23 §5 — a rotating 3-quest window over the 6-quest pool, keyed by day, so
 * the same fixed trio isn't offered forever. Deterministic (pure function of
 * `day`) rather than random, so it's easy to reason about/test.
 */
function questWindowForDay(day: number): QuestDefinition[] {
  const poolSize = QUEST_DEFINITIONS.length;
  const startIdx = ((day - 1) % poolSize + poolSize) % poolSize;
  return Array.from({ length: QUESTS_PER_DAY }, (_, i) => QUEST_DEFINITIONS[(startIdx + i) % poolSize]!);
}

/** Called by advanceDay — unlocking is implicit (isQuestAvailable checks completedOnDay < day). */
export function getQuestsForToday(): (QuestDefinition & { available: boolean })[] {
  const { quests, meta } = useGameStore.getState();
  return questWindowForDay(meta.day).map(def => {
    const state = quests.find(q => q.questId === def.questId);
    const available = state ? isQuestAvailable(state, meta.day) : true;
    return { ...def, available };
  });
}
