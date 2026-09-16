import { useGameStore, type ClassRole, type CrisisLogEntry, type GameState } from './useGameStore';
import { saveToDB } from './persistence';
import { computeResilienceScore, applyDailyTick, DEFAULT_MULTIPLIERS } from '../simulation/EconomyMath';
import { initCrisisQueue, checkForCrisis } from '../simulation/CrisisEngine';
import { recordAction } from '../offline/offlineRuntime';
import { recordEconomicSnapshot } from '../../api/endpoints/district';

// Exported so BalanceSimulator.ts (M13) can start its solvency sweeps from
// the exact same per-archetype Day-1 numbers the real game seeds, instead of
// keeping a second hand-copied table that could drift out of sync.
export const ARCHETYPE_SEEDS: Record<ClassRole, {
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

  // M13 — fire-and-forget economic-attrition telemetry for the day that just
  // landed. Never blocks gameplay; a fresh archetype-less state (classRole
  // null, pre-character-select) is skipped rather than recorded as garbage.
  const after = useGameStore.getState();
  if (after.player.classRole) {
    recordEconomicSnapshot(after.meta.day, after.player.classRole, after.player.cash, after.player.energy);
  }
}

export function updateCommonsProgress(node: keyof GameState['commons'], amount: number): { nodeJustCompleted: boolean } {
  let recordedAmount = 0;
  let nodeJustCompleted = false;
  let landTrustJustRatified = false;
  let dayOfChange = 0;
  let resilienceAfter = 0;
  let trustAfter = 0;
  useGameStore.setState(state => {
    const buffedAmount = amount * (1 + state.commons.constructionSpeedBuff);
    recordedAmount = buffedAmount;
    const wasNodeComplete = Number(state.commons[node]) >= 100;
    const wasLandTrustComplete = state.commons.landTrustProgress >= 100;
    const nextCommons = {
      ...state.commons,
      [node]: Math.min(100, Number(state.commons[node]) + buffedAmount),
    } as GameState['commons'];

    const resilienceScore = computeResilienceScore({
      kitchenProgress: nextCommons.kitchenProgress,
      solarGridProgress: nextCommons.solarGridProgress,
      legalFundProgress: nextCommons.legalFundProgress,
    });

    // "Safe Haven" ending: unlocks once, the moment the Community Land Trust
    // (node E) first reaches 100% — see EPIC-11 Test 11.2.
    const safeHavenUnlocked = state.commons.safeHavenUnlocked
      || (node === 'landTrustProgress' && !wasLandTrustComplete && nextCommons.landTrustProgress >= 100);

    nodeJustCompleted = !wasNodeComplete && Number(nextCommons[node]) >= 100;
    landTrustJustRatified = !state.commons.safeHavenUnlocked && safeHavenUnlocked;
    dayOfChange = state.meta.day;
    resilienceAfter = resilienceScore;
    trustAfter = state.player.socialTrust;

    return {
      commons: {
        ...nextCommons,
        resilienceScore,
        safeHavenUnlocked,
      },
    };
  });
  // M18 — records this contribution as a PN-Counter delta so it merges
  // additively with the same node's contributions from this player's other
  // devices (see CRDTSyncEngine.mergePnCounter). Never blocks gameplay.
  recordAction('COMMONS_RESOURCE_CONTRIBUTION', { node, amount: recordedAmount });

  // M13 — zero-PII civic telemetry, riding the same local signed event log.
  // Field names deviate deliberately from the planning doc's illustrative
  // ones (`daysToComplete` -> `completedOnDay`, `totalDonationsCash`/
  // `energySpent` -> `contributionAmount`): per-node cumulative totals and a
  // "day this node's build started" timestamp aren't tracked anywhere in
  // GameState today, and adding them just to match the spec's exact field
  // names would be new state for its own sake — see EPIC-13's scope notes.
  if (nodeJustCompleted) {
    recordAction('COMMONS_MILESTONE', { node, completedOnDay: dayOfChange, contributionAmount: recordedAmount });
  }
  if (landTrustJustRatified) {
    recordAction('LAND_TRUST_RATIFIED', {
      completedOnDay: dayOfChange,
      globalResilience: resilienceAfter,
      playerTrustScore: trustAfter,
    });
  }

  // M23 §2 — callers (e.g. ConstructionModal) use this to decide whether to
  // fire the existing celebration chime/particles; a partial contribution
  // must not trigger them.
  return { nodeJustCompleted };
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
