import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './useGameStore';
import {
  setArchetype, spendCash, gainCash, spendEnergy, advanceDay, updateCommonsProgress, collectMaterial, buyMaterial,
  learnRecipe, collectCookbook, craftRecipe, sellItem, rentFlat, moveOut, placeFurniture, removeFurniture, travelToRegion,
  sanitizePlayerName, setPlayerName, setPlayerGender, setPlayerAppearance, beginFromFamilyTemplate, setHousingVisitable,
} from './actions';
import { FAMILY_TEMPLATES } from '../simulation/FamilyTemplates';

function resetStore() {
  useGameStore.setState({
    meta: { day: 1, tick: 0, activeSkin: 'default', skinRevision: 0, phase: 'select', lastAssemblyDay: 0, regionCode: 'GENERIC' },
    player: { classRole: null, cash: 0, energy: 0, maxEnergy: 100, socialTrust: 0, stressLevel: 0, position: { x: 0, y: 0 }, facing: 'down', lastWorkedDay: null, name: '', gender: 'prefer-not-to-say', appearance: 'APPEARANCE_TONE_1' },
    commons: { resilienceScore: 0, solarGridProgress: 0, kitchenProgress: 0, legalFundProgress: 0, toolLibraryProgress: 0, landTrustProgress: 0, constructionSpeedBuff: 0, greenhouseUnlocked: false, safeHavenUnlocked: false },
    crisisState: { activeCrisisId: null, pendingQueue: [], historyLog: [] },
    // M38 — explicit reset so collectMaterial's tests below never inherit
    // leftover material counts from test ordering elsewhere in the suite.
    inventory: { materials: {}, collectedScavengePoints: [] },
    // M39 — same explicit-reset rationale, one slice up.
    crafting: { knownRecipes: [], mastery: {}, craftedItems: {}, collectedCookbookPoints: [] },
    // M43 — same explicit-reset rationale, one slice up again.
    housing: { currentFlatId: null, movedInOnDay: null, furniture: [], visitable: false },
    // M44 — same explicit-reset rationale, one slice up again.
    world: { currentRegionId: 'REGION_COMMON_GROUND' },
    // M47 — same explicit-reset rationale, one slice up again.
    origin: { familyTemplateId: null },
    // M35 — same explicit-reset rationale, one slice up again: without this,
    // a leaked `activeId` from a WorldQuest test elsewhere in this file
    // could make an unrelated updateCommonsProgress() call here silently
    // complete a quest and mutate player stats.
    worldQuests: { activeId: null, completedIds: [] },
  });
}

describe('setArchetype', () => {
  beforeEach(resetStore);

  it('seeds pip stats correctly', () => {
    setArchetype('pip');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(25);
    expect(player.energy).toBe(80);
    expect(player.socialTrust).toBe(40);
    expect(player.stressLevel).toBe(60);
    expect(player.classRole).toBe('pip');
  });

  it('seeds morgan stats correctly', () => {
    setArchetype('morgan');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(240);
    expect(player.energy).toBe(40);
    expect(player.socialTrust).toBe(25);
    expect(player.stressLevel).toBe(45);
  });

  it('seeds arthur stats correctly', () => {
    setArchetype('arthur');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(1200);
    expect(player.energy).toBe(65);
    expect(player.socialTrust).toBe(10);
    expect(player.stressLevel).toBe(30);
  });

  it('sets phase to playing', () => {
    setArchetype('pip');
    expect(useGameStore.getState().meta.phase).toBe('playing');
  });
});

describe('spendCash', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip'); // starts with $25
  });

  it('deducts cash', () => {
    spendCash(10);
    expect(useGameStore.getState().player.cash).toBe(15);
  });

  it('never goes below 0', () => {
    spendCash(1000);
    expect(useGameStore.getState().player.cash).toBe(0);
  });
});

describe('gainCash', () => {
  beforeEach(resetStore);

  it('adds cash', () => {
    gainCash(50);
    expect(useGameStore.getState().player.cash).toBe(50);
  });
});

describe('spendEnergy', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip'); // starts with 80 energy
  });

  it('deducts energy', () => {
    spendEnergy(20);
    expect(useGameStore.getState().player.energy).toBe(60);
  });

  it('never goes below 0', () => {
    spendEnergy(9999);
    expect(useGameStore.getState().player.energy).toBe(0);
  });
});

