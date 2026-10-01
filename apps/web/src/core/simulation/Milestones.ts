import type { GameState, BuildNodeKey } from '../state/useGameStore';

export type MilestoneCategory = 'commons' | 'survival' | 'solidarity' | 'crafting' | 'community';

export type MilestoneId =
  | 'first-dawn'
  | 'ten-days-resolute'
  | 'month-of-resistance'
  | 'first-brick'
  | 'four-pillars'
  | 'safe-haven'
  | 'unbroken-solidarity'
  | 'high-trust'
  | 'master-crafter'
  | 'district-scout'
  | 'civic-champion'
  | 'knock-at-the-door'
  | 'mutual-wealth'
  | 'full-pantries';

export interface MilestoneReward {
  cashDelta?: number;
  trustDelta?: number;
  energyDelta?: number;
  title?: string;
}

export interface MilestoneDefinition {
  id: MilestoneId;
  title: string;
  description: string;
  category: MilestoneCategory;
  icon: string;
  reward?: MilestoneReward;
  check: (state: GameState) => boolean;
}

const FOUNDATIONAL_NODES: BuildNodeKey[] = [
  'kitchenProgress',
  'solarGridProgress',
  'legalFundProgress',
  'toolLibraryProgress',
];

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    id: 'first-dawn',
    title: 'First Morning',
    description: 'Survive your first night and wake to the morning dispatch.',
    category: 'survival',
    icon: '🌅',
    reward: { trustDelta: 5, energyDelta: 5 },
    check: state => state.meta.day >= 2,
  },
  {
    id: 'ten-days-resolute',
    title: 'Ten Days Resolute',
    description: 'Keep your household and neighborhood afloat through 10 full days.',
    category: 'survival',
    icon: '🗓️',
    reward: { cashDelta: 20, trustDelta: 8 },
    check: state => state.meta.day >= 10,
  },
  {
    id: 'month-of-resistance',
    title: 'Month of Resistance',
    description: 'Reach Day 30 in Common Ground without giving up.',
    category: 'survival',
    icon: '🛡️',
    reward: { cashDelta: 50, trustDelta: 15 },
    check: state => state.meta.day >= 30,
  },
  {
    id: 'full-pantries',
    title: 'Full Pantries',
    description: 'Reach Day 7 without experiencing a single day of starvation.',
    category: 'survival',
    icon: '🍞',
    reward: { trustDelta: 10, energyDelta: 10 },
    check: state => state.meta.day >= 7 && (state.economy.starvingDays ?? 0) === 0,
  },
  {
    id: 'first-brick',
    title: 'Cornerstone Laid',
    description: 'Complete your first community commons build node to 100%.',
    category: 'commons',
    icon: '🏗️',
    reward: { cashDelta: 25, trustDelta: 12 },
    check: state => FOUNDATIONAL_NODES.some(k => (state.commons[k] ?? 0) >= 100),
  },
  {
    id: 'four-pillars',
    title: 'Four Pillars',
    description: 'Fully construct all four foundational commons: Kitchen, Solar Co-op, Legal Fund, and Tool Library.',
    category: 'commons',
    icon: '🏛️',
    reward: { cashDelta: 60, trustDelta: 25 },
    check: state => FOUNDATIONAL_NODES.every(k => (state.commons[k] ?? 0) >= 100),
  },
  {
    id: 'safe-haven',
    title: 'Safe Haven Forever',
    description: 'Ratify the Community Land Trust and secure Common Ground permanently against speculation.',
    category: 'commons',
    icon: '🌿',
    reward: { trustDelta: 30 },
    check: state => (state.commons.landTrustProgress ?? 0) >= 100,
  },
  {
    id: 'unbroken-solidarity',
    title: 'Unbroken Solidarity',
    description: 'Choose solidarity in at least 5 crises without a single scapegoat decision.',
    category: 'solidarity',
    icon: '🤝',
    reward: { trustDelta: 15 },
    check: state => {
      const history = state.crisisState.historyLog ?? [];
      return history.length >= 5 && history.every(h => h.choice === 'solidarity');
    },
  },
  {
    id: 'high-trust',
    title: 'Pillar of the Block',
    description: 'Reach 80% or higher Social Trust with your neighbours.',
    category: 'solidarity',
    icon: '⭐',
    reward: { cashDelta: 30, energyDelta: 15 },
    check: state => state.player.socialTrust >= 80,
  },
  {
    id: 'master-crafter',
    title: 'Hands-On Defiance',
    description: 'Craft or upcycle at least 3 usable tools, furniture, or goods in the workshop.',
    category: 'crafting',
    icon: '🛠️',
    reward: { energyDelta: 15, cashDelta: 20 },
    check: state => {
      const crafted = state.crafting.craftedItems ?? {};
      const totalCount = Object.values(crafted).reduce((sum, count) => sum + count, 0);
      return totalCount >= 3;
    },
  },
  {
    id: 'district-scout',
    title: 'District Scout',
    description: 'Complete at least 3 location-verified World Quests for your neighbours.',
    category: 'community',
    icon: '🧭',
    reward: { cashDelta: 20, trustDelta: 10 },
    check: state => (state.worldQuests.completedIds?.length ?? 0) >= 3,
  },
  {
    id: 'civic-champion',
    title: 'Civic Champion',
    description: 'Complete at least 6 World Quests across the district.',
    category: 'community',
    icon: '🎖️',
    reward: { cashDelta: 40, trustDelta: 20 },
    check: state => (state.worldQuests.completedIds?.length ?? 0) >= 6,
  },
  {
    id: 'knock-at-the-door',
    title: 'Good Neighbour',
    description: 'Answer the door for at least 3 distinct neighbour morning events.',
    category: 'community',
    icon: '🚪',
    reward: { trustDelta: 10, energyDelta: 10 },
    check: state => Object.keys(state.neighbourEvents?.seen ?? {}).length >= 3,
  },
  {
    id: 'mutual-wealth',
    title: 'Mutual Prosperity',
    description: 'Hold $150 or more in savings while maintaining at least 50% Social Trust.',
    category: 'community',
    icon: '💰',
    reward: { trustDelta: 10 },
    check: state => state.player.cash >= 150 && state.player.socialTrust >= 50,
  },
];

export function getMilestoneDefinition(id: string): MilestoneDefinition | undefined {
  return MILESTONE_DEFINITIONS.find(m => m.id === id);
}

export function evaluateMilestones(state: GameState, unlockedIds: string[]): MilestoneDefinition[] {
  if (state.meta.phase !== 'playing') return [];
  const set = new Set(unlockedIds);
  return MILESTONE_DEFINITIONS.filter(m => !set.has(m.id) && m.check(state));
}
