import { useGameStore, type CrisisLogEntry, type GameState } from '../state/useGameStore';
import { gainCash, spendCash, spendEnergy, regenEnergy, addTrust, loseTrust, addStress, reduceStress, adjustResilience } from '../state/actions';
import { recordCrisisChoice } from '../../api/endpoints/district';
import { recordAction } from '../offline/offlineRuntime';
import scenariosRaw from '../../data/crisis_scenarios.json';
import { MAX_BUILD_BUFF } from './EconomyRules';

export interface CrisisConsequences {
  cashDelta: number;
  energyDelta: number;
  trustDelta: number;
  resilienceDelta: number;
  stressDelta: number;
  worldEffect: 'desaturate' | 'bloom' | 'none';
}

export interface CrisisChoice {
  label: string;
  type: 'authoritarian' | 'solidarity';
  description: string;
  consequences: CrisisConsequences;
}

export interface CrisisScenario {
  id: string;
  archetype?: string;
  title: string;
  context: string;
  choiceA: CrisisChoice;
  choiceB: CrisisChoice;
  /** M46 — EPIC-35 §3. Optional region tag (a `world/regions/RegionData.ts`
   *  `RegionId`, kept as `string` here — the same "core/ never imports
   *  world/" reasoning every other cross-layer id in this codebase already
   *  follows). `checkForCrisis()` *prefers*, never exclusively restricts
   *  to, a scenario tagged for the player's current region — extending
   *  the existing pool/reshuffle pattern (M23), not a parallel system. */
  region?: string;
}

export const scenarios: CrisisScenario[] = scenariosRaw as CrisisScenario[];

export function addDynamicScenario(s: CrisisScenario): void {
  if (!scenarios.find(existing => existing.id === s.id)) {
    scenarios.push(s);
  }
}

/** Scapegoating also costs this much extra trust. Part of the shown
 *  consequences (see `effectiveConsequences()`), never a hidden penalty. */
export const SCAPEGOAT_TRUST_PENALTY = 15;
/** Solidarity choices add this construction speed buff (up to the max). */
export const SOLIDARITY_BUILD_BUFF = 0.3;
export { MAX_BUILD_BUFF };

/** What a choice actually does, including the scapegoat trust penalty.
 *  The crisis card displays exactly this. */
export function effectiveConsequences(choice: CrisisChoice): CrisisConsequences {
  const c = choice.consequences;
  return choice.type === 'authoritarian'
    ? { ...c, trustDelta: c.trustDelta - SCAPEGOAT_TRUST_PENALTY }
    : c;
}

export function choiceCost(choice: CrisisChoice): { cash: number; energy: number } {
  return {
    cash: Math.max(0, -choice.consequences.cashDelta),
    energy: Math.max(0, -choice.consequences.energyDelta),
  };
}

export function canAffordChoice(choice: CrisisChoice, player: Pick<GameState['player'], 'cash' | 'energy'>): boolean {
  const cost = choiceCost(choice);
  return player.cash >= cost.cash && player.energy >= cost.energy;
}

/** A choice the player can't pay for is unavailable. If neither can be
 *  paid for, both stay open (`forced`) so the game never deadlocks; the
 *  unpaid part then turns into stress (D2). */
export function choiceAvailability(
  scenario: CrisisScenario,
  player: Pick<GameState['player'], 'cash' | 'energy'>,
): { A: boolean; B: boolean; forced: boolean } {
  const A = canAffordChoice(scenario.choiceA, player);
  const B = canAffordChoice(scenario.choiceB, player);
  if (!A && !B) return { A: true, B: true, forced: true };
  return { A, B, forced: false };
}

// M23 §1 — shared shuffle helper so the boot-time seed (initCrisisQueue) and
// the mid-playthrough refill (checkForCrisis) never drift into two different
// shuffle implementations.
function shuffleScenarioIds(excludeId?: string): string[] {
  return scenarios
    .map(s => s.id)
    .filter(id => id !== excludeId)
    .sort(() => Math.random() - 0.5);
}

