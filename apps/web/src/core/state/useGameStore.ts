import { create } from 'zustand';
import type { DistrictPulseState } from '@district-cg/shared-types';

export type ClassRole = 'pip' | 'morgan' | 'arthur';
export type Facing = 'down' | 'up' | 'left' | 'right';
export type GamePhase = 'select' | 'playing';
export type QuestId = 'digital-deescalation' | 'community-reconnect' | 'local-mutual-aid';

export interface QuestState {
  questId: QuestId;
  completedOnDay: number | null;
}

export interface CrisisLogEntry {
  id: string;
  day: number;
  choice: 'scapegoat' | 'solidarity';
  summary: string;
}

export interface GameState {
  meta: {
    day: number;
    tick: number;
    activeSkin: string;
    phase: GamePhase;
  };
  player: {
    classRole: ClassRole | null;
    cash: number;
    energy: number;
    maxEnergy: number;
    socialTrust: number;
    stressLevel: number;
    position: { x: number; y: number };
    facing: Facing;
  };
  commons: {
    resilienceScore: number;
    solarGridProgress: number;
    kitchenProgress: number;
    legalFundProgress: number;
  };
  crisisState: {
    activeCrisisId: string | null;
    pendingQueue: string[];
    historyLog: CrisisLogEntry[];
  };
  quests: QuestState[];
  pulseState: DistrictPulseState | null;
}

const INITIAL_STATE: GameState = {
  meta: { day: 1, tick: 0, activeSkin: 'solarpunk', phase: 'select' },
  player: {
    classRole: null,
    cash: 0,
    energy: 0,
    maxEnergy: 100,
    socialTrust: 0,
    stressLevel: 0,
    position: { x: 0, y: 0 },
    facing: 'down',
  },
  commons: {
    resilienceScore: 0,
    solarGridProgress: 0,
    kitchenProgress: 0,
    legalFundProgress: 0,
  },
  crisisState: {
    activeCrisisId: null,
    pendingQueue: [],
    historyLog: [],
  },
  quests: [
    { questId: 'digital-deescalation', completedOnDay: null },
    { questId: 'community-reconnect',  completedOnDay: null },
    { questId: 'local-mutual-aid',     completedOnDay: null },
  ],
  pulseState: null,
};

export const useGameStore = create<GameState>()(() => INITIAL_STATE);
