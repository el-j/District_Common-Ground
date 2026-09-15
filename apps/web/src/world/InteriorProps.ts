/**
 * M21 — Interior Furnishing (spec §2.2, §5.1).
 *
 * Pure registry, no Phaser dependency: names each interior's required props
 * as abstract tokens (`PropToken`), never sprite filenames — WorldScene is
 * the only place that resolves a token to an actual draw call, respecting
 * the Headless Simulation boundary.
 *
 * Tile rects below are the *inner floor* area of the matching building in
 * `WorldScene.ts`'s `buildMap()` (one tile in from each wall):
 *   - Pip's Courier Room = Apartment Block A: drawBuilding(m, 2, 45, 13, 61, 7)
 *   - Community Kitchen  = Corner Grocer / Community Fridge: drawBuilding(m, 17, 49, 23, 57, 20)
 *   - Town Assembly Hall = Town Hall: drawBuilding(m, 2, 24, 8, 35, 5)
 */

export type InteriorId = 'pipsCourierRoom' | 'communityKitchen' | 'townAssembly';

export type PropToken =
  | 'PROP_BIKE_RACK'
  | 'PROP_COT'
  | 'PROP_BOXES'
  | 'PROP_LAMP'
  | 'PROP_TABLE'
  | 'PROP_STOVE'
  | 'PROP_CRATES'
  | 'PROP_BENCH'
  | 'PROP_CHALKBOARD'
  | 'PROP_BANNER';

export interface TileRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PropPlacement {
  token: PropToken;
  x: number; // tile column
  y: number; // tile row
}

export interface InteriorDefinition {
  id: InteriorId;
  label: string;
  rect: TileRect;
  props: PropPlacement[];
}

export const INTERIORS: Record<InteriorId, InteriorDefinition> = {
  pipsCourierRoom: {
    id: 'pipsCourierRoom',
    label: "Pip's Courier Room",
    rect: { x1: 3, y1: 46, x2: 12, y2: 60 },
    props: [
      { token: 'PROP_BIKE_RACK', x: 4, y: 47 },
      { token: 'PROP_COT', x: 9, y: 48 },
      { token: 'PROP_BOXES', x: 5, y: 58 },
      { token: 'PROP_LAMP', x: 11, y: 59 },
    ],
  },
  communityKitchen: {
    id: 'communityKitchen',
    label: 'Community Kitchen',
    rect: { x1: 18, y1: 50, x2: 22, y2: 56 },
    props: [
      { token: 'PROP_TABLE', x: 20, y: 52 },
      { token: 'PROP_STOVE', x: 19, y: 55 },
      { token: 'PROP_CRATES', x: 21, y: 55 },
    ],
  },
  townAssembly: {
    id: 'townAssembly',
    label: 'Town Assembly Hall',
    rect: { x1: 3, y1: 25, x2: 7, y2: 34 },
    props: [
      { token: 'PROP_BENCH', x: 4, y: 31 },
      { token: 'PROP_BENCH', x: 6, y: 31 },
      { token: 'PROP_CHALKBOARD', x: 5, y: 26 },
      { token: 'PROP_BANNER', x: 5, y: 27 },
    ],
  },
};

export const ALL_INTERIOR_IDS: readonly InteriorId[] = ['pipsCourierRoom', 'communityKitchen', 'townAssembly'];

export function propsForInterior(id: InteriorId): PropPlacement[] {
  return INTERIORS[id].props;
}

/** Returns the interior a tile coordinate falls inside, or null if outside all of them — used to trigger the M21 §1 room-entry camera pan. */
export function findInteriorAtTile(tx: number, ty: number): InteriorDefinition | null {
  for (const def of Object.values(INTERIORS)) {
    const { rect } = def;
    if (tx >= rect.x1 && tx <= rect.x2 && ty >= rect.y1 && ty <= rect.y2) return def;
  }
  return null;
}
