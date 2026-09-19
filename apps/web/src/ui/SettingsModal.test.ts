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
}));

const { setBGMMuted, isBGMMuted, playUIClick } = vi.hoisted(() => ({
  setBGMMuted: vi.fn(),
  isBGMMuted: vi.fn(() => false),
  playUIClick: vi.fn(),
}));
vi.mock('../core/audio/SoundSynth', () => ({ setBGMMuted, isBGMMuted, playUIClick }));

import { SettingsModal } from './SettingsModal';

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

    const btn = root.querySelector<HTMLButtonElement>('.settings-mute-btn');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toContain('Playing');
  });

  it('toggles the existing SoundSynth mute flag on click — no second mute flag', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);

    root.querySelector<HTMLButtonElement>('.settings-mute-btn')!.click();

    expect(setBGMMuted).toHaveBeenCalledTimes(1);
    expect(setBGMMuted).toHaveBeenCalledWith(true);
  });

  it('re-renders the label after toggling to muted', () => {
    isBGMMuted.mockReturnValue(true);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SettingsModal(root);

    root.querySelector<HTMLButtonElement>('.settings-mute-btn')!.click();

    const btn = root.querySelector<HTMLButtonElement>('.settings-mute-btn');
    expect(btn!.textContent).toContain('Muted');
  });
});
