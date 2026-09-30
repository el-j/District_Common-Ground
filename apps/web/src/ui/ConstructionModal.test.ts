// @vitest-environment jsdom
// ConstructionModal mounts real DOM nodes and reads inputManager's locked
// flag — needs jsdom, same opt-in pattern as DialogueOverlay.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

const { playStageCompleteChime, spawnCelebrationParticles } = vi.hoisted(() => ({
  playStageCompleteChime: vi.fn(),
  spawnCelebrationParticles: vi.fn(),
}));
vi.mock('../builder/TactileEffects', () => ({
  TactileEffects: { playStageCompleteChime, spawnCelebrationParticles },
}));

import { ConstructionModal } from './ConstructionModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { CASH_PER_PCT, DAILY_PLAYER_CONTRIBUTION_CAP_PCT } from '../core/simulation/EconomyRules';

function resetStore(overrides: { progress?: number; cash?: number; energy?: number } = {}) {
  const { progress = 0, cash = 0, energy = 0 } = overrides;
  useGameStore.setState(structuredClone(INITIAL_STATE), true);
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC', saveVersion: 2, savedAt: 0 },
    player: {
      classRole: 'pip', cash, energy, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
        name: '', gender: 'prefer-not-to-say', appearance: 'APPEARANCE_TONE_1',
    },
    commons: {
      resilienceScore: 0,
      solarGridProgress: 0, kitchenProgress: progress, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false, resilienceModifier: 0,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [], lastCrisisDay: 0, scapegoatStreak: 0, worldSaturation: 1 },
  });
}

function submit(root: HTMLElement, cash: number, energy: number) {
  const form = root.querySelector<HTMLFormElement>('.construction-form')!;
  const cashField = form.elements.namedItem('cash') as HTMLInputElement;
  const energyField = form.elements.namedItem('energy') as HTMLInputElement;
  cashField.value = String(cash);
  energyField.value = String(energy);
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

// A finished build is celebrated by BuildCelebration.ts (global, store-
// driven). The modal used to spawn particles into itself just as it closed,
// so nobody saw them — it must now simply close.
describe('ConstructionModal on completion', () => {
  beforeEach(() => {
    playStageCompleteChime.mockClear();
    spawnCelebrationParticles.mockClear();
  });

  it('completes the node and closes without its own invisible effects', () => {
    resetStore({ progress: 95, cash: 125, energy: 0 });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ConstructionModal(root, 'kitchenProgress');

    submit(root, 125, 0); // needs only 5% → $50, completes the node

    expect(useGameStore.getState().commons.kitchenProgress).toBe(100);
    expect(root.querySelector('.construction-submit')).toBeNull();
    expect(spawnCelebrationParticles).not.toHaveBeenCalled();
    expect(playStageCompleteChime).not.toHaveBeenCalled();
  });
});

// 2026-09-29 launch audit §1.5 — the panel used to take the full amount
// typed in even when only 1% was left, and accepted fractions.
describe('ConstructionModal charges exactly what the build needs', () => {
  it('near completion, only the needed amount is taken', () => {
    resetStore({ progress: 99, cash: 500, energy: 0 });
    const root = document.createElement('div');
    new ConstructionModal(root, 'kitchenProgress');
    submit(root, 500, 0);
    expect(useGameStore.getState().player.cash).toBe(500 - CASH_PER_PCT);
    expect(useGameStore.getState().commons.kitchenProgress).toBe(100);
  });

  it('shows a live preview of what a contribution will cost and add', () => {
    resetStore({ progress: 0, cash: 200, energy: 50 });
    const root = document.createElement('div');
    new ConstructionModal(root, 'kitchenProgress');
    const cashField = root.querySelector<HTMLInputElement>('input[name="cash"]')!;
    cashField.value = '30';
    cashField.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('.build-preview')!.textContent).toContain('+3%');
    expect(root.querySelector('.build-preview')!.textContent).toContain('$30');
  });

  it('explains the daily limit once it is reached and offers no form', () => {
    resetStore({ progress: 0, cash: 1000, energy: 0 });
    useGameStore.setState(s => ({
      economy: { ...s.economy, contributionsToday: { day: s.meta.day, byNode: { kitchenProgress: DAILY_PLAYER_CONTRIBUTION_CAP_PCT } } },
    }));
    const root = document.createElement('div');
    new ConstructionModal(root, 'kitchenProgress');
    expect(root.querySelector('.construction-form')).toBeNull();
    expect(root.textContent).toContain('come back tomorrow');
  });

  it('tells the player that neighbours help overnight', () => {
    resetStore({ progress: 10, cash: 50, energy: 0 });
    const root = document.createElement('div');
    new ConstructionModal(root, 'kitchenProgress');
    expect(root.textContent).toMatch(/Neighbours add/);
  });
});

describe('ConstructionModal — Land Trust finale', () => {
  it('explains that the Land Trust is locked and offers no form', () => {
    resetStore({ cash: 500 });
    const root = document.createElement('div');
    new ConstructionModal(root, 'landTrustProgress');
    expect(root.querySelector('.construction-form')).toBeNull();
    expect(root.textContent).toContain('final step');
  });
});
