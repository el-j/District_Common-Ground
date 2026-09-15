import { describe, it, expect } from 'vitest';
import { ALL_INTERIOR_IDS, propsForInterior, findInteriorAtTile, INTERIORS } from './InteriorProps';

describe('InteriorProps', () => {
  it('gives every named interior at least 3 props (Test 21.3)', () => {
    for (const id of ALL_INTERIOR_IDS) {
      expect(propsForInterior(id).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('places every prop inside its own interior rect', () => {
    for (const id of ALL_INTERIOR_IDS) {
      const { rect, props } = INTERIORS[id];
      for (const prop of props) {
        expect(prop.x).toBeGreaterThanOrEqual(rect.x1);
        expect(prop.x).toBeLessThanOrEqual(rect.x2);
        expect(prop.y).toBeGreaterThanOrEqual(rect.y1);
        expect(prop.y).toBeLessThanOrEqual(rect.y2);
      }
    }
  });

  it('resolves a tile coordinate inside a rect to that interior', () => {
    const kitchen = INTERIORS.communityKitchen;
    const midX = Math.round((kitchen.rect.x1 + kitchen.rect.x2) / 2);
    const midY = Math.round((kitchen.rect.y1 + kitchen.rect.y2) / 2);
    expect(findInteriorAtTile(midX, midY)?.id).toBe('communityKitchen');
  });

  it('returns null for a tile outside every interior', () => {
    expect(findInteriorAtTile(0, 0)).toBeNull();
  });
});
