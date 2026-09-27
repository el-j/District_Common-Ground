import { describe, it, expect } from 'vitest';
import { MATERIAL_TOKENS, MATERIAL_CATEGORY, MATERIAL_PRICES, type MaterialToken } from './Materials';

// M38 — EPIC-33 §1. See docs/tasks/M38-materials-scavenging-and-inventory.md.
describe('MaterialToken taxonomy', () => {
  it('has 15 tokens: 9 raw/natural + 6 urban-salvage', () => {
    expect(MATERIAL_TOKENS.length).toBe(15);
    const raw = MATERIAL_TOKENS.filter(t => MATERIAL_CATEGORY[t] === 'raw');
    const salvage = MATERIAL_TOKENS.filter(t => MATERIAL_CATEGORY[t] === 'salvage');
    expect(raw.length).toBe(9);
    expect(salvage.length).toBe(6);
  });

  it('includes every raw material named directly in the vision doc', () => {
    const expected: MaterialToken[] = [
      'MATERIAL_WOOD', 'MATERIAL_STONE', 'MATERIAL_IRON', 'MATERIAL_COAL',
      'MATERIAL_RESIN', 'MATERIAL_WOOL', 'MATERIAL_COTTON', 'MATERIAL_LEATHER', 'MATERIAL_MUSHROOM',
    ];
    expected.forEach(t => {
      expect(MATERIAL_TOKENS).toContain(t);
      expect(MATERIAL_CATEGORY[t]).toBe('raw');
    });
  });

  it('includes the complementary urban-salvage layer', () => {
    const expected: MaterialToken[] = [
      'MATERIAL_SCRAP_METAL', 'MATERIAL_RECLAIMED_WOOD', 'MATERIAL_GLASS',
      'MATERIAL_RUBBER', 'MATERIAL_ELECTRONIC_COMPONENT', 'MATERIAL_WIRE',
    ];
    expected.forEach(t => {
      expect(MATERIAL_TOKENS).toContain(t);
      expect(MATERIAL_CATEGORY[t]).toBe('salvage');
    });
  });

  it('every token has a positive price in the canonical material price table', () => {
    MATERIAL_TOKENS.forEach(t => {
      expect(MATERIAL_PRICES[t]).toBeGreaterThan(0);
    });
  });
});
