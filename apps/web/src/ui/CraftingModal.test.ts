// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));
const { TerminalModalCtor } = vi.hoisted(() => ({ TerminalModalCtor: vi.fn() }));
vi.mock('./TerminalModal', () => ({ TerminalModal: TerminalModalCtor }));

import { CraftingModal } from './CraftingModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  // crafting costs energy since the 2026-09-29 audit — start rested
  useGameStore.setState({ ...INITIAL_STATE, player: { ...INITIAL_STATE.player, energy: 100 }, ...overrides });
}

describe('CraftingModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('shows an empty-state message on the Recipes tab with no known recipes', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/No recipes known/i);
  });

  it('a known recipe with insufficient materials is shown blocked, not craftable', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, knownRecipes: ['RECIPE_SCRAP_STOOL'] } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);

    expect(root.querySelector('[data-craft="RECIPE_SCRAP_STOOL"]')).toBeNull();
    expect(root.textContent).toContain('Missing materials');
  });

  it('crafting a fully-stocked known recipe consumes materials and adds the crafted item', () => {
    resetStore({
      crafting: { ...INITIAL_STATE.crafting, knownRecipes: ['RECIPE_SCRAP_STOOL'] },
      inventory: { ...INITIAL_STATE.inventory, materials: { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 } },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);

    root.querySelector<HTMLButtonElement>('[data-craft="RECIPE_SCRAP_STOOL"]')!.click();

    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    const { inventory, crafting } = useGameStore.getState();
    expect(inventory.materials['MATERIAL_SCRAP_METAL']).toBe(0);
    expect(inventory.materials['MATERIAL_IRON']).toBe(0);
    expect(crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
    expect(crafting.mastery['metalwork']).toBe(1);
  });

  it('switching to the Inventory tab shows held crafted items with sell buttons', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 2 } } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);

    root.querySelector<HTMLButtonElement>('[data-tab="inventory"]')!.click();

    expect(root.querySelector('.shop-card')!.textContent).toContain('Held 2×');
    expect(root.querySelector('[data-sell="ITEM_SCRAP_STOOL"]')).not.toBeNull();
  });

  it('selling a held item adds cash and decrements the held count', () => {
    resetStore({
      player: { ...INITIAL_STATE.player, cash: 0 },
      crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);
    root.querySelector<HTMLButtonElement>('[data-tab="inventory"]')!.click();

    root.querySelector<HTMLButtonElement>('[data-sell="ITEM_SCRAP_STOOL"]')!.click();

    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    const { player, crafting } = useGameStore.getState();
    expect(player.cash).toBe(8); // ITEM_SCRAP_STOOL baseSellValue at mastery 0
    expect(crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(0);
  });

  it('using the upcycled computer opens a TerminalModal via #ui-root', () => {
    resetStore({ crafting: { ...INITIAL_STATE.crafting, craftedItems: { ITEM_UPCYCLED_COMPUTER: 1 } } });
    const uiRoot = document.createElement('div');
    uiRoot.id = 'ui-root';
    document.body.appendChild(uiRoot);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);
    root.querySelector<HTMLButtonElement>('[data-tab="inventory"]')!.click();

    root.querySelector<HTMLButtonElement>('[data-use="ITEM_UPCYCLED_COMPUTER"]')!.click();

    expect(TerminalModalCtor).toHaveBeenCalledTimes(1);
    expect(TerminalModalCtor).toHaveBeenCalledWith(uiRoot);
  });

  it('an advanced recipe stays blocked outside a matching crafting station', () => {
    resetStore({
      crafting: {
        ...INITIAL_STATE.crafting,
        knownRecipes: ['RECIPE_UPCYCLED_WORKBENCH'],
        mastery: { metalwork: 5 },
      },
      inventory: { ...INITIAL_STATE.inventory, materials: { MATERIAL_SCRAP_METAL: 20, MATERIAL_IRON: 20 } },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root); // no station passed

    expect(root.querySelector('[data-craft="RECIPE_UPCYCLED_WORKBENCH"]')).toBeNull();
    expect(root.textContent).toContain('Craft this at a workshop station');
  });

  it('shows each recipe\'s energy cost and blocks crafting when too tired', () => {
    resetStore({
      player: { ...INITIAL_STATE.player, energy: 1 },
      crafting: { ...INITIAL_STATE.crafting, knownRecipes: ['RECIPE_SCRAP_STOOL'] },
      inventory: { ...INITIAL_STATE.inventory, materials: { MATERIAL_SCRAP_METAL: 5, MATERIAL_IRON: 5 } },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CraftingModal(root);

    expect(root.textContent).toContain('⚡ 4 energy');
    expect(root.querySelector('[data-craft="RECIPE_SCRAP_STOOL"]')).toBeNull();
    expect(root.textContent).toContain('Too tired');
  });
});