export function initCrisisQueue(): void {
  const state = useGameStore.getState();
  if (state.crisisState.pendingQueue.length > 0) return;
  useGameStore.setState(s => ({
    crisisState: { ...s.crisisState, pendingQueue: shuffleScenarioIds() },
  }));
}

export function checkForCrisis(): void {
  const state = useGameStore.getState();
  if (state.crisisState.activeCrisisId) return;
  if (state.crisisState.pendingQueue.length === 0) {
    // M23 §1 real-bug fix — a playthrough that burns through all scenarios
    // used to go silent forever. Reshuffle a fresh queue (excluding the most
    // recently resolved scenario, if any, so the next crisis isn't a
    // guaranteed instant repeat) instead of returning early forever.
    const { historyLog } = state.crisisState;
    const lastResolvedId = historyLog[historyLog.length - 1]?.id;
    useGameStore.setState(s => ({
      crisisState: { ...s.crisisState, pendingQueue: shuffleScenarioIds(lastResolvedId) },
    }));
    return;
  }

  const daysSinceLast = state.meta.day - state.crisisState.lastCrisisDay;
  if (daysSinceLast < 3) return;

  // 60% chance after the minimum cooldown
  if (Math.random() > 0.6) return;

  // High migrant pressure → prioritise a MIGRATION_SANCT scenario
  const migrantIndex = state.pulseState?.multipliers.migrant ?? 1.0;
  let nextId = state.crisisState.pendingQueue[0];
  if (migrantIndex > 1.5) {
    const migrationId = state.crisisState.pendingQueue.find(id =>
      scenarios.find(s => s.id === id)?.archetype === 'MIGRATION_SANCT',
    );
    if (migrationId) nextId = migrationId;
  } else {
    // M46 — EPIC-35 §3. Prefer (never exclusively restrict, so the pool
    // never starves — same reasoning M23 §1's reshuffle-on-empty fix
    // already established) a scenario tagged for the player's current
    // region, when the migrant-pressure priority above didn't already
    // pick one.
    const currentRegionId = state.world.currentRegionId;
    const regionMatch = state.crisisState.pendingQueue.find(id =>
      scenarios.find(s => s.id === id)?.region === currentRegionId,
    );
    if (regionMatch) nextId = regionMatch;
  }

  triggerCrisis(nextId);
}

export function triggerCrisis(id: string): void {
  useGameStore.setState(s => ({
    crisisState: {
      ...s.crisisState,
      lastCrisisDay: s.meta.day,
      activeCrisisId: id,
      pendingQueue: s.crisisState.pendingQueue.filter(q => q !== id),
    },
  }));
}

/** Applies the chosen branch. Returns false (and changes nothing) when
 *  there's no active crisis or the choice isn't available. */
