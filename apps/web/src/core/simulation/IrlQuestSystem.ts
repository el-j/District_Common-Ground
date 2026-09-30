import { useGameStore, type QuestId, type QuestState } from '../state/useGameStore';
import type { CraftDiscipline } from './Recipes';

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
    reward: 'Energy +10, Stress -5 (Refreshed Clarity)',
  },
  {
    questId: 'community-reconnect',
    title: 'Community Reconnect',
    description: 'Reach out to a neighbour, friend, or community group today.',
    icon: '🤝',
    reward: 'Social Trust +8, Stress -8',
  },
  {
    questId: 'local-mutual-aid',
    title: 'Local Mutual Aid',
    description: 'Give or receive support through a local mutual aid network.',
    icon: '🥕',
    reward: 'Raw materials: 2 mushroom, 1 cotton, 2 reclaimed wood',
  },
  // M23 §5 — 3 additional quests so the pool can rotate instead of offering
  // the same fixed trio every day.
  {
    questId: 'skillshare-swap',
    title: 'Skill-Share Swap',
    description: 'Teach or learn a skill from someone nearby today.',
    icon: '🎓',
    reward: '+1 mastery in your best craft (or Trust +5)',
  },
  {
    questId: 'green-space-tidy',
    title: 'Green Space Tidy-Up',
    description: 'Spend a few minutes tidying a shared or public green space.',
    icon: '🌳',
    reward: 'Stress -10 (Fresh Air)',
  },
  {
    questId: 'check-in-call',
    title: 'Check-In Call',
    description: "Call or message someone who's been isolated lately.",
    icon: '☎️',
    reward: 'Social Trust +5, Energy +5',
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
    let inventory = store.inventory;
    let crafting = store.crafting;
    const clamp = (v: number) => Math.max(0, Math.min(100, v));

    // 2026-09-29 launch audit — these are self-attested, so they never pay
    // cash (they used to be worth up to $50/day). Rewards stay small and
    // flavoured by the real-world deed.
    switch (questId) {
      case 'digital-deescalation':
        player.energy = Math.min(player.maxEnergy, player.energy + 10);
        player.stressLevel = clamp(player.stressLevel - 5);
        break;
      case 'community-reconnect':
        player.socialTrust = clamp(player.socialTrust + 8);
        player.stressLevel = clamp(player.stressLevel - 8);
        break;
      case 'local-mutual-aid': {
        const m = { ...store.inventory.materials };
        m.MATERIAL_MUSHROOM = (m.MATERIAL_MUSHROOM ?? 0) + 2;
        m.MATERIAL_COTTON = (m.MATERIAL_COTTON ?? 0) + 1;
        m.MATERIAL_RECLAIMED_WOOD = (m.MATERIAL_RECLAIMED_WOOD ?? 0) + 2;
        inventory = { ...store.inventory, materials: m };
        break;
      }
      case 'skillshare-swap': {
        const best = (Object.entries(store.crafting.mastery) as [CraftDiscipline, number][])
          .filter(([, v]) => v > 0 && v < 10)
          .sort((a, b) => b[1] - a[1])[0];
        if (best) {
          crafting = { ...store.crafting, mastery: { ...store.crafting.mastery, [best[0]]: best[1] + 1 } };
        } else {
          player.socialTrust = clamp(player.socialTrust + 5);
        }
        break;
      }
      case 'green-space-tidy':
        player.stressLevel = clamp(player.stressLevel - 10);
        break;
      case 'check-in-call':
        player.socialTrust = clamp(player.socialTrust + 5);
        player.energy = Math.min(player.maxEnergy, player.energy + 5);
        break;
    }

    return {
      player,
      inventory,
      crafting,
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
