// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

import { FurnitureEditorModal } from './FurnitureEditorModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('FurnitureEditorModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('renders one card per slot, empty ones offering "Fill slot"', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 3);

    expect(root.querySelectorAll('.shop-card')).toHaveLength(3);
    expect(root.querySelectorAll('[data-slot]')).toHaveLength(3);
  });

  it('an occupied slot shows the placed item and a Remove button instead', () => {
    resetStore({
      housing: { ...INITIAL_STATE.housing, furniture: [{ instanceId: 'f1', item: 'ITEM_SCRAP_STOOL', slotIndex: 0 }] },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    expect(root.querySelector('[data-slot="0"]')).toBeNull();
    expect(root.querySelector('[data-remove="f1"]')).not.toBeNull();
    expect(root.querySelector('.shop-item-title')!.textContent).toContain('Scrap-Metal Stool');
  });

  it('clicking an empty slot opens the crafted-item catalog for it', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    root.querySelector<HTMLButtonElement>('[data-slot="0"]')!.click();

    expect(root.querySelector('[data-place="ITEM_SCRAP_STOOL"]')).not.toBeNull();
    expect(root.querySelector('[data-cancel]')).not.toBeNull();
  });

  it('shows an empty-inventory message when no furniture-kind items are held', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    root.querySelector<HTMLButtonElement>('[data-slot="0"]')!.click();

    expect(root.textContent).toContain('No furniture-kind items in your crafted inventory');
  });

  it('placing an item consumes it from crafted inventory and occupies the slot', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 2 } } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    root.querySelector<HTMLButtonElement>('[data-slot="0"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-place="ITEM_SCRAP_STOOL"]')!.click();

    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    const { crafting, housing } = useGameStore.getState();
    expect(crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
    expect(housing.furniture).toHaveLength(1);
    expect(housing.furniture[0]!.slotIndex).toBe(0);
    // Back on the slot list, no longer showing the catalog.
    expect(root.querySelector('[data-remove]')).not.toBeNull();
  });

  it('removing a placed item returns it to crafted inventory and frees the slot', () => {
    resetStore({
      crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 0 } },
      housing: { ...INITIAL_STATE.housing, furniture: [{ instanceId: 'f1', item: 'ITEM_SCRAP_STOOL', slotIndex: 0 }] },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    root.querySelector<HTMLButtonElement>('[data-remove="f1"]')!.click();

    const { crafting, housing } = useGameStore.getState();
    expect(crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
    expect(housing.furniture).toHaveLength(0);
    expect(root.querySelector('[data-slot="0"]')).not.toBeNull();
  });

  it('the Back button returns from the catalog to the slot list without placing anything', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new FurnitureEditorModal(root, 2);

    root.querySelector<HTMLButtonElement>('[data-slot="0"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-cancel]')!.click();

    expect(useGameStore.getState().housing.furniture).toHaveLength(0);
    expect(root.querySelector('[data-slot="0"]')).not.toBeNull();
  });
});
