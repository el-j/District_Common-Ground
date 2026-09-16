import { createStore } from 'zustand/vanilla';
import type { DistrictPulseState } from '@district-cg/shared-types';

export type ClassRole = 'pip' | 'morgan' | 'arthur';
export type Facing = 'down' | 'up' | 'left' | 'right';
export type GamePhase = 'select' | 'playing';
// M23 §5 — expanded from 3 to 6 so getQuestsForToday() can rotate a 3-quest
// window instead of offering the same fixed trio forever.
export type QuestId =
  | 'digital-deescalation'
  | 'community-reconnect'
  | 'local-mutual-aid'
  | 'skillshare-swap'
  | 'green-space-tidy'
  | 'check-in-call';

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
    lastAssemblyDay: number;
    /** Coarse, user-chosen region bucket (e.g. "GENERIC", "US-WEST") used to
     *  filter the civic ticker/directory. Never derived from GPS or IP. */
    regionCode: string;
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
    toolLibraryProgress: number;
    landTrustProgress: number;
    constructionSpeedBuff: number;
    greenhouseUnlocked: boolean;
    safeHavenUnlocked: boolean;
  };
  crisisState: {
    activeCrisisId: string | null;
    pendingQueue: string[];
    historyLog: CrisisLogEntry[];
  };
  quests: QuestState[];
  pulseState: DistrictPulseState | null;
}

export const INITIAL_STATE: GameState = {
  meta: { day: 1, tick: 0, activeSkin: 'solarpunk', phase: 'select', lastAssemblyDay: 0, regionCode: 'GENERIC' },
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
    toolLibraryProgress: 0,
    landTrustProgress: 0,
    constructionSpeedBuff: 0,
    greenhouseUnlocked: false,
    safeHavenUnlocked: false,
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
    { questId: 'skillshare-swap',      completedOnDay: null },
    { questId: 'green-space-tidy',     completedOnDay: null },
    { questId: 'check-in-call',        completedOnDay: null },
  ],
  pulseState: null,
};

export const useGameStore = createStore<GameState>()(() => INITIAL_STATE);
