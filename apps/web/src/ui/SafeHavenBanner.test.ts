// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
const { playStageCompleteChime, spawnCelebrationParticles } = vi.hoisted(() => ({
  playStageCompleteChime: vi.fn(),
  spawnCelebrationParticles: vi.fn(),
}));
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