export function resolveCrisis(choice: 'A' | 'B'): boolean {
  const state = useGameStore.getState();
  const { activeCrisisId } = state.crisisState;
  if (!activeCrisisId) return false;

  const scenario = scenarios.find(s => s.id === activeCrisisId);
  if (!scenario) return false;
  if (!choiceAvailability(scenario, state.player)[choice]) return false;

  const chosen = choice === 'A' ? scenario.choiceA : scenario.choiceB;
  const c = effectiveConsequences(chosen);
  const isScapegoat = chosen.type === 'authoritarian';

  // M13 telemetry — snapshot resilience *before* this crisis's consequences
  // land, so CRISIS_RESOLVED's payload can report the actual before/after
  // shift instead of a value already mutated by this same resolution.
  const resilienceBefore = state.commons.resilienceScore;

  // Costs: pay what the player can; in a forced choice the shortfall
  // becomes stress instead of being silently forgiven.
  const cost = choiceCost(chosen);
  const shortfall = Math.max(0, cost.cash - state.player.cash) + Math.max(0, cost.energy - state.player.energy);
  if (cost.cash > 0) spendCash(Math.min(cost.cash, state.player.cash));
  if (cost.energy > 0) spendEnergy(Math.min(cost.energy, state.player.energy));
  if (c.cashDelta > 0) gainCash(c.cashDelta);
  if (c.energyDelta > 0) regenEnergy(c.energyDelta);

  if (c.trustDelta > 0) addTrust(c.trustDelta);
  else if (c.trustDelta < 0) loseTrust(-c.trustDelta);

  const stressDelta = c.stressDelta + shortfall;
  if (stressDelta > 0) addStress(stressDelta);
  else if (stressDelta < 0) reduceStress(-stressDelta);

  adjustResilience(c.resilienceDelta);

  useGameStore.setState(s => ({
    crisisState: {
      ...s.crisisState,
      scapegoatStreak: isScapegoat ? s.crisisState.scapegoatStreak + 1 : Math.max(0, s.crisisState.scapegoatStreak - 1),
    },
  }));

  // Solidarity bonus: construction speed buff, unlock Greenhouse
  if (!isScapegoat) {
    useGameStore.setState(s => ({
      commons: {
        ...s.commons,
        constructionSpeedBuff: Math.min(MAX_BUILD_BUFF, s.commons.constructionSpeedBuff + SOLIDARITY_BUILD_BUFF),
        greenhouseUnlocked: true,
      },
    }));
  }

  // Log the resolution
  const entry: CrisisLogEntry = {
    id: activeCrisisId,
    day: state.meta.day,
    choice: isScapegoat ? 'scapegoat' : 'solidarity',
    summary: chosen.description,
  };
  useGameStore.setState(s => ({
    crisisState: {
      ...s.crisisState,
      activeCrisisId: null,
      historyLog: [...s.crisisState.historyLog, entry],
    },
  }));

  recordCrisisChoice(entry.id, entry.day, entry.choice);
  applyWorldEffect(c.worldEffect);

  // M13 — zero-PII civic telemetry, riding the same local signed event log
  // as every other recordAction() call site (never a new pipeline).
  recordAction('CRISIS_RESOLVED', {
    crisisId: entry.id,
    archetype: state.player.classRole,
    choice: entry.choice,
    dayNumber: entry.day,
    resilienceBefore,
    trustDelta: c.trustDelta,
  });
  return true;
}

function applyWorldEffect(effect: string): void {
  useGameStore.setState(s => {
    const cur = s.crisisState.worldSaturation;
    const next = effect === 'desaturate' ? Math.max(0.15, cur - 0.18)
      : effect === 'bloom' ? Math.min(1.5, cur + 0.18)
      : cur;
    return { crisisState: { ...s.crisisState, worldSaturation: Math.round(next * 100) / 100 } };
  });
  applyWorldEffectsFromState();
}

/** Re-applies the crisis-driven world look from saved state: colour
 *  saturation, the police-state overlay while the scapegoat streak lasts,
 *  and the emergency look at a streak of 3+. Called after every crisis and
 *  once at boot, so a reload shows the same world (audit §2.5). */
export function applyWorldEffectsFromState(): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('game-container');
  if (!container) return;
  const { worldSaturation, scapegoatStreak } = useGameStore.getState().crisisState;
  container.style.filter = worldSaturation === 1 ? '' : `saturate(${worldSaturation.toFixed(2)})`;
  container.classList.toggle('world--police-state', scapegoatStreak > 0);
  container.classList.toggle('world-emergency', scapegoatStreak >= 3);
}

export function getScenario(id: string): CrisisScenario | undefined {
  return scenarios.find(s => s.id === id);
}

export function getScapegoatStreak(): number {
  return useGameStore.getState().crisisState.scapegoatStreak;
}

export type CommunityDefenseActionType = 'counter-organise' | 'alert-network';

export function triggerCommunityDefenseAction(type: CommunityDefenseActionType): void {
  if (type === 'counter-organise') {
    spendEnergy(20);
    addTrust(25);
  } else if (type === 'alert-network') {
    reduceStress(10);
  }
}
