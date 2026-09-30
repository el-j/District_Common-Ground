// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
const { playStageCompleteChime, spawnCelebrationParticles } = vi.hoisted(() => ({
  playStageCompleteChime: vi.fn(),
  spawnCelebrationParticles: vi.fn(),
}));
vi.mock('../core/state/persistence', () => ({ startNewGame: vi.fn(() => Promise.resolve()) }));
vi.mock('../builder/TactileEffects', () => ({ TactileEffects: { playStageCompleteChime, spawnCelebrationParticles } }));

import { SafeHavenBanner } from './SafeHavenBanner';
import { inputManager } from '../world/InputManager';

describe('SafeHavenBanner', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('locks input and fires the celebration chime/particles on mount', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SafeHavenBanner(root);

    expect(inputManager.setLocked).toHaveBeenCalledWith(true);
    expect(playStageCompleteChime).toHaveBeenCalledTimes(1);
    expect(spawnCelebrationParticles).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.safe-haven-title')!.textContent).toContain('Safe Haven Achieved');
  });

  it('closing via Continue unlocks input, removes the banner, and calls onClose', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new SafeHavenBanner(root, onClose);

    root.querySelector<HTMLButtonElement>('.safe-haven-close')!.click();

    expect(inputManager.setLocked).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.safe-haven-banner')).toBeNull();
  });

  it('is safe to construct without an onClose callback', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    expect(() => {
      new SafeHavenBanner(root);
      root.querySelector<HTMLButtonElement>('.safe-haven-close')!.click();
    }).not.toThrow();
  });
});

describe('Safe Haven ending summary', () => {
  it('summarises the run and is only shown once per save', async () => {
    const { useGameStore, INITIAL_STATE } = await import('../core/state/useGameStore');
    const { runSummary } = await import('./SafeHavenBanner');
    const s = structuredClone(INITIAL_STATE);
    s.meta.day = 52;
    s.crisisState.historyLog = [
      { id: 'a', day: 3, choice: 'solidarity', summary: '' },
      { id: 'b', day: 9, choice: 'scapegoat', summary: '' },
      { id: 'assembly-rent-control', day: 30, choice: 'solidarity', summary: '' },
    ];
    useGameStore.setState(s, true);
    expect(runSummary(useGameStore.getState())).toMatchObject({ days: 52, solidarityChoices: 1, scapegoatChoices: 1 });
    const root = document.createElement('div');
    new SafeHavenBanner(root);
    expect(root.textContent).toContain('52 days');
    expect(useGameStore.getState().economy.endingSeen).toBe(true);
  });
});
