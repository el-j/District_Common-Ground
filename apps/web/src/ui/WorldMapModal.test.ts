// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

const { requestTravel } = vi.hoisted(() => ({ requestTravel: vi.fn() }));
// WorldScene.ts imports real Phaser at module scope, which jsdom can't run
// (see resolvePropColor.ts's comment) — mock it with just the one static
// method WorldMapModal actually calls.
vi.mock('../world/WorldScene', () => ({ WorldScene: { requestTravel } }));

import { WorldMapModal } from './WorldMapModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('WorldMapModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('marks the current region and shows a locked region without a travel button', () => {
    resetStore({ world: { currentRegionId: 'REGION_COMMON_GROUND' } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorldMapModal(root);

    const cards = root.querySelectorAll('.shop-card');
    expect(cards).toHaveLength(2);
    expect(root.textContent).toContain('You are here');
    expect(root.textContent).toContain('Locked');
    expect(root.querySelectorAll('[data-travel]')).toHaveLength(0);
  });

  it('shows a Travel button for an unlocked, non-current region (trust threshold met)', () => {
    resetStore({
      world: { currentRegionId: 'REGION_COMMON_GROUND' },
      player: { ...INITIAL_STATE.player, socialTrust: 25 },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorldMapModal(root);

    const travelBtn = root.querySelector<HTMLButtonElement>('[data-travel="REGION_INDUSTRIAL_OUTSKIRTS"]');
    expect(travelBtn).not.toBeNull();
  });

  it('travelling successfully plays the chime and closes the modal', () => {
    vi.useFakeTimers();
    requestTravel.mockReturnValue(true);
    resetStore({
      world: { currentRegionId: 'REGION_COMMON_GROUND' },
      player: { ...INITIAL_STATE.player, socialTrust: 25 },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new WorldMapModal(root, onClose);

    root.querySelector<HTMLButtonElement>('[data-travel="REGION_INDUSTRIAL_OUTSKIRTS"]')!.click();
    vi.runAllTimers();

    expect(requestTravel).toHaveBeenCalledWith('REGION_INDUSTRIAL_OUTSKIRTS');
    expect(playUIClick).toHaveBeenCalledTimes(1);
    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('shows a status message and stays open when travel fails', () => {
    requestTravel.mockReturnValue(false);
    resetStore({
      world: { currentRegionId: 'REGION_COMMON_GROUND' },
      player: { ...INITIAL_STATE.player, socialTrust: 25 },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new WorldMapModal(root, onClose);

    root.querySelector<HTMLButtonElement>('[data-travel="REGION_INDUSTRIAL_OUTSKIRTS"]')!.click();

    expect(playSolidarityChime).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Could not travel/i);
  });
});
