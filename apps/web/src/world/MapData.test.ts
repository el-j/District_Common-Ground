import { describe, it, expect } from 'vitest';
import { COLS, ROWS, T, TILE_FRAME_COUNT, BLOCKING_TILES, isWalkableTile, buildMap } from './MapData';

// M32 §1 — tile-walkability of the 4 new tile types (real biome variety:
// tree/water/dirt-path/sidewalk). See EPIC-31/M32 Section 1.
describe('isWalkableTile', () => {
  it('blocks the 4 pre-existing blocking behaviors unchanged (only WALL blocked before M32)', () => {
    expect(isWalkableTile(T.WALL)).toBe(false);
  });

  it('TREE and WATER block movement like WALL (no bridge/dock tile yet)', () => {
    expect(isWalkableTile(T.TREE)).toBe(false);
    expect(isWalkableTile(T.WATER)).toBe(false);
  });

  it('DIRT_PATH and SIDEWALK stay walkable like FLOOR/ROAD/PLAZA', () => {
    expect(isWalkableTile(T.DIRT_PATH)).toBe(true);
    expect(isWalkableTile(T.SIDEWALK)).toBe(true);
  });

  it('every pre-M32 outdoor/indoor tile type stays walkable except WALL', () => {
    expect(isWalkableTile(T.FLOOR)).toBe(true);
    expect(isWalkableTile(T.GRASS)).toBe(true);
    expect(isWalkableTile(T.ROAD)).toBe(true);
    expect(isWalkableTile(T.PLAZA)).toBe(true);
    expect(isWalkableTile(T.DOOR)).toBe(true);
    expect(isWalkableTile(T.BUILT)).toBe(true);
  });

  it('BLOCKING_TILES contains exactly WALL/TREE/WATER — the same list WorldScene.create() passes to setCollision()', () => {
    expect([...BLOCKING_TILES].sort()).toEqual([T.WALL, T.TREE, T.WATER].sort());
  });
});

describe('tile frame count', () => {
  it('covers all 11 tile types (7 original + 4 new from M32)', () => {
    expect(TILE_FRAME_COUNT).toBe(11);
    expect(Object.keys(T).length).toBe(11);
  });
});

// M32 §2 — the new biome-variety pass is additive-only: same deterministic
// output every call (no per-playthrough randomness), and every new tile
// placement lands inside the map's own bounds.
describe('buildMap (M32 biome variety pass)', () => {
  it('is fully deterministic — two calls produce identical grids', () => {
    const a = buildMap();
    const b = buildMap();
    expect(a).toEqual(b);
  });

  it('produces a grid of the declared COLS x ROWS size', () => {
    const m = buildMap();
    expect(m.length).toBe(ROWS);
    expect(m.every(row => row.length === COLS)).toBe(true);
  });

  it('places at least one TREE tile in the North park pocket', () => {
    const m = buildMap();
    expect(m[15][15]).toBe(T.TREE);
  });

  it('places a walkable DIRT_PATH aisle through the North park pocket', () => {
    const m = buildMap();
    expect(m[17][20]).toBe(T.DIRT_PATH);
  });

  it('lines the canal-side promenade with TREE (col 47) and DIRT_PATH (col 48)', () => {
    const m = buildMap();
    expect(m[10][47]).toBe(T.TREE);
    expect(m[10][48]).toBe(T.DIRT_PATH);
  });

  it('leaves the promenade columns as ordinary ROAD at cross-street rows, not paved over', () => {
    const m = buildMap();
    expect(m[21][47]).toBe(T.ROAD); // North cross-street (rows 20-22)
  });

  it('replaces the East Canal south basin with real WATER tiles', () => {
    const m = buildMap();
    expect(m[35][55]).toBe(T.WATER);
    expect(m[35][62]).toBe(T.WATER); // east-edge connecting channel
  });

  it('adds SIDEWALK edging along the cross-street roads', () => {
    const m = buildMap();
    expect(m[19][10]).toBe(T.SIDEWALK); // north cross-street, north edge
    expect(m[44][10]).toBe(T.SIDEWALK); // south cross-street, south edge
  });

  it('does not touch any existing building footprint (Apartment Block A stays WALL/FLOOR/DOOR)', () => {
    const m = buildMap();
    expect(m[45][2]).toBe(T.WALL);  // Apartment Block A's north-west corner
    expect(m[61][7]).toBe(T.DOOR);  // its door tile
  });
});
