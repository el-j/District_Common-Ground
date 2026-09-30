// @vitest-environment jsdom
// TopHUD mounts real DOM nodes, reads inputManager and hits a couple of
// network endpoints on construction — needs jsdom + endpoint mocks, same
// opt-in pattern as ConstructionModal.test.ts/SettingsModal.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

// M46 — WorldMapModal.ts (opened from a new TopHUD button) imports
// WorldScene.ts for its static requestTravel()/getHud() registry.
// WorldScene.ts does `import Phaser from 'phaser'` at module scope, and
// merely loading (not even instantiating) that module crashes under plain
// jsdom the same way InputManager.ts's own Phaser import does (see that
// mock's comment) — mocked out here rather than pulling the real Phaser
// runtime into a HUD-button unit test.
vi.mock('../world/WorldScene', () => ({
  WorldScene: {
    getHud: vi.fn(() => null),
    requestTravel: vi.fn(() => false),
  },
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

// Bugfix (post-M31 revert): M31's ☰ drawer had hidden every in-game
// shortcut but Settings/Radio/Quest/Work, and put Settings in the same row
// as those gameplay shortcuts — reported as settings and in-game items
// reading as mixed together. Every gameplay shortcut (TopHUD's own
// built-ins and any kernel plugin's) now lands directly in the
// always-visible toolbar; Settings is the one button kept isolated.
describe('TopHUD icon toolbar / Settings isolation', () => {
  beforeEach(() => resetStore());

  it('puts every gameplay shortcut directly in the always-visible toolbar', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const toolbar = root.querySelector('#hud-icon-toolbar')!;
    expect(toolbar.querySelector('.radio-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.quest-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.work-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.share-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.builder-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.plugins-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.shop-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.social-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.civic-open-btn')).not.toBeNull();
    expect(toolbar.querySelector('.journal-open-btn')).not.toBeNull();
    // Settings is never a toolbar shortcut — it's the isolated button below.
    expect(toolbar.querySelector('.settings-open-btn')).toBeNull();
  });

  it('keeps Settings as its own isolated button, separate from every gameplay shortcut', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const settingsBtn = root.querySelector<HTMLButtonElement>('#hud-settings-btn')!;
    expect(settingsBtn).not.toBeNull();
    expect(root.querySelector('#hud-icon-toolbar')!.contains(settingsBtn)).toBe(false);
    expect(root.querySelectorAll('.settings-modal, .settings-overlay').length).toBe(0);

    settingsBtn.click();
    expect(root.querySelector('.settings-overlay')).not.toBeNull();
  });

  it('removes the standalone mute button entirely (folded into Settings)', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    expect(root.querySelector('.mute-open-btn')).toBeNull();
  });

  it('a kernel plugin button lands directly in the toolbar too', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const hud = new TopHUD(root, makeKernel(root));

    hud.registerButton({ id: 'geo', icon: '🌍', label: 'Weather', onClick: () => undefined });

    const toolbar = root.querySelector('#hud-icon-toolbar')!;
    expect(toolbar.querySelector('.geo-open-btn')).not.toBeNull();
  });
});

