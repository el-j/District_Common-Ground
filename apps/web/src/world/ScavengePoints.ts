// M38 — Materials, Scavenging & Inventory Foundation (EPIC-33 §1-2)
// See docs/tasks/M38-materials-scavenging-and-inventory.md.
//
// A fixed, deterministic list of world material pickups, following exactly
// the token+placement pattern OutdoorDressing.ts already established for
// M32's outdoor props — never randomly spawned or regenerating. Every
// coordinate below was verified against buildMap()'s real tile data and
// every existing OUTDOOR_DRESSING_PROPS placement (via a throwaway
// verification script, not eyeballed) before being added here, the same
// zero-collision discipline M32 used for its tree/path placements.

import type { MaterialToken } from '../core/simulation/Materials';

export interface ScavengePointPlacement {
  id: string;
  material: MaterialToken;
  amount: number;
  x: number;
  y: number;
}

export const SCAVENGE_POINTS: readonly ScavengePointPlacement[] = [
  // South Quarter courtyard — urban salvage
  { id: 'south-quarter-scrap-1', material: 'MATERIAL_SCRAP_METAL', amount: 2, x: 20, y: 50 },
  { id: 'south-quarter-wire-1',  material: 'MATERIAL_WIRE',        amount: 2, x: 28, y: 58 },
  // Central Plaza edge — urban salvage, near the Old Warehouse/Tool Library
  { id: 'plaza-edge-wood-1',  material: 'MATERIAL_RECLAIMED_WOOD', amount: 2, x: 4, y: 28 },
  { id: 'plaza-edge-glass-1', material: 'MATERIAL_GLASS',          amount: 2, x: 7, y: 37 },
  // South Solar Quarter yard — raw/garden materials near the Greenhouse
  { id: 'solar-yard-resin-1',    material: 'MATERIAL_RESIN',    amount: 2, x: 9, y: 71 },
  { id: 'solar-yard-mushroom-1', material: 'MATERIAL_MUSHROOM', amount: 3, x: 10, y: 74 },
  // North Utility Station yard — raw/industrial materials
  { id: 'utility-yard-iron-1', material: 'MATERIAL_IRON', amount: 2, x: 37, y: 6 },
  { id: 'utility-yard-coal-1', material: 'MATERIAL_COAL', amount: 2, x: 43, y: 10 },
];
