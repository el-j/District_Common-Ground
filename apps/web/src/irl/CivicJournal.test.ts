// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CivicJournal } from './CivicJournal';
import * as irlApi from '../api/endpoints/irl';
import * as badgeRegistry from './BadgeRegistry';
import { inputManager } from '../world/InputManager';

vi.mock('../world/InputManager', () => ({
  inputManager: {
    setLocked: vi.fn(),
  },
}));

vi.mock('../core/audio/SoundSynth', () => ({
  playUIClick: vi.fn(),
  playSolidarityChime: vi.fn(),
}));

describe('CivicJournal Component', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);

    vi.spyOn(badgeRegistry, 'getOutboxCount').mockResolvedValue(1);
    vi.spyOn(badgeRegistry, 'flushOutbox').mockResolvedValue({ flushed: 1, remaining: 0 });
    vi.spyOn(badgeRegistry, 'awardForDeed').mockResolvedValue({
      synced: true,
      deed: {
        id: 'deed-1',
        category: 'food_sharing',
        note: 'shared pantry',
        verificationMethod: 'honor_system',
        stAwarded: 25,
        cabAwarded: 1,
        createdAt: new Date().toISOString(),
      },
      wallet: {
        userId: 'u1',
        solidarityTokens: 125,
        civicBadges: 2,
      },
    });

    vi.spyOn(irlApi, 'getDeedHistory').mockResolvedValue([
      {
        id: 'deed-1',
        category: 'food_sharing',
        note: 'shared pantry',
        verificationMethod: 'honor_system',
        stAwarded: 25,
        cabAwarded: 1,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  afterEach(() => {
    root.remove();
    vi.restoreAllMocks();
  });

  it('mounts into root, locks inputManager, and renders category selection', async () => {
    new CivicJournal(root);
    expect(inputManager.setLocked).toHaveBeenCalledWith(true);

    const overlay = root.querySelector('.settings-overlay');
    expect(overlay).not.toBeNull();

    // Wait for history load
    await new Promise((r) => setTimeout(r, 10));

    const title = root.querySelector('#civic-journal-title');
    expect(title?.textContent).toContain('Civic Journal');

    const categories = root.querySelectorAll('.civic-journal-category');
    expect(categories.length).toBe(4);
  });

  it('switches category and updates note text', async () => {
    new CivicJournal(root);
    await new Promise((r) => setTimeout(r, 10));

    const eldercareBtn = root.querySelector<HTMLButtonElement>('[data-category="eldercare"]');
    eldercareBtn?.click();
    const updatedEldercareBtn = root.querySelector<HTMLButtonElement>('[data-category="eldercare"]');
    expect(updatedEldercareBtn?.classList.contains('civic-journal-category--active')).toBe(true);

    const textarea = root.querySelector<HTMLTextAreaElement>('.civic-journal-note');
    if (textarea) {
      textarea.value = 'Delivered groceries to senior center';
      textarea.dispatchEvent(new Event('input'));
    }
  });

  it('submits on honour system and renders result', async () => {
    new CivicJournal(root);
    await new Promise((r) => setTimeout(r, 10));

    const submitBtn = root.querySelector<HTMLButtonElement>('[data-method="honor_system"]');
    submitBtn?.click();

    await new Promise((r) => setTimeout(r, 10));
    expect(badgeRegistry.awardForDeed).toHaveBeenCalledWith('food_sharing', '', 'honor_system');

    const resultMessage = root.querySelector('.civic-directory-status');
    expect(resultMessage?.textContent).toContain('Logged!');
  });

  it('handles peer verification handshake flow', async () => {
    new CivicJournal(root);
    await new Promise((r) => setTimeout(r, 10));

    const peerBtn = root.querySelector<HTMLButtonElement>('[data-method="peer_verified"]');
    peerBtn?.click();

    // Now in handshake step
    const codeEl = root.querySelector('.civic-journal-code');
    expect(codeEl).not.toBeNull();
    const code = codeEl?.textContent ?? '';

    // Re-enter code correctly
    const input = root.querySelector<HTMLInputElement>('.civic-journal-code-input');
    if (input) {
      input.value = code;
    }

    const confirmBtn = root.querySelector<HTMLButtonElement>('.civic-journal-confirm');
    confirmBtn?.click();

    await new Promise((r) => setTimeout(r, 10));
    expect(badgeRegistry.awardForDeed).toHaveBeenCalledWith('food_sharing', '', 'peer_verified');
  });

  it('closes on escape and unlocks inputManager', async () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    new CivicJournal(root, onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(inputManager.setLocked).toHaveBeenCalledWith(false);

    vi.advanceTimersByTime(250);
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
