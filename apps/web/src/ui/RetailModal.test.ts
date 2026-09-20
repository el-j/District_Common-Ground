// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

import { RetailModal } from './RetailModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { MATERIAL_TOKENS, MATERIAL_CATEGORY, MATERIAL_PRICES } from '../core/simulation/Materials';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

const rawTokens = MATERIAL_TOKENS.filter(t => MATERIAL_CATEGORY[t] === 'raw');
const salvageTokens = MATERIAL_TOKENS.filter(t => MATERIAL_CATEGORY[t] === 'salvage');

describe('RetailModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('only stocks materials from the given category', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new RetailModal(root, 'raw', 'Supermarket');

    expect(root.querySelectorAll('.shop-card')).toHaveLength(rawTokens.length);
    for (const t of salvageTokens) expect(root.querySelector(`[data-buy="${t}"]`)).toBeNull();
  });

  it('disables purchase buttons the player cannot afford', () => {
    resetStore({ player: { ...INITIAL_STATE.player, cash: 0 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new RetailModal(root, 'salvage', 'Baumarkt');

    const anyToken = salvageTokens[0]!;
    expect(root.querySelector<HTMLButtonElement>(`[data-buy="${anyToken}"]`)!.disabled).toBe(true);
  });

  it('buying a material deducts cash, adds inventory, and re-renders held count', () => {
    resetStore({ player: { ...INITIAL_STATE.player, cash: 100 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new RetailModal(root, 'raw', 'Supermarket');

    const token = rawTokens[0]!;
    const price = MATERIAL_PRICES[token];
    root.querySelector<HTMLButtonElement>(`[data-buy="${token}"]`)!.click();

    expect(playUIClick).toHaveBeenCalledTimes(1);
    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    const { player, inventory } = useGameStore.getState();
    expect(player.cash).toBe(100 - price);
    expect(inventory.materials[token]).toBe(1);
    expect(root.querySelector('.shop-item-category')!.textContent).toContain('held 1');
  });

  it("shows a can't-afford status message and does not spend cash when clicking a disabled buy button is forced", () => {
    resetStore({ player: { ...INITIAL_STATE.player, cash: 0 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new RetailModal(root, 'raw', 'Supermarket');

    const btn = root.querySelector<HTMLButtonElement>(`[data-buy="${rawTokens[0]}"]`)!;
    btn.disabled = false; // simulate a stale/forced click past the disabled guard
    btn.click();

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Not enough cash/i);
    expect(useGameStore.getState().player.cash).toBe(0);
  });
});
