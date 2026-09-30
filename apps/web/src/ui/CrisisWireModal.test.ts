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
    resolveCrisis: vi.fn(() => true),
    getScenario: vi.fn(() => scenario),
    testScenario: scenario,
  };
});
vi.mock('../core/simulation/CrisisEngine', async (importActual) => ({
  ...(await importActual<typeof import('../core/simulation/CrisisEngine')>()),
  resolveCrisis,
  getScenario,
}));

const { playStageCompleteChime } = vi.hoisted(() => ({
  playStageCompleteChime: vi.fn(),
}));
vi.mock('../builder/TactileEffects', () => ({
  TactileEffects: { playStageCompleteChime },
}));

import { CrisisWireModal } from './CrisisWireModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

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
    useGameStore.setState(s => ({ player: { ...s.player, cash: 50, energy: 50 } }));
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

// 2026-09-29 launch audit §1.5 / §3.4 — the card must show what a choice
// really does, colour stress correctly, show the whole story, and not let
// the player pick something they can't pay for.
describe('CrisisWireModal shows honest, complete choices', () => {
  beforeEach(() => {
    resolveCrisis.mockClear();
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => { cb(); return 0; });
    const fresh = structuredClone(INITIAL_STATE);
    fresh.player = { ...fresh.player, cash: 50, energy: 50 };
    useGameStore.setState(fresh, true);
  });

  const mount = () => {
    const root = document.createElement('div');
    new CrisisWireModal(root, testScenario.id, () => {});
    return root;
  };

  it('shows the scapegoat trust penalty in the trust chip', () => {
    const root = mount();
    const a = root.querySelector('[data-choice="A"]')!;
    expect(a.textContent).toContain('-20 Trust'); // -5 shown + -15 penalty
  });

  it('colours more stress as bad and less stress as good', () => {
    const root = mount();
    const aStress = [...root.querySelectorAll('[data-choice="A"] .delta-chip')].find(c => c.textContent!.includes('Stress'))!;
    const bStress = [...root.querySelectorAll('[data-choice="B"] .delta-chip')].find(c => c.textContent!.includes('Stress'))!;
    expect(aStress.classList.contains('delta--neg')).toBe(true);
    expect(bStress.classList.contains('delta--pos')).toBe(true);
  });

  it('shows the full context and descriptions without truncation', () => {
    const root = mount();
    expect(root.textContent).toContain(testScenario.context);
    expect(root.textContent).toContain(testScenario.choiceB.description);
    expect(root.textContent).not.toContain('…');
  });

  it('shows the solidarity build bonus on the solidarity card', () => {
    const root = mount();
    expect(root.querySelector('[data-choice="B"]')!.textContent).toMatch(/build speed/i);
  });

  it('disables a choice the player cannot pay for and says why', () => {
    useGameStore.setState(s => ({ player: { ...s.player, energy: 3 } }));
    const root = mount();
    const b = root.querySelector<HTMLButtonElement>('[data-choice="B"]')!;
    expect(b.disabled).toBe(true);
    expect(b.textContent).toMatch(/needs ⚡10/i);
    b.click();
    expect(resolveCrisis).not.toHaveBeenCalled();
  });
});
