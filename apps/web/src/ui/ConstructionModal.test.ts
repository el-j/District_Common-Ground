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
import { useGameStore } from '../core/state/useGameStore';

function resetStore(overrides: { progress?: number; cash?: number; energy?: number } = {}) {
  const { progress = 0, cash = 0, energy = 0 } = overrides;
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash, energy, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
    },
    commons: {
      resilienceScore: 0,
      solarGridProgress: 0, kitchenProgress: progress, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
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

// M23 Test 23.2 — the existing celebration chime/particles fire when a
// Commons build node completes, and stay silent on a partial contribution.
describe('ConstructionModal celebratory feedback', () => {
  beforeEach(() => {
    playStageCompleteChime.mockClear();
    spawnCelebrationParticles.mockClear();
  });

  it('fires the chime and particles when a contribution completes the node', () => {
    resetStore({ progress: 95, cash: 125, energy: 0 });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ConstructionModal(root, 'kitchenProgress');

    submit(root, 125, 0); // 125/25 = 5 progress → 95 + 5 = 100

    expect(playStageCompleteChime).toHaveBeenCalledTimes(1);
    expect(spawnCelebrationParticles).toHaveBeenCalledTimes(1);
  });

  it('does not fire the chime or particles on a partial contribution', () => {
    resetStore({ progress: 10, cash: 25, energy: 0 });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ConstructionModal(root, 'kitchenProgress');

    submit(root, 25, 0); // 25/25 = 1 progress → 10 + 1 = 11, nowhere near 100

    expect(playStageCompleteChime).not.toHaveBeenCalled();
    expect(spawnCelebrationParticles).not.toHaveBeenCalled();
  });
});
