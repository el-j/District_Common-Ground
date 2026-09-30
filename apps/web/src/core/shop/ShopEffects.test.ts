import { describe, it, expect } from 'vitest';
import { SHOP_EFFECTS, facadeMarkers, ownsEffect } from './ShopEffects';

// Mirrors apps/api/internal/shop/catalog.go — every item sold must do something.
const CATALOG_IDS = [
  'solar_facade_mural', 'kitchen_awning_deluxe', 'garden_trellis_arch',
  'brass_doorbell_chime', 'pip_courier_cap', 'neighborhood_blueprint_pack',
];

describe('ShopEffects', () => {
  it('every catalog item has an in-game effect', () => {
    for (const id of CATALOG_IDS) expect(SHOP_EFFECTS[id], id).toBeDefined();
  });

  it('lists facade decorations only for owned facade items', () => {
    expect(facadeMarkers(['solar_facade_mural', 'pip_courier_cap'])).toEqual([
      { node: 'solarGridProgress', marker: '🎨', label: 'Mural facade' },
    ]);
  });

  it('knows which effect kinds are owned', () => {
    expect(ownsEffect(['pip_courier_cap'], 'player-cap')).toBe(true);
    expect(ownsEffect([], 'dialogue-chime')).toBe(false);
    expect(ownsEffect(['unknown-item'], 'build-plaques')).toBe(false);
  });
});
