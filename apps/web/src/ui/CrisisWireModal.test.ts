// @vitest-environment jsdom
// CrisisWireModal mounts real DOM nodes and reads inputManager's locked
// flag — needs jsdom, same opt-in pattern as DialogueOverlay.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

const { resolveCrisis, getScenario, testScenario } = vi.hoisted(() => {
  const scenario = {
    id: 'test-crisis',
    archetype: 'FOOD_HEALTH',
    title: 'Test Crisis',
    context: 'A test crisis context.',
    choiceA: {
      label: 'Scapegoat',
      type: 'authoritarian' as const,
      description: 'Blame someone else for the shortage.',
      consequences: { cashDelta: 10, energyDelta: 0, trustDelta: -5, resilienceDelta: -10, stressDelta: 5, worldEffect: 'desaturate' as const },
    },
    choiceB: {
      label: 'Solidarity',
      type: 'solidarity' as const,
      description: 'Pool resources and help each other out.',
      consequences: { cashDelta: 0, energyDelta: -10, trustDelta: 10, resilienceDelta: 10, stressDelta: -5, worldEffect: 'bloom' as const },
    },
  };
  return {
    resolveCrisis: vi.fn(),
    getScenario: vi.fn(() => scenario),
    testScenario: scenario,
  };
});
vi.mock('../core/simulation/CrisisEngine', () => ({ resolveCrisis, getScenario }));

const { playStageCompleteChime } = vi.hoisted(() => ({
  playStageCompleteChime: vi.fn(),
}));
vi.mock('../builder/TactileEffects', () => ({
  TactileEffects: { playStageCompleteChime },
}));

import { CrisisWireModal } from './CrisisWireModal';

function clickChoice(root: HTMLElement, choice: 'A' | 'B') {
  const btn = root.querySelector<HTMLButtonElement>(`[data-choice="${choice}"]`)!;
  btn.click();
}

// M23 Test 23.2 — the existing celebration chime fires on a solidarity
// crisis choice, and stays silent on an authoritarian choice.
describe('CrisisWireModal celebratory feedback', () => {
  beforeEach(() => {
    playStageCompleteChime.mockClear();
    resolveCrisis.mockClear();
    // jsdom has no requestAnimationFrame; the constructor's fade-in uses it.
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 0; });
  });

  it('fires the chime when the player picks the solidarity choice', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CrisisWireModal(root, testScenario.id, () => {});

    clickChoice(root, 'B'); // solidarity

    expect(resolveCrisis).toHaveBeenCalledWith('B');
    expect(playStageCompleteChime).toHaveBeenCalledTimes(1);
  });

  it('does not fire the chime when the player picks the authoritarian choice', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CrisisWireModal(root, testScenario.id, () => {});

    clickChoice(root, 'A'); // authoritarian

    expect(resolveCrisis).toHaveBeenCalledWith('A');
    expect(playStageCompleteChime).not.toHaveBeenCalled();
  });
});
