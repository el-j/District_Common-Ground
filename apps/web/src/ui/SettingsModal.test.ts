// @vitest-environment jsdom
// SettingsModal mounts real DOM nodes and reads inputManager's locked flag —
// needs jsdom, same opt-in pattern as ConstructionModal.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

vi.mock('../skins/ThemeManager', () => ({
  getActiveSkinId: () => 'solarpunk',
}));

vi.mock('../skins/ThemePluginManager', () => ({
  getThemeCatalog: () => new Promise(() => { /* never resolves — keep initial hardcoded catalog stable for these tests */ }),
  applyTheme: vi.fn(),
}));

vi.mock('../core/state/persistence', () => ({
  clearSave: vi.fn(() => Promise.resolve()),
  saveToDB: vi.fn(() => Promise.resolve()),
}));

vi.mock('../core/state/actions', () => ({
  setRegionCode: vi.fn(),
  setHousingVisitable: vi.fn(),
}));

const { setBGMMuted, isBGMMuted, playUIClick } = vi.hoisted(() => ({
  setBGMMuted: vi.fn(),
  isBGMMuted: vi.fn(() => false),
  playUIClick: vi.fn(),
}));
vi.mock('../core/audio/SoundSynth', () => ({ setBGMMuted, isBGMMuted, playUIClick }));

import { SettingsModal } from './SettingsModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { setHousingVisitable } from '../core/state/actions';

/** Bugfix: settings are now split into tabs (Appearance/Audio/Region &
 *  Privacy/Account) instead of one long flat scroll — see SettingsModal.ts's
 *  own comment. Tests for anything outside the default "appearance" tab
 *  have to switch tabs first, same as ShopModal.test.ts's own tab tests. */
function openTab(root: HTMLElement, tab: 'appearance' | 'audio' | 'region' | 'account'): void {
  root.querySelector<HTMLButtonElement>(`[data-tab="${tab}"]`)!.click();
}

// M31 Section 3 — the standalone mute HUD icon was removed and folded into
// SettingsModal, reusing SoundSynth's existing mute flag rather than a
// second one. See EPIC-31/M31 Section 3.
describe('SettingsModal audio control', () => {
  beforeEach(() => {
    setBGMMuted.mockClear();
    isBGMMuted.mockClear();
    isBGMMuted.mockReturnValue(false);
  });

  it('renders a mute control reflecting the current SoundSynth mute state', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'audio');

    const btn = root.querySelector<HTMLButtonElement>('.settings-mute-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Playing');
  });

  it('toggles the existing SoundSynth mute flag on click — no second mute flag', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'audio');

    root.querySelector<HTMLButtonElement>('.settings-mute-btn')!.click();

    expect(setBGMMuted).toHaveBeenCalledTimes(1);
    expect(setBGMMuted).toHaveBeenCalledWith(true);
  });

  it('re-renders the label after toggling to muted', () => {
    isBGMMuted.mockReturnValue(true);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'audio');

    root.querySelector<HTMLButtonElement>('.settings-mute-btn')!.click();

    const btn = root.querySelector<HTMLButtonElement>('.settings-mute-btn');
    expect(btn!.textContent).toContain('Muted');
  });
});

// M54 — EPIC-38 §1.
describe('SettingsModal proximity visiting toggle', () => {
  beforeEach(() => {
    useGameStore.setState(INITIAL_STATE, true);
    vi.mocked(setHousingVisitable).mockClear();
  });

  it('shows a hint instead of a toggle when the player has no flat', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'region');

    expect(root.querySelector('.settings-proximity-btn')).toBeNull();
    expect(root.querySelector('.settings-proximity-hint')).not.toBeNull();
  });

  it('shows the toggle, defaulting to not-visitable, once the player has a flat', () => {
    useGameStore.setState(state => ({ housing: { ...state.housing, currentFlatId: 'pips-courier-room' } }));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'region');

    const btn = root.querySelector<HTMLButtonElement>('.settings-proximity-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Not visitable');
  });

  it('clicking the toggle calls setHousingVisitable with the flipped value', () => {
    useGameStore.setState(state => ({ housing: { ...state.housing, currentFlatId: 'pips-courier-room', visitable: false } }));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);
    openTab(root, 'region');

    root.querySelector<HTMLButtonElement>('.settings-proximity-btn')!.click();

    expect(setHousingVisitable).toHaveBeenCalledWith(true);
  });
});

// Bugfix — settings tabs.
describe('SettingsModal tabs', () => {
  beforeEach(() => {
    useGameStore.setState(INITIAL_STATE, true);
  });

  it('defaults to the Appearance tab, showing the skin grid', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);

    expect(root.querySelector('.settings-tab--active')?.getAttribute('data-tab')).toBe('appearance');
    expect(root.querySelector('.skin-grid')).not.toBeNull();
    expect(root.querySelector('.settings-mute-btn')).toBeNull();
  });

  it('switches tabs on click, showing only the active tab\'s content', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);

    openTab(root, 'account');

    expect(root.querySelector('.settings-tab--active')?.getAttribute('data-tab')).toBe('account');
    expect(root.querySelector('.settings-new-game')).not.toBeNull();
    expect(root.querySelector('.skin-grid')).toBeNull();
  });
});