describe('updateCommonsProgress — Safe Haven ending', () => {
  beforeEach(resetStore);

  it('unlocks safeHavenUnlocked exactly when landTrustProgress first reaches 100', () => {
    updateCommonsProgress('landTrustProgress', 60);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(false);

    updateCommonsProgress('landTrustProgress', 40);
    expect(useGameStore.getState().commons.landTrustProgress).toBe(100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
  });

  it('does not unlock for other nodes reaching 100', () => {
    updateCommonsProgress('kitchenProgress', 100);
    expect(useGameStore.getState().commons.kitchenProgress).toBe(100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(false);
  });

  it('stays true and does not error on further contributions once unlocked', () => {
    updateCommonsProgress('landTrustProgress', 100);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
    updateCommonsProgress('landTrustProgress', 5);
    expect(useGameStore.getState().commons.safeHavenUnlocked).toBe(true);
  });
});

describe('advanceDay', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip');
  });

  it('increments day', () => {
    advanceDay();
    expect(useGameStore.getState().meta.day).toBe(2);
  });
});

// M38 — EPIC-33 §1. Materials, Scavenging & Inventory Foundation.
describe('collectMaterial', () => {
  beforeEach(resetStore);

  it('adds the material amount to inventory and marks the point collected', () => {
    collectMaterial('test-point-1', 'MATERIAL_SCRAP_METAL', 2);
    const { inventory } = useGameStore.getState();
    expect(inventory.materials['MATERIAL_SCRAP_METAL']).toBe(2);
    expect(inventory.collectedScavengePoints).toEqual(['test-point-1']);
  });

  it('stacks repeated collection of the same material from different points', () => {
    collectMaterial('point-a', 'MATERIAL_WOOD', 3);
    collectMaterial('point-b', 'MATERIAL_WOOD', 4);
    expect(useGameStore.getState().inventory.materials['MATERIAL_WOOD']).toBe(7);
  });

  it('is idempotent — collecting the same point id twice only grants it once', () => {
    collectMaterial('test-point-1', 'MATERIAL_IRON', 5);
    collectMaterial('test-point-1', 'MATERIAL_IRON', 5);
    const { inventory } = useGameStore.getState();
    expect(inventory.materials['MATERIAL_IRON']).toBe(5);
    expect(inventory.collectedScavengePoints).toEqual(['test-point-1']);
  });
});

// M39 — EPIC-33 §1/§2. Recipes, Cookbooks & Crafting Stations.
// M42 §2 — EPIC-34. Closes M38 §3's MATERIAL_PRICES forward dependency.
describe('buyMaterial', () => {
  beforeEach(resetStore);

  it('fails and changes nothing when the player cannot afford it', () => {
    setArchetype('pip'); // $25
    const result = buyMaterial('MATERIAL_ELECTRONIC_COMPONENT', 10); // 10*8=80
    expect(result).toEqual({ ok: false });
    const state = useGameStore.getState();
    expect(state.player.cash).toBe(25);
    expect(state.inventory.materials['MATERIAL_ELECTRONIC_COMPONENT']).toBeUndefined();
  });

  it('spends cash and adds to inventory on a successful purchase', () => {
    setArchetype('pip'); // $25
    const result = buyMaterial('MATERIAL_WOOD', 3); // 3*3=9
    expect(result).toEqual({ ok: true, cost: 9 });
    const state = useGameStore.getState();
    expect(state.player.cash).toBe(16);
    expect(state.inventory.materials['MATERIAL_WOOD']).toBe(3);
  });

  it('stacks onto existing inventory across repeated purchases', () => {
    setArchetype('arthur'); // $1200
    buyMaterial('MATERIAL_SCRAP_METAL', 2);
    buyMaterial('MATERIAL_SCRAP_METAL', 5);
    expect(useGameStore.getState().inventory.materials['MATERIAL_SCRAP_METAL']).toBe(7);
  });
});

describe('learnRecipe', () => {
  beforeEach(resetStore);

  it('adds a recipe to knownRecipes', () => {
    learnRecipe('RECIPE_SCRAP_STOOL');
    expect(useGameStore.getState().crafting.knownRecipes).toEqual(['RECIPE_SCRAP_STOOL']);
  });

  it('is idempotent — learning the same recipe twice does not duplicate it', () => {
    learnRecipe('RECIPE_SCRAP_STOOL');
    learnRecipe('RECIPE_SCRAP_STOOL');
    expect(useGameStore.getState().crafting.knownRecipes).toEqual(['RECIPE_SCRAP_STOOL']);
  });
});

