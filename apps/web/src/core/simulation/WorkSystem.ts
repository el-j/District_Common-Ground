import { useGameStore, type ClassRole } from '../state/useGameStore';

// M24 §2 — a real, repeatable, player-initiated way to trade energy for cash,
// distinct from the passive daily tick (EconomyMath.ts) and the rotating
// quest pool (IrlQuestSystem.ts). One archetype-flavored option each, gated
// once per day exactly like a quest's completedOnDay check.

export interface WorkDefinition {
  label: string;
  icon: string;
  energyCost: number;
  cashReward: number;
}

export const WORK_DEFINITIONS: Record<ClassRole, WorkDefinition> = {
  pip:    { label: 'Take a Delivery Gig',    icon: '🚴', energyCost: 10, cashReward: 15 },
  morgan: { label: 'Pick Up a Shift',        icon: '🚌', energyCost: 15, cashReward: 20 },
  arthur: { label: 'Manage the Properties',  icon: '🏢', energyCost: 5,  cashReward: 10 },
};

export interface WorkStatus {
  definition: WorkDefinition;
  available: boolean;
  reason?: 'already-worked' | 'too-tired';
}

/** Returns null before an archetype is selected (no work to show yet). */
export function getWorkForToday(): WorkStatus | null {
  const { player, meta } = useGameStore.getState();
  if (!player.classRole) return null;
  const definition = WORK_DEFINITIONS[player.classRole];

  if (player.lastWorkedDay !== null && player.lastWorkedDay >= meta.day) {
    return { definition, available: false, reason: 'already-worked' };
  }
  if (player.energy < definition.energyCost) {
    return { definition, available: false, reason: 'too-tired' };
  }
  return { definition, available: true };
}

export type WorkResult =
  | { success: true }
  | { success: false; reason: 'already-worked' | 'too-tired' | 'no-archetype' };

export function performWork(): WorkResult {
  const status = getWorkForToday();
  if (!status) return { success: false, reason: 'no-archetype' };
  if (!status.available) return { success: false, reason: status.reason! };

  const { definition } = status;
  useGameStore.setState(state => ({
    player: {
      ...state.player,
      energy: Math.max(0, state.player.energy - definition.energyCost),
      cash: state.player.cash + definition.cashReward,
      lastWorkedDay: state.meta.day,
    },
  }));
  return { success: true };
}
