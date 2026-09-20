// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

import { HousingModal } from './HousingModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { HOUSING_OPTIONS } from '../core/simulation/HousingOptions';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('HousingModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('renders one card per housing option, none marked current when unhoused', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HousingModal(root, [...HOUSING_OPTIONS]);

    const cards = root.querySelectorAll('.shop-card');
    expect(cards).toHaveLength(HOUSING_OPTIONS.length);
    expect(root.querySelectorAll('.shop-card--owned')).toHaveLength(0);
    expect(root.querySelectorAll('[data-rent]')).toHaveLength(HOUSING_OPTIONS.length);
  });

  it('shows recurring cash/energy/stress deltas as chips', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HousingModal(root, [...HOUSING_OPTIONS]);

    const firstCard = root.querySelector('.shop-card')!;
    // pips-courier-room: cashDelta -5, stressDelta -2, energyDelta 0 (no chip)
    expect(firstCard.textContent).toContain('-5 Cash/day');
    expect(firstCard.textContent).toContain('-2 Stress/day');
    expect(firstCard.textContent).not.toContain('Energy/day');
  });

  it('renting a flat updates the store and re-renders the card as current', () => {
    resetStore({ meta: { ...INITIAL_STATE.meta, day: 5 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HousingModal(root, [...HOUSING_OPTIONS]);

    root.querySelector<HTMLButtonElement>(`[data-rent="${HOUSING_OPTIONS[0]!.id}"]`)!.click();

    expect(playUIClick).toHaveBeenCalledTimes(1);
    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    const { housing } = useGameStore.getState();
    expect(housing.currentFlatId).toBe(HOUSING_OPTIONS[0]!.id);
    expect(housing.movedInOnDay).toBe(5);
    expect(root.querySelector('.shop-card--owned')).not.toBeNull();
    expect(root.querySelector('[data-moveout]')).not.toBeNull();
  });

  it('moving out clears the current flat', () => {
    resetStore({ housing: { ...INITIAL_STATE.housing, currentFlatId: HOUSING_OPTIONS[0]!.id, movedInOnDay: 2 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HousingModal(root, [...HOUSING_OPTIONS]);

    root.querySelector<HTMLButtonElement>('[data-moveout]')!.click();

    expect(useGameStore.getState().housing.currentFlatId).toBeNull();
    expect(root.querySelector('[data-moveout]')).toBeNull();
  });
});
