import { describe, it, expect } from 'vitest';
import {
  RECIPES, RECIPE_IDS, CRAFT_DISCIPLINES, ITEM_DEFINITIONS,
  checkCraftEligibility, consumeRecipeInputs, consumeRecipeItemInputs, stationSupportsRecipe,
  masteryMultiplier, sellValueFor,
} from './Recipes';

// M39/M40 — EPIC-33 §1/§3. See docs/tasks/M39-recipes-cookbooks-and-crafting-stations.md
// and docs/tasks/M40-upcycled-goods-selling-and-deep-crafting-chain.md.
describe('RECIPES catalog', () => {
  it('has 12 hand-authored recipes (7 from M39 + 5 M40 deep-chain), each with a unique output item', () => {
    expect(RECIPE_IDS.length).toBe(12);
    const outputs = new Set(Object.values(RECIPES).map(r => r.output));
    expect(outputs.size).toBe(12);
  });

  it('every recipe output has an ITEM_DEFINITIONS entry, and every item token is produced by exactly one recipe', () => {
    const outputs = Object.values(RECIPES).map(r => r.output);
    outputs.forEach(token => expect(ITEM_DEFINITIONS[token]).toBeDefined());
    expect(Object.keys(ITEM_DEFINITIONS).length).toBe(outputs.length);
  });

  it('every recipe belongs to one of the 6 capped disciplines', () => {
    Object.values(RECIPES).forEach(r => {
      expect(CRAFT_DISCIPLINES).toContain(r.discipline);
    });
  });

  it('every discipline has at least one recipe', () => {
    CRAFT_DISCIPLINES.forEach(d => {
      expect(Object.values(RECIPES).some(r => r.discipline === d)).toBe(true);
    });
  });

  it('exactly one advanced-tier recipe exists, gated by mastery > 0', () => {
    const advanced = Object.values(RECIPES).filter(r => r.tier === 'advanced');
    expect(advanced.length).toBe(1);
    expect(advanced[0]!.minMastery).toBeGreaterThan(0);
  });
});

describe('checkCraftEligibility', () => {
  const recipe = RECIPES['RECIPE_SCRAP_STOOL'];

  it('reports unknown-recipe when not in the known list', () => {
    const result = checkCraftEligibility(recipe, [], { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 }, 0);
    expect(result).toEqual({ ok: false, reason: 'unknown-recipe' });
  });

  it('reports missing-materials when known but under-resourced', () => {
    const result = checkCraftEligibility(recipe, [recipe.id], { MATERIAL_SCRAP_METAL: 1 }, 0);
    expect(result).toEqual({ ok: false, reason: 'missing-materials' });
  });

  it('succeeds when known, sufficiently resourced and mastery met', () => {
    const result = checkCraftEligibility(recipe, [recipe.id], { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 }, 0);
    expect(result).toEqual({ ok: true });
  });

  it('reports insufficient-mastery for the advanced recipe below its threshold', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    const result = checkCraftEligibility(
      advanced, [advanced.id],
      { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 },
      1,
    );
    expect(result).toEqual({ ok: false, reason: 'insufficient-mastery' });
  });

  it('reports requires-crafting-station for an advanced recipe at sufficient mastery but no station', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    const result = checkCraftEligibility(
      advanced, [advanced.id],
      { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 },
      2,
    );
    expect(result).toEqual({ ok: false, reason: 'requires-crafting-station' });
  });

  it('succeeds for an advanced recipe when atStation is true', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    const result = checkCraftEligibility(
      advanced, [advanced.id],
      { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 },
      2, true,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe('consumeRecipeInputs', () => {
  it('subtracts every input amount without mutating the original map', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL'];
    const materials = { MATERIAL_SCRAP_METAL: 5, MATERIAL_IRON: 3, MATERIAL_WOOD: 9 };
    const next = consumeRecipeInputs(recipe, materials);

    expect(next).toEqual({ MATERIAL_SCRAP_METAL: 3, MATERIAL_IRON: 2, MATERIAL_WOOD: 9 });
    expect(materials).toEqual({ MATERIAL_SCRAP_METAL: 5, MATERIAL_IRON: 3, MATERIAL_WOOD: 9 });
  });
});

describe('stationSupportsRecipe', () => {
  it('rejects a station whose discipline does not match the recipe', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL'];
    expect(stationSupportsRecipe({ id: 's1', discipline: 'woodwork', requiredTier: 'basic' }, recipe)).toBe(false);
  });

  it('rejects a basic-tier station for an advanced recipe', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    expect(stationSupportsRecipe({ id: 's2', discipline: 'metalwork', requiredTier: 'basic' }, advanced)).toBe(false);
  });

  it('accepts an advanced-tier station for an advanced recipe of the same discipline', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    expect(stationSupportsRecipe({ id: 's3', discipline: 'metalwork', requiredTier: 'advanced' }, advanced)).toBe(true);
  });

  it('accepts a matching-discipline station for a basic recipe regardless of tier', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL'];
    expect(stationSupportsRecipe({ id: 's4', discipline: 'metalwork', requiredTier: 'basic' }, recipe)).toBe(true);
  });
});

