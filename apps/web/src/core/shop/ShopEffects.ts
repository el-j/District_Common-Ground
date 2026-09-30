import type { BuildNodeKey } from '../state/useGameStore';

/**
 * What each Commons Bazaar item actually does in the game (2026-09-29
 * launch audit §1.7 — purchases used to be recorded and then never read).
 * Effects are cosmetic or flavour on purpose: Solidarity Tokens come from
 * real-world deeds, so they must not buy an edge in the economy.
 * Keep in sync with apps/api/internal/shop/catalog.go.
 */
export type ShopEffect =
  | { kind: 'facade'; node: BuildNodeKey; marker: string; label: string }
  | { kind: 'player-cap'; marker: string }
  | { kind: 'dialogue-chime' }
  | { kind: 'build-plaques' };

export const SHOP_EFFECTS: Record<string, ShopEffect> = {
  solar_facade_mural: { kind: 'facade', node: 'solarGridProgress', marker: '🎨', label: 'Mural facade' },
  kitchen_awning_deluxe: { kind: 'facade', node: 'kitchenProgress', marker: '⛱️', label: 'Striped awning' },
  garden_trellis_arch: { kind: 'facade', node: 'landTrustProgress', marker: '🌿', label: 'Trellis arch' },
  pip_courier_cap: { kind: 'player-cap', marker: '🧢' },
  brass_doorbell_chime: { kind: 'dialogue-chime' },
  neighborhood_blueprint_pack: { kind: 'build-plaques' },
};

export function facadeMarkers(owned: readonly string[]): { node: BuildNodeKey; marker: string; label: string }[] {
  return owned.flatMap(id => {
    const e = SHOP_EFFECTS[id];
    return e?.kind === 'facade' ? [{ node: e.node, marker: e.marker, label: e.label }] : [];
  });
}

export function ownsEffect(owned: readonly string[], kind: ShopEffect['kind']): boolean {
  return owned.some(id => SHOP_EFFECTS[id]?.kind === kind);
}

/** Plaque text for a finished build (neighborhood_blueprint_pack). */
export const BUILD_PLAQUES: Record<BuildNodeKey, string> = {
  kitchenProgress: '“No one on this block eats alone.” — built together',
  solarGridProgress: '“The sun belongs to everyone.” — Solar Co-op members',
  legalFundProgress: '“An injury to one is an injury to all.”',
  toolLibraryProgress: '“Borrow, mend, return, repeat.”',
  landTrustProgress: '“This ground is held in common, for good.”',
};
