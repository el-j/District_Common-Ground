// @vitest-environment jsdom
// TownHallAssembly mounts real DOM nodes and reads inputManager's locked
// flag — needs jsdom, same opt-in pattern as ConstructionModal.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

import { TownHallAssembly } from './TownHallAssembly';
import { useGameStore } from '../core/state/useGameStore';

function resetStore() {
  useGameStore.setState({
    meta: { day: 30, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'playing', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: {
      classRole: 'pip', cash: 50, energy: 50, maxEnergy: 100,
      socialTrust: 40, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null,
    },
    commons: {
      resilienceScore: 20,
      solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0,
      toolLibraryProgress: 0, landTrustProgress: 0,
      constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false,
    },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
  });
}

// M31 Section 4 — this was the one modal in the audit genuinely missing a
// visible × (Escape-only, with just a text hint). See EPIC-31/M31 Section 4.
describe('TownHallAssembly close affordance', () => {
  beforeEach(() => resetStore());

  it('renders a visible × close button', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, () => undefined);

    const closeBtn = root.querySelector<HTMLButtonElement>('.assembly-close');
    expect(closeBtn).not.toBeNull();
    expect(closeBtn!.textContent).toContain('×');
  });

  it('closes and calls onClose when the × is clicked', () => {
    const onClose = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, onClose);

    root.querySelector<HTMLButtonElement>('.assembly-close')!.click();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.town-hall-overlay')).toBeNull();
  });

  it('still closes via Escape (shared bindEscapeClose helper)', () => {
    const onClose = vi.fn();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('records the assembly day on close', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TownHallAssembly(root, () => undefined);

    root.querySelector<HTMLButtonElement>('.assembly-close')!.click();

    expect(useGameStore.getState().meta.lastAssemblyDay).toBe(30);
  });
});
