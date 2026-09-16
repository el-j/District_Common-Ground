import { useGameStore, type CrisisLogEntry } from '../state/useGameStore';
import { gainCash, spendCash, spendEnergy, addTrust, loseTrust, addStress, reduceStress } from '../state/actions';
import { recordCrisisChoice } from '../../api/endpoints/district';
import { recordAction } from '../offline/offlineRuntime';
import scenariosRaw from '../../../public/assets/data/crisis_scenarios.json';

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
}

export const scenarios: CrisisScenario[] = scenariosRaw as CrisisScenario[];

export function addDynamicScenario(s: CrisisScenario): void {
  if (!scenarios.find(existing => existing.id === s.id)) {
    scenarios.push(s);
  }
}

// Module-level state (not persisted — resets on page reload; historyLog is the truth)
let scapegoatStreak = 0;
let lastCrisisDay = 0;

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

  const daysSinceLast = state.meta.day - lastCrisisDay;
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
  }

  triggerCrisis(nextId);
}

export function triggerCrisis(id: string): void {
  lastCrisisDay = useGameStore.getState().meta.day;
  useGameStore.setState(s => ({
    crisisState: {
      ...s.crisisState,
      activeCrisisId: id,
      pendingQueue: s.crisisState.pendingQueue.filter(q => q !== id),
    },
  }));
}

export function resolveCrisis(choice: 'A' | 'B'): void {
  const state = useGameStore.getState();
  const { activeCrisisId } = state.crisisState;
  if (!activeCrisisId) return;

  const scenario = scenarios.find(s => s.id === activeCrisisId);
  if (!scenario) return;

  const chosen = choice === 'A' ? scenario.choiceA : scenario.choiceB;
  const c = chosen.consequences;
  const isScapegoat = chosen.type === 'authoritarian';

  // M13 telemetry — snapshot resilience *before* this crisis's consequences
  // land, so CRISIS_RESOLVED's payload can report the actual before/after
  // shift instead of a value already mutated by this same resolution.
  const resilienceBefore = state.commons.resilienceScore;
  const totalTrustDelta = c.trustDelta + (isScapegoat ? -15 : 0);

  // Apply stat deltas
  if (c.cashDelta > 0) gainCash(c.cashDelta);
  else if (c.cashDelta < 0) spendCash(-c.cashDelta);

  if (c.energyDelta < 0) spendEnergy(-c.energyDelta);

  if (c.trustDelta > 0) addTrust(c.trustDelta);
  else if (c.trustDelta < 0) loseTrust(-c.trustDelta);

  if (c.stressDelta > 0) addStress(c.stressDelta);
  else if (c.stressDelta < 0) reduceStress(-c.stressDelta);

  // Resilience: direct adjustment (persists until next commons contribution)
  useGameStore.setState(s => ({
    commons: {
      ...s.commons,
      resilienceScore: Math.max(0, Math.min(100, s.commons.resilienceScore + c.resilienceDelta)),
    },
  }));

  // Update scapegoat streak
  scapegoatStreak = isScapegoat ? scapegoatStreak + 1 : Math.max(0, scapegoatStreak - 1);

  // Solidarity bonus: +30% construction speed, unlock Greenhouse
  if (!isScapegoat) {
    useGameStore.setState(s => ({
      commons: {
        ...s.commons,
        constructionSpeedBuff: Math.min(0.6, s.commons.constructionSpeedBuff + 0.3),
        greenhouseUnlocked: true,
      },
    }));
  }

  // Scapegoat: police militarisation visual + extra −15 trust
  if (isScapegoat) {
    loseTrust(15);
    if (typeof document !== 'undefined') {
      document.getElementById('game-container')?.classList.add('world--police-state');
    }
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
    trustDelta: totalTrustDelta,
  });
}

function applyWorldEffect(effect: string): void {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('game-container');
  if (!container) return;

  if (effect === 'desaturate') {
    const cur = parseSaturate(container.style.filter);
    container.style.filter = `saturate(${Math.max(0.15, cur - 0.18).toFixed(2)})`;
  } else if (effect === 'bloom') {
    const cur = parseSaturate(container.style.filter);
    container.style.filter = `saturate(${Math.min(1.5, cur + 0.18).toFixed(2)})`;
  }

  if (scapegoatStreak >= 3) {
    container.classList.add('world-emergency');
  } else {
    container.classList.remove('world-emergency');
  }
}

function parseSaturate(filter: string): number {
  const m = filter.match(/saturate\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

export function getScenario(id: string): CrisisScenario | undefined {
  return scenarios.find(s => s.id === id);
}

export function getScapegoatStreak(): number {
  return scapegoatStreak;
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
