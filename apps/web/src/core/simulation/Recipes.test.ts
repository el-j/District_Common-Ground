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

  // Closes the mutation-testing gap the 2026-09-20/21 Stryker audit found:
  // most recipes' exact `inputs`/`tier`/`minMastery`/`label` were never
  // asserted directly (only exercised indirectly through hand-typed material
  // maps in checkCraftEligibility tests) — a real balance-data typo (e.g. a
  // swapped material amount) would ship silently. One table, checked against
  // the real docs/task-doc-recorded recipe design.
  it('every recipe matches its recorded design exactly (inputs, itemInputs, tier, minMastery, output)', () => {
    expect(RECIPES).toEqual({
      RECIPE_SCRAP_STOOL: {
        id: 'RECIPE_SCRAP_STOOL', label: 'Scrap-Metal Stool', discipline: 'metalwork',
        inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 }, output: 'ITEM_SCRAP_STOOL', minMastery: 0, tier: 'basic',
      },
      RECIPE_PLANTER_BOX: {
        id: 'RECIPE_PLANTER_BOX', label: 'Reclaimed Planter Box', discipline: 'woodwork',
        inputs: { MATERIAL_RECLAIMED_WOOD: 2, MATERIAL_WOOD: 1 }, output: 'ITEM_PLANTER_BOX', minMastery: 0, tier: 'basic',
      },
      RECIPE_MENDED_JACKET: {
        id: 'RECIPE_MENDED_JACKET', label: 'Mended Jacket', discipline: 'textiles',
        inputs: { MATERIAL_WOOL: 2, MATERIAL_COTTON: 1, MATERIAL_LEATHER: 1 }, output: 'ITEM_MENDED_JACKET', minMastery: 0, tier: 'basic',
      },
      RECIPE_WIRED_LAMP: {
        id: 'RECIPE_WIRED_LAMP', label: 'Wired Salvage Lamp', discipline: 'electronics',
        inputs: { MATERIAL_WIRE: 2, MATERIAL_GLASS: 1, MATERIAL_ELECTRONIC_COMPONENT: 1 }, output: 'ITEM_WIRED_LAMP', minMastery: 0, tier: 'basic',
      },
      RECIPE_FORAGED_POUCH: {
        id: 'RECIPE_FORAGED_POUCH', label: 'Foraged Goods Pouch', discipline: 'horticulture',
        inputs: { MATERIAL_MUSHROOM: 2, MATERIAL_RESIN: 1, MATERIAL_LEATHER: 1 }, output: 'ITEM_FORAGED_POUCH', minMastery: 0, tier: 'basic',
      },
      RECIPE_SIMPLE_STEW: {
        id: 'RECIPE_SIMPLE_STEW', label: 'Simple Mushroom Stew', discipline: 'culinary',
        inputs: { MATERIAL_MUSHROOM: 3, MATERIAL_WOOD: 1 }, output: 'ITEM_SIMPLE_STEW', minMastery: 0, tier: 'basic',
      },
      RECIPE_UPCYCLED_WORKBENCH: {
        id: 'RECIPE_UPCYCLED_WORKBENCH', label: 'Upcycled Workbench', discipline: 'metalwork',
        inputs: { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 }, output: 'ITEM_UPCYCLED_WORKBENCH', minMastery: 2, tier: 'advanced',
      },
      RECIPE_UPCYCLED_BIKE: {
        id: 'RECIPE_UPCYCLED_BIKE', label: 'Upcycled Bike', discipline: 'metalwork',
        inputs: { MATERIAL_SCRAP_METAL: 5, MATERIAL_RUBBER: 3, MATERIAL_RECLAIMED_WOOD: 2 }, output: 'ITEM_UPCYCLED_BIKE', minMastery: 3, tier: 'basic',
      },
      RECIPE_BASIC_TOOLS: {
        id: 'RECIPE_BASIC_TOOLS', label: 'Basic Tools', discipline: 'metalwork',
        inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_WIRE: 1 }, output: 'ITEM_BASIC_TOOLS', minMastery: 0, tier: 'basic',
      },
      RECIPE_SALVAGE_RADIO: {
        id: 'RECIPE_SALVAGE_RADIO', label: 'Salvage Radio', discipline: 'electronics',
        inputs: { MATERIAL_GLASS: 1, MATERIAL_WIRE: 2, MATERIAL_ELECTRONIC_COMPONENT: 2 }, itemInputs: { ITEM_BASIC_TOOLS: 1 },
        output: 'ITEM_SALVAGE_RADIO', minMastery: 1, tier: 'basic',
      },
      RECIPE_CIRCUIT_BOARD: {
        id: 'RECIPE_CIRCUIT_BOARD', label: 'Reclaimed Circuit Board', discipline: 'electronics',
        inputs: { MATERIAL_SCRAP_METAL: 2, MATERIAL_RESIN: 2 }, output: 'ITEM_CIRCUIT_BOARD', minMastery: 2, tier: 'basic',
      },
      RECIPE_UPCYCLED_COMPUTER: {
        id: 'RECIPE_UPCYCLED_COMPUTER', label: 'Upcycled Computer', discipline: 'electronics',
        inputs: { MATERIAL_RUBBER: 2 }, itemInputs: { ITEM_SALVAGE_RADIO: 1, ITEM_CIRCUIT_BOARD: 1 },
        output: 'ITEM_UPCYCLED_COMPUTER', minMastery: 3, tier: 'basic',
      },
    });
  });

  it('every ITEM_DEFINITIONS entry matches its recorded kinds, baseSellValue and discipline exactly', () => {
    expect(ITEM_DEFINITIONS).toEqual({
      ITEM_SCRAP_STOOL: { token: 'ITEM_SCRAP_STOOL', label: 'Scrap-Metal Stool', kinds: ['furniture', 'sellable'], baseSellValue: 8, discipline: 'metalwork' },
      ITEM_PLANTER_BOX: { token: 'ITEM_PLANTER_BOX', label: 'Reclaimed Planter Box', kinds: ['furniture', 'sellable'], baseSellValue: 7, discipline: 'woodwork' },
      ITEM_MENDED_JACKET: { token: 'ITEM_MENDED_JACKET', label: 'Mended Jacket', kinds: ['equippable', 'sellable'], baseSellValue: 12, discipline: 'textiles' },
      ITEM_WIRED_LAMP: { token: 'ITEM_WIRED_LAMP', label: 'Wired Salvage Lamp', kinds: ['furniture', 'sellable'], baseSellValue: 10, discipline: 'electronics' },
      ITEM_FORAGED_POUCH: { token: 'ITEM_FORAGED_POUCH', label: 'Foraged Goods Pouch', kinds: ['sellable'], baseSellValue: 6, discipline: 'horticulture' },
      ITEM_SIMPLE_STEW: { token: 'ITEM_SIMPLE_STEW', label: 'Simple Mushroom Stew', kinds: ['sellable'], baseSellValue: 5, discipline: 'culinary' },
      ITEM_UPCYCLED_WORKBENCH: { token: 'ITEM_UPCYCLED_WORKBENCH', label: 'Upcycled Workbench', kinds: ['furniture', 'sellable'], baseSellValue: 25, discipline: 'metalwork' },
      ITEM_BASIC_TOOLS: { token: 'ITEM_BASIC_TOOLS', label: 'Basic Tools', kinds: ['component'], baseSellValue: 0, discipline: 'metalwork' },
      ITEM_SALVAGE_RADIO: { token: 'ITEM_SALVAGE_RADIO', label: 'Salvage Radio', kinds: ['component', 'sellable'], baseSellValue: 18, discipline: 'electronics' },
      ITEM_CIRCUIT_BOARD: { token: 'ITEM_CIRCUIT_BOARD', label: 'Reclaimed Circuit Board', kinds: ['component'], baseSellValue: 0, discipline: 'electronics' },
      ITEM_UPCYCLED_COMPUTER: { token: 'ITEM_UPCYCLED_COMPUTER', label: 'Upcycled Computer', kinds: ['sellable', 'usable'], baseSellValue: 55, discipline: 'electronics' },
      ITEM_UPCYCLED_BIKE: { token: 'ITEM_UPCYCLED_BIKE', label: 'Upcycled Bike', kinds: ['sellable'], baseSellValue: 21, discipline: 'metalwork' },
    });
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

// Closes the mutation-testing gap the 2026-09-20/21 Stryker audit found in
// checkCraftEligibility()/stationSupportsRecipe(): the `.every()` guards and
// the `atStation` default param had no test distinguishing them from a
// weaker `.some()` check or a wrong default.
describe('checkCraftEligibility — coverage gaps', () => {
  it('reports missing-materials when ONE input is satisfied but another is not (distinguishes every() from some())', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL']; // needs MATERIAL_SCRAP_METAL:2, MATERIAL_IRON:1
    const result = checkCraftEligibility(recipe, [recipe.id], { MATERIAL_SCRAP_METAL: 10, MATERIAL_IRON: 0 }, 0);
    expect(result).toEqual({ ok: false, reason: 'missing-materials' });
  });

  it('reports missing-item-inputs when ONE crafted item requirement is satisfied but another is not', () => {
    const computer = RECIPES['RECIPE_UPCYCLED_COMPUTER']; // needs ITEM_SALVAGE_RADIO:1 AND ITEM_CIRCUIT_BOARD:1
    const result = checkCraftEligibility(
      computer, [computer.id], { MATERIAL_RUBBER: 2 }, 3, false,
      { ITEM_SALVAGE_RADIO: 5, ITEM_CIRCUIT_BOARD: 0 },
    );
    expect(result).toEqual({ ok: false, reason: 'missing-item-inputs' });
  });

  it('defaults atStation to false for a basic recipe (succeeds without passing the param at all)', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL'];
    const result = checkCraftEligibility(recipe, [recipe.id], { MATERIAL_SCRAP_METAL: 2, MATERIAL_IRON: 1 }, 0);
    expect(result).toEqual({ ok: true });
  });

  it('defaults atStation to false for an advanced recipe (fails station-gate without passing the param at all)', () => {
    const advanced = RECIPES['RECIPE_UPCYCLED_WORKBENCH'];
    const result = checkCraftEligibility(
      advanced, [advanced.id],
      { MATERIAL_SCRAP_METAL: 4, MATERIAL_RECLAIMED_WOOD: 3, MATERIAL_IRON: 2 },
      2, // sufficient mastery — only the station gate should block this
    );
    expect(result).toEqual({ ok: false, reason: 'requires-crafting-station' });
  });
});

describe('stationSupportsRecipe — coverage gaps', () => {
  it('accepts an advanced-tier station for a BASIC recipe of the same discipline (tier check only applies to advanced recipes)', () => {
    const recipe = RECIPES['RECIPE_SCRAP_STOOL']; // basic, metalwork
    expect(stationSupportsRecipe({ id: 's5', discipline: 'metalwork', requiredTier: 'advanced' }, recipe)).toBe(true);
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
