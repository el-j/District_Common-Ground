// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn() }));

import { openShareSheet } from './ShareModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('ShareModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
    // jsdom has no navigator.share by default; be explicit either way.
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });

  it('opens the fallback modal (no Web Share API) with the player summary pre-filled', () => {
    resetStore({
      meta: { ...INITIAL_STATE.meta, day: 7 },
      player: { ...INITIAL_STATE.player, classRole: 'pip' },
      commons: { ...INITIAL_STATE.commons, resilienceScore: 42, kitchenProgress: 100 },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);

    openShareSheet(root);

    const textarea = root.querySelector<HTMLTextAreaElement>('#share-text-area')!;
    expect(textarea.value).toContain('Day 7');
    expect(textarea.value).toContain('Precarious Courier');
    expect(textarea.value).toContain('Resilience: 42%');
    expect(textarea.value).toContain('1/3 community nodes built');
  });

  it('uses navigator.share directly when available, without opening the fallback modal', () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const root = document.createElement('div');
    document.body.appendChild(root);

    openShareSheet(root);

    expect(share).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.settings-overlay')).toBeNull();
  });

  it('copies the share text to the clipboard and shows a confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const root = document.createElement('div');
    document.body.appendChild(root);

    openShareSheet(root);
    root.querySelector<HTMLButtonElement>('#share-copy-btn')!.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(root.querySelector('#share-copy-btn')!.textContent).toContain('Copied');
  });

  it('closes via the × button', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.appendChild(root);

    openShareSheet(root);
    root.querySelector<HTMLButtonElement>('.settings-close')!.click();
    vi.runAllTimers();

    expect(root.querySelector('.settings-overlay')).toBeNull();
    vi.useRealTimers();
  });
});