// M40 §3.
describe('masteryMultiplier / sellValueFor', () => {
  it('is 1.0 at mastery 0 and 2.0 at mastery 10 (10% per point)', () => {
    expect(masteryMultiplier(0)).toBe(1);
    expect(masteryMultiplier(10)).toBe(2);
    expect(masteryMultiplier(5)).toBeCloseTo(1.5);
  });

  it('clamps out-of-range mastery instead of producing a runaway multiplier', () => {
    expect(masteryMultiplier(-3)).toBe(1);
    expect(masteryMultiplier(99)).toBe(2);
  });

  it('scales an item base sell value by its discipline mastery, rounded', () => {
    expect(sellValueFor('ITEM_SCRAP_STOOL', 0)).toBe(8);
    expect(sellValueFor('ITEM_SCRAP_STOOL', 10)).toBe(16);
  });

  it('a pure-component item has a base sell value of 0 regardless of mastery', () => {
    expect(sellValueFor('ITEM_BASIC_TOOLS', 10)).toBe(0);
  });
});

// M40 §3 — itemInputs support (deep chains consuming crafted items).
describe('checkCraftEligibility with itemInputs', () => {
  const radio = RECIPES['RECIPE_SALVAGE_RADIO'];
  const materials = { MATERIAL_GLASS: 1, MATERIAL_WIRE: 2, MATERIAL_ELECTRONIC_COMPONENT: 2 };

  it('reports missing-item-inputs when materials are sufficient but the required crafted item is not held', () => {
    const result = checkCraftEligibility(radio, [radio.id], materials, 1, false, {});
    expect(result).toEqual({ ok: false, reason: 'missing-item-inputs' });
  });

  it('succeeds once the required crafted item is held in sufficient quantity', () => {
    const result = checkCraftEligibility(radio, [radio.id], materials, 1, false, { ITEM_BASIC_TOOLS: 1 });
    expect(result).toEqual({ ok: true });
  });

  it('a recipe with no itemInputs ignores the craftedItems map entirely', () => {
    const stool = RECIPES['RECIPE_SCRAP_STOOL'];
    const result = checkCraftEligibility(stool, [stool.id], { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 }, 0, false, {});
    expect(result).toEqual({ ok: true });
  });
});