describe('collectCookbook', () => {
  beforeEach(resetStore);

  it('learns the recipe and marks the point collected', () => {
    collectCookbook('cookbook-point-1', 'RECIPE_PLANTER_BOX');
    const { crafting } = useGameStore.getState();
    expect(crafting.knownRecipes).toEqual(['RECIPE_PLANTER_BOX']);
    expect(crafting.collectedCookbookPoints).toEqual(['cookbook-point-1']);
  });

  it('is idempotent per point id', () => {
    collectCookbook('cookbook-point-1', 'RECIPE_PLANTER_BOX');
    collectCookbook('cookbook-point-1', 'RECIPE_PLANTER_BOX');
    expect(useGameStore.getState().crafting.collectedCookbookPoints).toEqual(['cookbook-point-1']);
  });
});

describe('craftRecipe', () => {
  beforeEach(resetStore);

  it('fails with unknown-recipe when the recipe has not been learned', () => {
    collectMaterial('mat-1', 'MATERIAL_SCRAP_METAL', 2);
    collectMaterial('mat-2', 'MATERIAL_IRON', 1);
    const result = craftRecipe('RECIPE_SCRAP_STOOL');
    expect(result).toEqual({ ok: false, reason: 'unknown-recipe' });
  });

  it('fails with missing-materials when known but under-resourced', () => {
    learnRecipe('RECIPE_SCRAP_STOOL');
    const result = craftRecipe('RECIPE_SCRAP_STOOL');
    expect(result).toEqual({ ok: false, reason: 'missing-materials' });
    expect(useGameStore.getState().crafting.craftedItems['ITEM_SCRAP_STOOL']).toBeUndefined();
  });

  it('crafts successfully, consumes materials, raises mastery and records the crafted item', () => {
    learnRecipe('RECIPE_SCRAP_STOOL');
    collectMaterial('mat-1', 'MATERIAL_SCRAP_METAL', 2);
    collectMaterial('mat-2', 'MATERIAL_IRON', 1);

    const result = craftRecipe('RECIPE_SCRAP_STOOL');
    expect(result).toEqual({ ok: true });

    const state = useGameStore.getState();
    expect(state.inventory.materials['MATERIAL_SCRAP_METAL']).toBe(0);
    expect(state.inventory.materials['MATERIAL_IRON']).toBe(0);
    expect(state.crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
    expect(state.crafting.mastery['metalwork']).toBe(1);
  });

  it('stacks craftedItems and mastery across repeated crafts of the same discipline', () => {
    learnRecipe('RECIPE_SCRAP_STOOL');
    collectMaterial('mat-1', 'MATERIAL_SCRAP_METAL', 4);
    collectMaterial('mat-2', 'MATERIAL_IRON', 2);

    craftRecipe('RECIPE_SCRAP_STOOL');
    craftRecipe('RECIPE_SCRAP_STOOL');

    const state = useGameStore.getState();
    expect(state.crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(2);
    expect(state.crafting.mastery['metalwork']).toBe(2);
  });

  it('fails with insufficient-mastery when the recipe needs more than the player has', () => {
    learnRecipe('RECIPE_UPCYCLED_WORKBENCH');
    collectMaterial('mat-1', 'MATERIAL_SCRAP_METAL', 4);
    collectMaterial('mat-2', 'MATERIAL_RECLAIMED_WOOD', 3);
    collectMaterial('mat-3', 'MATERIAL_IRON', 2);

    const result = craftRecipe('RECIPE_UPCYCLED_WORKBENCH');
    expect(result).toEqual({ ok: false, reason: 'insufficient-mastery' });
  });

  it('fails with requires-crafting-station for an advanced recipe even with mastery and materials, unless atStation is passed', () => {
    learnRecipe('RECIPE_UPCYCLED_WORKBENCH');
    useGameStore.setState(state => ({ crafting: { ...state.crafting, mastery: { metalwork: 2 } } }));
    collectMaterial('mat-1', 'MATERIAL_SCRAP_METAL', 4);
    collectMaterial('mat-2', 'MATERIAL_RECLAIMED_WOOD', 3);
    collectMaterial('mat-3', 'MATERIAL_IRON', 2);

    expect(craftRecipe('RECIPE_UPCYCLED_WORKBENCH')).toEqual({ ok: false, reason: 'requires-crafting-station' });
    expect(craftRecipe('RECIPE_UPCYCLED_WORKBENCH', true)).toEqual({ ok: true });
  });

  // M40 §3 — a deep-chain craft (radio) consumes a previously crafted item
  // (tools), not just raw materials.
  it('consumes crafted itemInputs on a successful craft, leaving other crafted items untouched', () => {
    learnRecipe('RECIPE_BASIC_TOOLS');
    learnRecipe('RECIPE_SALVAGE_RADIO');
    collectMaterial('m1', 'MATERIAL_SCRAP_METAL', 2);
    collectMaterial('m2', 'MATERIAL_WIRE', 3);
    collectMaterial('m3', 'MATERIAL_GLASS', 1);
    collectMaterial('m4', 'MATERIAL_ELECTRONIC_COMPONENT', 2);

    expect(craftRecipe('RECIPE_BASIC_TOOLS')).toEqual({ ok: true });
    expect(useGameStore.getState().crafting.craftedItems['ITEM_BASIC_TOOLS']).toBe(1);

    // electronics mastery is 0 — RECIPE_SALVAGE_RADIO needs 1.
    expect(craftRecipe('RECIPE_SALVAGE_RADIO')).toEqual({ ok: false, reason: 'insufficient-mastery' });

    useGameStore.setState(state => ({ crafting: { ...state.crafting, mastery: { ...state.crafting.mastery, electronics: 1 } } }));
    expect(craftRecipe('RECIPE_SALVAGE_RADIO')).toEqual({ ok: true });

    const state = useGameStore.getState();
    expect(state.crafting.craftedItems['ITEM_BASIC_TOOLS']).toBe(0);
    expect(state.crafting.craftedItems['ITEM_SALVAGE_RADIO']).toBe(1);
  });

  it('the full computer chain resolves end-to-end through the real actions', () => {
    learnRecipe('RECIPE_BASIC_TOOLS');
    learnRecipe('RECIPE_SALVAGE_RADIO');
    learnRecipe('RECIPE_CIRCUIT_BOARD');
    learnRecipe('RECIPE_UPCYCLED_COMPUTER');

    collectMaterial('m1', 'MATERIAL_SCRAP_METAL', 4); // 2 for tools, 2 for circuit board
    collectMaterial('m2', 'MATERIAL_WIRE', 3);
    collectMaterial('m3', 'MATERIAL_GLASS', 1);
    collectMaterial('m4', 'MATERIAL_ELECTRONIC_COMPONENT', 2);
    collectMaterial('m5', 'MATERIAL_RESIN', 2);
    collectMaterial('m6', 'MATERIAL_RUBBER', 2);

    craftRecipe('RECIPE_BASIC_TOOLS'); // metalwork mastery -> 1

    useGameStore.setState(state => ({ crafting: { ...state.crafting, mastery: { ...state.crafting.mastery, electronics: 1 } } }));
    expect(craftRecipe('RECIPE_SALVAGE_RADIO')).toEqual({ ok: true }); // electronics mastery -> 2

    expect(craftRecipe('RECIPE_CIRCUIT_BOARD')).toEqual({ ok: true }); // electronics mastery -> 3

    const result = craftRecipe('RECIPE_UPCYCLED_COMPUTER');
    expect(result).toEqual({ ok: true });
    expect(useGameStore.getState().crafting.craftedItems['ITEM_UPCYCLED_COMPUTER']).toBe(1);
  });
});

describe('sellItem', () => {
  beforeEach(resetStore);

  it('fails with not-sellable for a pure-component item', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_BASIC_TOOLS: 1 } } }));
    expect(sellItem('ITEM_BASIC_TOOLS')).toEqual({ ok: false, reason: 'not-sellable' });
  });

  it('fails with none-held when the player does not have the item', () => {
    expect(sellItem('ITEM_SCRAP_STOOL')).toEqual({ ok: false, reason: 'none-held' });
  });

  it('sells a held sellable item, paying cash and decrementing the held count', () => {
    setArchetype('pip'); // $25
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 2 } } }));

    const result = sellItem('ITEM_SCRAP_STOOL');
    expect(result.ok).toBe(true);
    expect(result.amount).toBe(8); // base 8, mastery 0 -> 1.0x

    const state = useGameStore.getState();
    expect(state.player.cash).toBe(33);
    expect(state.crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
  });

  it('scales the payout with the item\'s discipline mastery', () => {
    setArchetype('pip');
    useGameStore.setState(state => ({
      crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 }, mastery: { metalwork: 10 } },
    }));
    const result = sellItem('ITEM_SCRAP_STOOL');
    expect(result.amount).toBe(16); // base 8 * 2.0x at mastery 10
  });
});

