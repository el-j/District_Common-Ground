// @vitest-environment jsdom
// TopHUD mounts real DOM nodes, reads inputManager and hits a couple of
// network endpoints on construction — needs jsdom + endpoint mocks, same
// opt-in pattern as ConstructionModal.test.ts/SettingsModal.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

vi.mock('../api/endpoints/civic', () => ({
  getCivicTicker: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../api/endpoints/shop', () => ({
  getWallet: vi.fn(() => Promise.reject(new Error('not signed in'))),
}));

vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline in tests'))));

import { TopHUD } from './TopHUD';
import { Kernel } from '../core/kernel/Kernel';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function resetStore(): void {
  useGameStore.setState({
    ...INITIAL_STATE,
    meta: { ...INITIAL_STATE.meta, phase: 'playing' },
    player: { ...INITIAL_STATE.player, classRole: 'pip', cash: 25, energy: 80, maxEnergy: 100, socialTrust: 40, stressLevel: 60 },
  });
}

function makeKernel(root: HTMLElement): Kernel {
  return new Kernel(root, {
    switchSkin: () => Promise.resolve(),
    getActiveSkinId: () => 'solarpunk',
    playUIClick: () => undefined,
    playSolidarityChime: () => undefined,
    setInputLocked: () => undefined,
    sendChatMessage: () => Promise.resolve(),
    onChatMessage: () => () => undefined,
    getActivePeerCount: () => 0,
    getTransportBadges: () => [],
  });
}

// M31 Section 1 — the 12-button bottom cluster was split into a short
// primary toolbar plus a top-corner Menu drawer for everything else. See
// EPIC-31/M31 Section 1.
describe('TopHUD Menu/toolbar button grouping', () => {
  beforeEach(() => resetStore());

  it('keeps only the short-listed primary controls in the bottom toolbar', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const toolbar = root.querySelector('#hud-icon-toolbar')!;
    expect(toolbar.querySelector('.settings-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.radio-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.quest-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.work-open-btn')).not.toBeNull();
    // Secondary functions must NOT be in the bottom toolbar.
    expect(toolbar.querySelector('.share-open-btn')).toBeNull();
    expect(toolbar.querySelector('.builder-open-btn')).toBeNull();
  });

  it('routes secondary functions into the Menu drawer instead', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const drawer = root.querySelector('#hud-menu-drawer')!;
    expect(drawer.querySelector('.share-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.builder-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.plugins-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.shop-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.social-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.civic-open-btn')).not.toBeNull();
    expect(drawer.querySelector('.journal-open-btn')).not.toBeNull();
  });

  it('removes the standalone mute button entirely (folded into Settings)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    expect(root.querySelector('.mute-open-btn')).toBeNull();
  });

  it('opens the Menu drawer on click and closes it after a drawer button fires', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const menuBtn = root.querySelector<HTMLButtonElement>('#hud-menu-btn')!;
    const drawer = root.querySelector<HTMLElement>('#hud-menu-drawer')!;
    expect(drawer.hidden).toBe(true);

    menuBtn.click();
    expect(drawer.hidden).toBe(false);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('true');

    drawer.querySelector<HTMLButtonElement>('.share-open-btn')!.click();
    expect(drawer.hidden).toBe(true);
    expect(menuBtn.getAttribute('aria-expanded')).toBe('false');
  });

  it('a kernel plugin button registered with no group defaults into the Menu drawer', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const hud = new TopHUD(root, makeKernel(root));

    hud.registerButton({ id: 'geo', icon: '🌍', label: 'Weather', onClick: () => undefined });

    const drawer = root.querySelector('#hud-menu-drawer')!;
    const toolbar = root.querySelector('#hud-icon-toolbar')!;
    expect(drawer.querySelector('.geo-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.geo-open-btn')).toBeNull();
  });
});
