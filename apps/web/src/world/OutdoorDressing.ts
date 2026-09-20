/**
 * M32 §3 — General outdoor prop placer.
 *
 * `ResilienceDressing.ts` already proved out the token+placement pattern for
 * a *resilience-tier-driven* swap of a handful of street-front props. This
 * module is the second, independent axis the M32 task doc asks for: a
 * larger, fixed set of always-present outdoor decoration (trees, bushes,
 * benches, fences, parked cars/bikes) that doesn't change with resilience
 * score — the two axes compose (`WorldScene` renders both), neither
 * replaces the other.
 *
 * Static, deterministic, zero Phaser dependency — same Headless Simulation
 * boundary `InteriorProps.ts`/`ResilienceDressing.ts` already keep.
 */

export type OutdoorPropToken =
  | 'PROP_ACCENT_TREE'
  | 'PROP_BUSH'
  | 'PROP_STREET_BENCH'
  | 'PROP_FENCE'
  | 'PROP_PARKED_CAR'
  | 'PROP_PARKED_BIKE';

export interface OutdoorPropPlacement {
  token: OutdoorPropToken;
  x: number; // tile column
  y: number; // tile row
}

// Central Plaza (9,23–38,40): a handful of accent trees/bushes where the
// tile itself is flat PLAZA, not a solid T.TREE tile, plus real street
// benches for sitting — the plaza is walkable floor, so these are
// decoration only, not collision-bearing tiles like T.TREE.
const CENTRAL_PLAZA_PROPS: OutdoorPropPlacement[] = [
  { token: 'PROP_ACCENT_TREE', x: 12, y: 26 },
  { token: 'PROP_ACCENT_TREE', x: 35, y: 26 },
  { token: 'PROP_ACCENT_TREE', x: 12, y: 37 },
  { token: 'PROP_ACCENT_TREE', x: 35, y: 37 },
  { token: 'PROP_BUSH', x: 18, y: 24 },
  { token: 'PROP_BUSH', x: 29, y: 24 },
  { token: 'PROP_STREET_BENCH', x: 20, y: 32 },
  { token: 'PROP_STREET_BENCH', x: 27, y: 32 },
];

// South courtyard (15,46–32,60) — the NPC hub — gets benches for the
// social-space reading the zone already has.
const SOUTH_COURTYARD_PROPS: OutdoorPropPlacement[] = [
  { token: 'PROP_STREET_BENCH', x: 19, y: 50 },
  { token: 'PROP_STREET_BENCH', x: 28, y: 54 },
  { token: 'PROP_BUSH', x: 23, y: 48 },
];

// Parked cars/bikes as static street decoration along the road strips —
// no driving/movement (that's EPIC-31's M34), just texture. Placed just
// off the road's own tiles (roads stay clear for the player/NPCs to walk).
const STREET_PARKING_PROPS: OutdoorPropPlacement[] = [
  { token: 'PROP_PARKED_CAR', x: 13, y: 19 },
  { token: 'PROP_PARKED_CAR', x: 36, y: 19 },
  { token: 'PROP_PARKED_BIKE', x: 15, y: 44 },
  { token: 'PROP_PARKED_CAR', x: 41, y: 44 },
  { token: 'PROP_PARKED_CAR', x: 12, y: 62 },
];

// Fences along the Solar Quarter's rooftop plaza edge — reads as a
// cultivated/managed civic space rather than open ground. Bushes sit in the
// gaps between the 3 solar buildings (cols 19–21 and 36–39 at row 70),
// clear of every building footprint (Solar A: 5–18, Greenhouse: 22–35,
// Solar B: 40–53, all rows 66–75).
const SOLAR_QUARTER_PROPS: OutdoorPropPlacement[] = [
  { token: 'PROP_FENCE', x: 19, y: 66 },
  { token: 'PROP_FENCE', x: 36, y: 66 },
  { token: 'PROP_BUSH', x: 20, y: 70 },
  { token: 'PROP_BUSH', x: 37, y: 70 },
];

export const OUTDOOR_DRESSING_PROPS: readonly OutdoorPropPlacement[] = [
  ...CENTRAL_PLAZA_PROPS,
  ...SOUTH_COURTYARD_PROPS,
  ...STREET_PARKING_PROPS,
  ...SOLAR_QUARTER_PROPS,
];