// M43 — EPIC-34 §1, absorbing EPIC-32's M36 scope.
describe('rentFlat / moveOut', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip');
  });

  it('sets currentFlatId and movedInOnDay', () => {
    rentFlat('pips-courier-room');
    const { housing } = useGameStore.getState();
    expect(housing.currentFlatId).toBe('pips-courier-room');
    expect(housing.movedInOnDay).toBe(useGameStore.getState().meta.day);
  });

  it('switching flats never clears existing furniture', () => {
    rentFlat('pips-courier-room');
    useGameStore.setState(state => ({
      housing: { ...state.housing, furniture: [{ instanceId: 'f1', item: 'ITEM_SCRAP_STOOL', slotIndex: 0 }] },
    }));
    rentFlat('block-b-shared');
    expect(useGameStore.getState().housing.furniture).toEqual([{ instanceId: 'f1', item: 'ITEM_SCRAP_STOOL', slotIndex: 0 }]);
  });

  it('moveOut clears currentFlatId and movedInOnDay (no fixed home is a valid state)', () => {
    rentFlat('pips-courier-room');
    moveOut();
    const { housing } = useGameStore.getState();
    expect(housing.currentFlatId).toBeNull();
    expect(housing.movedInOnDay).toBeNull();
  });

  // M54 — EPIC-38 §1.
  it('setHousingVisitable() toggles the opt-in flag and defaults false', () => {
    expect(useGameStore.getState().housing.visitable).toBe(false);
    setHousingVisitable(true);
    expect(useGameStore.getState().housing.visitable).toBe(true);
    setHousingVisitable(false);
    expect(useGameStore.getState().housing.visitable).toBe(false);
  });

  it('advanceDay() folds the rented flat\'s consequences into the daily tick', () => {
    const before = useGameStore.getState().player.cash;
    rentFlat('pips-courier-room'); // cashDelta: -5
    advanceDay();
    const after = useGameStore.getState().player.cash;
    // pip's own daily earn/upkeep math already nets some amount; asserting
    // the housing rent specifically requires comparing against a no-housing
    // baseline rather than a fixed number.
    resetStore();
    setArchetype('pip');
    useGameStore.setState(s => ({ player: { ...s.player, cash: before } }));
    advanceDay();
    const afterNoHousing = useGameStore.getState().player.cash;
    expect(after).toBe(afterNoHousing - 5);
  });
});