describe('consumeRecipeItemInputs', () => {
  it('subtracts every itemInput amount without mutating the original map', () => {
    const radio = RECIPES['RECIPE_SALVAGE_RADIO'];
    const craftedItems = { ITEM_BASIC_TOOLS: 2, ITEM_SCRAP_STOOL: 1 };
    const next = consumeRecipeItemInputs(radio, craftedItems);

    expect(next).toEqual({ ITEM_BASIC_TOOLS: 1, ITEM_SCRAP_STOOL: 1 });
    expect(craftedItems).toEqual({ ITEM_BASIC_TOOLS: 2, ITEM_SCRAP_STOOL: 1 });
  });

  it('is a no-op copy for a recipe with no itemInputs', () => {
    const stool = RECIPES['RECIPE_SCRAP_STOOL'];
    const craftedItems = { ITEM_WIRED_LAMP: 3 };
    expect(consumeRecipeItemInputs(stool, craftedItems)).toEqual({ ITEM_WIRED_LAMP: 3 });
  });
});

// M40 §3 — the two flagship chains resolve end-to-end at the data level
// (proving genuine depth, not just one flat crafting step).
describe('flagship chain — the bike', () => {
  it('is craftable at mastery 3 with its listed materials, at basic tier (no station gate)', () => {
    const bike = RECIPES['RECIPE_UPCYCLED_BIKE'];
    const materials = { MATERIAL_SCRAP_METAL: 5, MATERIAL_RUBBER: 3, MATERIAL_RECLAIMED_WOOD: 2 };
    expect(checkCraftEligibility(bike, [bike.id], materials, 3)).toEqual({ ok: true });
    expect(bike.tier).toBe('basic');
  });
});

describe('flagship chain — the computer (tools -> radio -> circuit board -> computer)', () => {
  it('resolves all 4 tiers end-to-end, each consuming the previous tier where the chain says it should', () => {
    const tools = RECIPES['RECIPE_BASIC_TOOLS'];
    const radio = RECIPES['RECIPE_SALVAGE_RADIO'];
    const board = RECIPES['RECIPE_CIRCUIT_BOARD'];
    const computer = RECIPES['RECIPE_UPCYCLED_COMPUTER'];
    const known = [tools.id, radio.id, board.id, computer.id];

    // Tier 1: tools, from raw materials only.
    expect(checkCraftEligibility(tools, known, { MATERIAL_SCRAP_METAL: 2, MATERIAL_WIRE: 1 }, 0)).toEqual({ ok: true });

    // Tier 2: radio needs materials AND a crafted set of tools.
    const radioMaterials = { MATERIAL_GLASS: 1, MATERIAL_WIRE: 2, MATERIAL_ELECTRONIC_COMPONENT: 2 };
    expect(checkCraftEligibility(radio, known, radioMaterials, 1, false, {})).toEqual({ ok: false, reason: 'missing-item-inputs' });
    expect(checkCraftEligibility(radio, known, radioMaterials, 1, false, { ITEM_BASIC_TOOLS: 1 })).toEqual({ ok: true });

    // Tier 3: circuit board, found-only (never taught — see NpcDialogues.ts), materials only.
    expect(checkCraftEligibility(board, known, { MATERIAL_SCRAP_METAL: 2, MATERIAL_RESIN: 2 }, 2)).toEqual({ ok: true });

    // Tier 4: the computer needs materials AND both a radio and a circuit board.
    const computerMaterials = { MATERIAL_RUBBER: 2 };
    expect(checkCraftEligibility(computer, known, computerMaterials, 3, false, { ITEM_SALVAGE_RADIO: 1 }))
      .toEqual({ ok: false, reason: 'missing-item-inputs' });
    expect(checkCraftEligibility(computer, known, computerMaterials, 3, false, { ITEM_SALVAGE_RADIO: 1, ITEM_CIRCUIT_BOARD: 1 }))
      .toEqual({ ok: true });
  });

  it('the finished computer is both sellable and usable (the terminal/BBS affordance)', () => {
    expect(ITEM_DEFINITIONS['ITEM_UPCYCLED_COMPUTER'].kinds).toContain('sellable');
    expect(ITEM_DEFINITIONS['ITEM_UPCYCLED_COMPUTER'].kinds).toContain('usable');
  });
});