// M48 — EPIC-36 §1. The HUD badge reflects the player's own chosen name,
// not the fixed archetype label, once one has been set in the origin flow.
describe('TopHUD player-name badge', () => {
  it('shows the chosen name\'s first letter and a full-name tooltip', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing' },
      player: { ...INITIAL_STATE.player, classRole: 'pip', name: 'Rosa' },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const badge = root.querySelector('.hud-badge')!;
    expect(badge.textContent).toBe('R');
    expect(badge.getAttribute('title')).toBe('Rosa');
  });

  it('falls back to the classRole label when name is somehow empty', () => {
    useGameStore.setState({
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing' },
      player: { ...INITIAL_STATE.player, classRole: 'morgan', name: '' },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    expect(root.querySelector('.hud-badge')!.textContent).toBe('M');
  });
});

describe('TopHUD context action and interactive flows', () => {
  beforeEach(() => resetStore());

  it('sets, triggers, and hides context action button', () => {
    const root = document.createElement('div');
    root.id = 'ui-root';
    document.body.appendChild(root);

    const hud = new TopHUD(root, makeKernel(root));
    const actionSpy = vi.fn();

    hud.setAction('Speak with Sal', actionSpy);
    const actionBtn = root.querySelector<HTMLButtonElement>('.context-action-button')!;
    expect(actionBtn).not.toBeNull();
    expect(actionBtn.hidden).toBe(false);
    expect(actionBtn.textContent).toContain('Speak with Sal');
    expect(actionBtn.textContent).toContain('E');

    // Trigger action via button click
    actionBtn.click();
    expect(actionSpy).toHaveBeenCalledTimes(1);

    // Trigger action via programmatic triggerAction()
    hud.triggerAction();
    expect(actionSpy).toHaveBeenCalledTimes(2);

    // Hide action
    hud.hideAction();
    expect(actionBtn.hidden).toBe(true);

    // Triggering when hidden does nothing
    hud.triggerAction();
    expect(actionSpy).toHaveBeenCalledTimes(2);
  });

  it('updates zone and hides on select phase', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const hud = new TopHUD(root, makeKernel(root));

    hud.setZone('Canal District');
    expect(root.querySelector('#hud-zone')?.textContent).toBe('Canal District');

    // Transition to select phase
    useGameStore.setState({
      ...useGameStore.getState(),
      meta: { ...useGameStore.getState().meta, phase: 'select' },
    });

    expect((root.querySelector('#top-hud') as HTMLElement).hidden).toBe(true);
    expect((root.querySelector('.end-day-btn') as HTMLElement).hidden).toBe(true);
  });

  it('renders barometer and active quest chips when state contains them', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    useGameStore.setState({
      ...useGameStore.getState(),
      pulseState: {
        multipliers: {
          food: 1.25,
          energy: 0.9,
          wage: 1.0,
          transit: 1.0,
          heat: 1.0,
          migrant: 1.0,
        },
        fetchedAt: new Date().toISOString(),
        source: 'live',
      },
      worldQuests: {
        activeId: 'fund-the-kitchen',
        completedIds: [],
      },
    });

    const baro = root.querySelector('#hud-barometer') as HTMLElement;
    expect(baro.hidden).toBe(false);
    expect(baro.textContent).toContain('🧺 +25%');
    expect(baro.textContent).toContain('⚡ -10%');

    const obj = root.querySelector('#hud-objective') as HTMLElement;
    expect(obj.hidden).toBe(false);
  });

  it('triggers end day flow and opens broadsheet modal', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));

    const endDayBtn = root.querySelector<HTMLButtonElement>('.end-day-btn')!;
    expect(endDayBtn).not.toBeNull();
    endDayBtn.click();

    // Give microtasks time to execute async onEndDay
    await new Promise((r) => setTimeout(r, 20));

    const broadsheet = root.querySelector('.broadsheet-overlay') as HTMLElement;
    expect(broadsheet).not.toBeNull();
    expect(broadsheet.hidden).toBe(false);
  });
});


// 2026-09-29 launch audit §1.6 — the active quest can be dropped (two-step).
describe('TopHUD objective chip', () => {
  beforeEach(() => resetStore());

  it('drops the active quest only after a confirming second click', () => {
    useGameStore.setState(s => ({ worldQuests: { ...s.worldQuests, activeId: 'fund-the-kitchen' } }));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));
    const drop = () => root.querySelector<HTMLButtonElement>('.hud-objective-drop')!;
    drop().click();
    expect(useGameStore.getState().worldQuests.activeId).toBe('fund-the-kitchen');
    expect(drop().textContent).toContain('Drop quest?');
    drop().click();
    expect(useGameStore.getState().worldQuests.activeId).toBeNull();
  });

  it('shows consequence warnings such as sleeping rough', () => {
    useGameStore.setState(s => ({ housing: { ...s.housing, currentFlatId: null } }));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));
    expect(root.querySelector('#hud-status')!.textContent).toMatch(/sleeping rough/i);
  });
});

// 2026-09-29 launch audit §3.5 — online-only features used to open and fail
// with "Could not reach…" for players without an account.
describe('TopHUD online-only features without an account', () => {
  beforeEach(() => {
    resetStore();
    try { localStorage.removeItem('dcg-token'); } catch { /* no storage */ }
  });

  it('shows a sign-in prompt instead of Common Grounds', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TopHUD(root, makeKernel(root));
    root.querySelector<HTMLButtonElement>('.social-open-btn')!.click();
    expect(root.textContent).toContain('Sign in or create account');
  });
});