describe('placeFurniture / removeFurniture', () => {
  beforeEach(() => {
    resetStore();
    setArchetype('pip');
  });

  it('fails with not-furniture for a non-furniture-kind item', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SIMPLE_STEW: 1 } } }));
    expect(placeFurniture('ITEM_SIMPLE_STEW', 0)).toEqual({ ok: false, reason: 'not-furniture' });
  });

  it('fails with none-held when the player does not own the item', () => {
    expect(placeFurniture('ITEM_SCRAP_STOOL', 0)).toEqual({ ok: false, reason: 'none-held' });
  });

  it('places a held furniture item, consuming it from craftedItems', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } } }));
    const result = placeFurniture('ITEM_SCRAP_STOOL', 0);
    expect(result.ok).toBe(true);
    const state = useGameStore.getState();
    expect(state.crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(0);
    expect(state.housing.furniture.length).toBe(1);
    expect(state.housing.furniture[0]!.item).toBe('ITEM_SCRAP_STOOL');
    expect(state.housing.furniture[0]!.slotIndex).toBe(0);
  });

  it('fails with slot-occupied when the slot already has something placed', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 2 } } }));
    placeFurniture('ITEM_SCRAP_STOOL', 0);
    expect(placeFurniture('ITEM_SCRAP_STOOL', 0)).toEqual({ ok: false, reason: 'slot-occupied' });
  });

  it('removeFurniture gives the item back and clears the slot', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } } }));
    placeFurniture('ITEM_SCRAP_STOOL', 0);
    const instanceId = useGameStore.getState().housing.furniture[0]!.instanceId;

    removeFurniture(instanceId);
    const state = useGameStore.getState();
    expect(state.housing.furniture).toEqual([]);
    expect(state.crafting.craftedItems['ITEM_SCRAP_STOOL']).toBe(1);
  });

  it('removeFurniture is a no-op for an unknown instanceId', () => {
    useGameStore.setState(state => ({ crafting: { ...state.crafting, craftedItems: { ITEM_SCRAP_STOOL: 1 } } }));
    placeFurniture('ITEM_SCRAP_STOOL', 0);
    removeFurniture('not-a-real-id');
    expect(useGameStore.getState().housing.furniture.length).toBe(1);
  });
});

