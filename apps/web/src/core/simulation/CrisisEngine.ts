import { useGameStore, type CrisisLogEntry } from '../state/useGameStore';
import { gainCash, spendCash, spendEnergy, addTrust, loseTrust, addStress, reduceStress } from '../state/actions';
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
  title: string;
  context: string;
  choiceA: CrisisChoice;
  choiceB: CrisisChoice;
}

export const scenarios: CrisisScenario[] = scenariosRaw as CrisisScenario[];

// Module-level state (not persisted — resets on page reload; historyLog is the truth)
let scapegoatStreak = 0;
let lastCrisisDay = 0;

export function initCrisisQueue(): void {
  const state = useGameStore.getState();
  if (state.crisisState.pendingQueue.length > 0) return;
  // Shuffle scenario IDs into the pending queue
  const ids = scenarios.map(s => s.id).sort(() => Math.random() - 0.5);
  useGameStore.setState(s => ({
    crisisState: { ...s.crisisState, pendingQueue: ids },
  }));
}

export function checkForCrisis(): void {
  const state = useGameStore.getState();
  if (state.crisisState.activeCrisisId) return;
  if (state.crisisState.pendingQueue.length === 0) return;

  const daysSinceLast = state.meta.day - lastCrisisDay;
  if (daysSinceLast < 3) return;

  // 60% chance after the minimum cooldown
  if (Math.random() > 0.6) return;

  const nextId = state.crisisState.pendingQueue[0];
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

  applyWorldEffect(c.worldEffect);
}

function applyWorldEffect(effect: string): void {
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
