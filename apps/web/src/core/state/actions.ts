import { useGameStore, type ClassRole, type CrisisLogEntry, type GameState } from './useGameStore';
import { saveToDB } from './persistence';
import { computeResilienceScore, applyDailyTick, DEFAULT_MULTIPLIERS } from '../simulation/EconomyMath';
import { initCrisisQueue, checkForCrisis } from '../simulation/CrisisEngine';
import { recordAction } from '../offline/offlineRuntime';

const ARCHETYPE_SEEDS: Record<ClassRole, {
  cash: number;
  energy: number;
  maxEnergy: number;
  socialTrust: number;
  stressLevel: number;
}> = {
  pip:    { cash: 25,   energy: 80, maxEnergy: 100, socialTrust: 40, stressLevel: 60 },
  morgan: { cash: 240,  energy: 40, maxEnergy: 100, socialTrust: 25, stressLevel: 45 },
  arthur: { cash: 1200, energy: 65, maxEnergy: 100, socialTrust: 10, stressLevel: 30 },
};

export function setArchetype(role: ClassRole): void {
  useGameStore.setState(state => ({
    player: { ...state.player, classRole: role, ...ARCHETYPE_SEEDS[role] },
    meta: { ...state.meta, phase: 'playing' as const },
  }));
  initCrisisQueue();
}

export function setRegionCode(regionCode: string): void {
  useGameStore.setState(state => ({
    meta: { ...state.meta, regionCode },
  }));
}

export function spendCash(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, cash: Math.max(0, state.player.cash - amount) },
  }));
}

export function gainCash(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, cash: state.player.cash + amount },
  }));
}

export function spendEnergy(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, energy: Math.max(0, state.player.energy - amount) },
  }));
}

export function regenEnergy(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, energy: Math.min(state.player.maxEnergy, state.player.energy + amount) },
  }));
}

export function addTrust(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, socialTrust: Math.min(100, state.player.socialTrust + amount) },
  }));
}

export function loseTrust(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, socialTrust: Math.max(0, state.player.socialTrust - amount) },
  }));
}

export function addStress(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, stressLevel: Math.min(100, state.player.stressLevel + amount) },
  }));
}

export function reduceStress(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, stressLevel: Math.max(0, state.player.stressLevel - amount) },
  }));
}

export function advanceDay(): void {
  useGameStore.setState(state => {
    const multipliers = state.pulseState?.multipliers ?? DEFAULT_MULTIPLIERS;
    const tick = applyDailyTick(
      state.player.classRole,
      state.commons,
      state.player.socialTrust,
      multipliers,
    );
    return {
      meta: { ...state.meta, day: state.meta.day + 1 },
      player: {
        ...state.player,
        energy:      Math.min(state.player.maxEnergy, Math.max(0, state.player.energy + tick.energyDelta)),
        cash:        Math.max(0, state.player.cash + tick.cashDelta),
        stressLevel: Math.max(0, Math.min(100, state.player.stressLevel + tick.stressDelta)),
      },
    };
  });
  checkForCrisis();
  void saveToDB(useGameStore.getState());
}

export function updateCommonsProgress(node: keyof GameState['commons'], amount: number): void {
  let recordedAmount = 0;
  useGameStore.setState(state => {
    const buffedAmount = amount * (1 + state.commons.constructionSpeedBuff);
    recordedAmount = buffedAmount;
    const nextCommons = {
      ...state.commons,
      [node]: Math.min(100, Number(state.commons[node]) + buffedAmount),
    } as GameState['commons'];

    const resilienceScore = computeResilienceScore({
      kitchenProgress: nextCommons.kitchenProgress,
      solarGridProgress: nextCommons.solarGridProgress,
      legalFundProgress: nextCommons.legalFundProgress,
    });

    return {
      commons: {
        ...nextCommons,
        resilienceScore,
      },
    };
  });
  // M18 — records this contribution as a PN-Counter delta so it merges
  // additively with the same node's contributions from this player's other
  // devices (see CRDTSyncEngine.mergePnCounter). Never blocks gameplay.
  recordAction('COMMONS_RESOURCE_CONTRIBUTION', { node, amount: recordedAmount });
}

export function setActiveCrisis(id: string): void {
  useGameStore.setState(state => ({
    crisisState: { ...state.crisisState, activeCrisisId: id },
  }));
}

export function resolveCrisis(choice: CrisisLogEntry['choice'], summary: string): void {
  useGameStore.setState(state => {
    const crisis = state.crisisState;
    if (!crisis.activeCrisisId) return {};
    const entry: CrisisLogEntry = {
      id: crisis.activeCrisisId,
      day: state.meta.day,
      choice,
      summary,
    };
    return {
      crisisState: {
        activeCrisisId: null,
        pendingQueue: crisis.pendingQueue,
        historyLog: [...crisis.historyLog, entry],
      },
    };
  });
}
