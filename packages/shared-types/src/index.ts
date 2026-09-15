// Shared types between apps/web and apps/api

export * from './kernel';
export * from './theme';
export * from './shop';
export * from './social';
export * from './civic';
export * from './irl';
export * from './offline';
export * from './mesh';

export type ClassRole = 'pip' | 'morgan' | 'arthur';
export type Facing = 'down' | 'up' | 'left' | 'right';
export type GamePhase = 'select' | 'playing';

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
}

export interface CrisisScenario {
  id: string;
  title: string;
  description: string;
  scapegoat: { label: string; cashDelta: number; trustDelta: number; resilienceDelta: number };
  solidarity: { label: string; energyCost: number; trustDelta: number; resilienceDelta: number };
}

export interface ApiUser {
  userId: string;
  email: string;
  token: string;
}

export interface EconomicMultipliers {
  food: number;
  energy: number;
  wage: number;
  transit: number;
  heat: number;
  migrant: number;
}

export interface DistrictPulseState {
  multipliers: EconomicMultipliers;
  fetchedAt: string;
  source: 'live' | 'seasonal-fallback';
}