// M44 — EPIC-35 §2.
describe('travelToRegion', () => {
  beforeEach(resetStore);

  it('defaults to REGION_COMMON_GROUND', () => {
    expect(useGameStore.getState().world.currentRegionId).toBe('REGION_COMMON_GROUND');
  });

  it('updates currentRegionId', () => {
    travelToRegion('REGION_INDUSTRIAL_OUTSKIRTS');
    expect(useGameStore.getState().world.currentRegionId).toBe('REGION_INDUSTRIAL_OUTSKIRTS');
  });

  it('round-trips back to Common Ground', () => {
    travelToRegion('REGION_INDUSTRIAL_OUTSKIRTS');
    travelToRegion('REGION_COMMON_GROUND');
    expect(useGameStore.getState().world.currentRegionId).toBe('REGION_COMMON_GROUND');
  });
});

// M48 — EPIC-36 §1.
describe('sanitizePlayerName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizePlayerName('  Rosa  ')).toBe('Rosa');
  });

  it('collapses internal whitespace runs to a single space', () => {
    expect(sanitizePlayerName('Rosa    Maria')).toBe('Rosa Maria');
  });

  it('strips control characters', () => {
    expect(sanitizePlayerName('Ro\x00sa\x1F')).toBe('Rosa');
  });

  it('caps length at 40 characters', () => {
    const long = 'a'.repeat(60);
    expect(sanitizePlayerName(long).length).toBe(40);
  });
});

describe('setPlayerName', () => {
  beforeEach(resetStore);

  it('sanitizes and stores the name', () => {
    setPlayerName('  Rosa  ');
    expect(useGameStore.getState().player.name).toBe('Rosa');
  });
});

describe('setPlayerGender', () => {
  beforeEach(resetStore);

  it('stores a fixed-option gender with no self-describe text', () => {
    setPlayerGender('non-binary');
    const { player } = useGameStore.getState();
    expect(player.gender).toBe('non-binary');
    expect(player.genderSelfDescribe).toBeUndefined();
  });

  it('stores self-describe text only when gender is self-describe', () => {
    setPlayerGender('self-describe', '  genderfluid  ');
    expect(useGameStore.getState().player.genderSelfDescribe).toBe('genderfluid');
  });

  it('clears self-describe text when switching away from self-describe', () => {
    setPlayerGender('self-describe', 'genderfluid');
    setPlayerGender('woman');
    expect(useGameStore.getState().player.genderSelfDescribe).toBeUndefined();
  });
});

describe('setPlayerAppearance', () => {
  beforeEach(resetStore);

  it('stores the chosen appearance token', () => {
    setPlayerAppearance('APPEARANCE_TONE_3');
    expect(useGameStore.getState().player.appearance).toBe('APPEARANCE_TONE_3');
  });
});

// M49 — EPIC-36 §1/§3.
describe('beginFromFamilyTemplate', () => {
  beforeEach(resetStore);

  it('seeds player stats from the template\'s startingStats directly, not ARCHETYPE_SEEDS', () => {
    const template = FAMILY_TEMPLATES.find(t => t.id === 'landlord-family')!;
    beginFromFamilyTemplate(template.id);

    const { player } = useGameStore.getState();
    expect(player.cash).toBe(template.startingStats.cash);
    expect(player.energy).toBe(template.startingStats.energy);
    expect(player.socialTrust).toBe(template.startingStats.trust);
    expect(player.stressLevel).toBe(template.startingStats.stress);
    expect(player.maxEnergy).toBe(100);
  });

  it('derives classRole from the template via the documented 1:1 mapping', () => {
    FAMILY_TEMPLATES.forEach(template => {
      resetStore();
      beginFromFamilyTemplate(template.id);
      expect(useGameStore.getState().player.classRole).toBe(template.classRole);
    });
  });

  it('records origin.familyTemplateId and flips phase to playing', () => {
    const template = FAMILY_TEMPLATES[0]!;
    beginFromFamilyTemplate(template.id);
    const state = useGameStore.getState();
    expect(state.origin.familyTemplateId).toBe(template.id);
    expect(state.meta.phase).toBe('playing');
  });

  it('is a no-op for an unknown template id', () => {
    const before = useGameStore.getState();
    // @ts-expect-error deliberately invalid id for the negative-path test
    beginFromFamilyTemplate('not-a-real-template');
    const after = useGameStore.getState();
    expect(after.player).toEqual(before.player);
    expect(after.origin).toEqual(before.origin);
  });
});
