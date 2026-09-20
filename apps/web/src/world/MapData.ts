/**
 * M32 — extracted from `WorldScene.ts` so the tilemap/tile-type logic is
 * independently testable without pulling in Phaser (`WorldScene.ts` imports
 * it at module scope for its `Scene` class, which crashes plain-Node/jsdom
 * test runs the same way `InputManager.ts` does — see
 * `DialogueOverlay.test.ts`'s comment). `buildMap()`/`fillRect()`/
 * `drawBuilding()` never touched Phaser to begin with — this is a pure
 * relocation, same Headless Simulation boundary `InteriorProps.ts`/
 * `ResilienceDressing.ts` already keep, not a behavior change.
 */

export const COLS = 64;
export const ROWS = 80;

// M32 — 4 new outdoor tile types (real biome variety: no trees/water/paths
// existed before this milestone). Appended after the original 7 rather than
// interleaved, so every existing tile index (and every hi-fi skin renderer's
// canvas layout, which mirrors this enum positionally) stays unchanged.
export const T = {
  FLOOR: 0, WALL: 1, GRASS: 2, ROAD: 3, PLAZA: 4, DOOR: 5, BUILT: 6,
  TREE: 7, WATER: 8, DIRT_PATH: 9, SIDEWALK: 10,
} as const;
export const TILE_FRAME_COUNT = 11;

/** M32 — the single source of truth for which tile types block movement,
 * mirroring `WorldScene.create()`'s `layer.setCollision(...)` call exactly
 * (that call derives its list from this, not the other way around). TREE
 * and WATER block like WALL (no bridge/dock tile yet); DIRT_PATH/SIDEWALK
 * stay walkable like FLOOR/ROAD/PLAZA/DOOR/BUILT/GRASS. */
export const BLOCKING_TILES: readonly number[] = [T.WALL, T.TREE, T.WATER];

export function isWalkableTile(tile: number): boolean {
  return !BLOCKING_TILES.includes(tile);
}

// M21 §5 — door tile coordinates (mirrors buildMap()'s drawBuilding doorX args below),
// used as fixed "lit window" points for AmbientLightLayer's warm-glow pooling.
export const DOOR_TILES: { x: number; y: number }[] = [
  { x: 31, y: 10 }, { x: 7, y: 17 }, { x: 39, y: 17 },
  { x: 5, y: 35 }, { x: 42, y: 35 },
  { x: 7, y: 61 }, { x: 39, y: 61 }, { x: 20, y: 57 },
  { x: 57, y: 12 }, { x: 57, y: 27 },
  { x: 11, y: 75 }, { x: 28, y: 75 }, { x: 46, y: 75 },
  // M42 — South Canal Workshop & Retail Row.
  { x: 54, y: 52 }, { x: 60, y: 52 }, { x: 54, y: 62 }, { x: 60, y: 62 }, { x: 60, y: 74 },
];

// ── Map helpers ───────────────────────────────────────────────────────────────

export function fillRect(m: number[][], x1: number, y1: number, x2: number, y2: number, t: number): void {
  for (let y = Math.max(0, y1); y <= Math.min(ROWS - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(COLS - 1, x2); x++)
      m[y][x] = t;
}

export function drawBuilding(m: number[][], x1: number, y1: number, x2: number, y2: number, doorX: number): void {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      m[y][x] = (x === x1 || x === x2 || y === y1 || y === y2) ? T.WALL : T.FLOOR;
    }
  if (y2 >= 0 && y2 < ROWS && doorX >= 0 && doorX < COLS) m[y2][doorX] = T.DOOR;
}

export function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () =>
    Array.from<number>({ length: COLS }).fill(T.GRASS),
  );

  // Border
  fillRect(m, 0, 0, COLS - 1, 0, T.WALL);
  fillRect(m, 0, ROWS - 1, COLS - 1, ROWS - 1, T.WALL);
  fillRect(m, 0, 0, 0, ROWS - 1, T.WALL);
  fillRect(m, COLS - 1, 0, COLS - 1, ROWS - 1, T.WALL);

  // Roads
  fillRect(m, 1, 20, COLS - 2, 22, T.ROAD);   // North cross-street
  fillRect(m, 1, 41, COLS - 2, 43, T.ROAD);   // South cross-street
  fillRect(m, 1, 63, COLS - 2, 65, T.ROAD);   // Solar Quarter border road
  fillRect(m, 49, 1, 51, ROWS - 2, T.ROAD);   // East Canal access road

  // Central plaza floor
  fillRect(m, 9, 23, 38, 40, T.PLAZA);

  // South courtyard
  fillRect(m, 15, 46, 32, 60, T.PLAZA);

  // ── North Transit Hub (rows 0–15) ──────────────────────────────────────────
  // Rail platform
  fillRect(m, 3, 2, 26, 14, T.FLOOR);
  fillRect(m, 3, 2, 26, 2, T.WALL);    // platform edge north
  fillRect(m, 3, 14, 26, 14, T.ROAD);  // track strip
  // Ticket booth
  drawBuilding(m, 28, 3, 34, 10, 31);
  // Cargo dock
  fillRect(m, 36, 3, 46, 13, T.FLOOR);
  fillRect(m, 36, 3, 46, 3, T.WALL);

  // ── Original north buildings (shifted east) ────────────────────────────────
  drawBuilding(m, 2, 2, 13, 17, 7);     // High-Rise / Corporate Block
  drawBuilding(m, 33, 2, 46, 17, 39);   // Utility Station

  // ── Central buildings ──────────────────────────────────────────────────────
  drawBuilding(m, 2, 24, 8, 35, 5);     // Town Hall
  drawBuilding(m, 39, 24, 46, 35, 42);  // Tool Library / Old Warehouse

  // ── South buildings (original zone) ───────────────────────────────────────
  drawBuilding(m, 2, 45, 13, 61, 7);    // Apartment Block A
  drawBuilding(m, 33, 45, 46, 61, 39);  // Apartment Block B
  drawBuilding(m, 17, 49, 23, 57, 20);  // Corner Grocer / Community Fridge

  // ── East Canal zone (cols 52–62) ──────────────────────────────────────────
  fillRect(m, 52, 5, 62, 38, T.PLAZA);   // canal walkway
  fillRect(m, 53, 15, 62, 17, T.ROAD);   // flood dike strip
  fillRect(m, 53, 28, 62, 30, T.ROAD);   // second dike
  drawBuilding(m, 54, 5, 61, 12, 57);    // East Canal community building
  drawBuilding(m, 54, 20, 61, 27, 57);   // Flood management office

  // ── South Solar Quarter (rows 66–78) ──────────────────────────────────────
  fillRect(m, 5, 66, 58, 78, T.PLAZA);  // rooftop plaza
  drawBuilding(m, 5, 66, 18, 75, 11);   // Solar building A
  drawBuilding(m, 22, 66, 35, 75, 28);  // Greenhouse garden node
  drawBuilding(m, 40, 66, 53, 75, 46);  // Solar building B
  fillRect(m, 7, 77, 55, 78, T.BUILT);  // Completed solar field (decorative)

  // ── M42 — South Canal Workshop & Retail Row (cols 52–62, rows 44–74) ──────
  // EPIC-34 §1/§2. A genuinely free 11×19 all-grass block, confirmed
  // programmatically before drawing (a throwaway Node type-stripped script,
  // same discipline as every scavenge/cookbook coordinate since M38) —
  // bounded by the south cross-street road (rows 41–43, north), the Solar
  // Quarter border road (rows 63–65, south/interrupting), the East Canal
  // access road (cols 49–51, west) and the map border (col 63, east).
  drawBuilding(m, 52, 44, 56, 52, 54);   // Metalwork Workshop
  drawBuilding(m, 58, 44, 62, 52, 60);   // Woodworking Workshop
  drawBuilding(m, 52, 54, 56, 62, 54);   // Baumarkt (hardware store)
  drawBuilding(m, 58, 54, 62, 62, 60);   // Supermarket
  drawBuilding(m, 59, 66, 62, 74, 60);   // Library — south of the border road, in the confirmed-free strip beside the Solar Quarter's Solar Building B

  // ── M32 — World variety pass ───────────────────────────────────────────
  // Was a single hand-authored tilemap with zero nature/water/path variety —
  // 7 tile types, uniform flat grass everywhere outdoors. See EPIC-31/M32.

  // North "Greenwood Corner" park pocket — the one genuinely free block
  // inside the North Transit Hub (rows 15–17 sit between the High-Rise/
  // Utility Station side buildings, cols 14–32; rows 18–19 are free across
  // the hub's full width once every building's row-17 bottom edge clears).
  // Scattered TREE tiles + 2 DIRT_PATH aisles, not a solid procedural
  // forest — this project keeps map generation deterministic/hand-
  // authored, no per-playthrough randomness (see CLAUDE.md).
  const parkTrees: [number, number][] = [
    [15, 15], [21, 15], [30, 15],
    [18, 16], [27, 16],
    [24, 17],
    [6, 18], [16, 18], [23, 18], [29, 18], [38, 18],
    [10, 19], [19, 19], [26, 19], [32, 19], [42, 19],
  ];
  parkTrees.forEach(([x, y]) => { m[y][x] = T.TREE; });
  fillRect(m, 14, 17, 32, 17, T.DIRT_PATH); // east–west aisle through the tree block
  fillRect(m, 22, 15, 22, 19, T.DIRT_PATH); // north–south aisle

  // Canal-side tree-lined promenade — cols 47–48 sit in a genuinely free
  // 2-wide gap between every building's east edge (max col 46) and the East
  // Canal access road (cols 49–51), for the whole map height. Left as
  // ordinary GRASS wherever it's actually a road/plaza already (the North/
  // South cross-streets at rows 20–22/41–43, the Solar Quarter border road
  // at rows 63–65, and the Solar Quarter's own rooftop plaza from row 66
  // down) rather than paving over them.
  const promenadeSegments: [number, number][] = [[1, 19], [23, 40], [44, 62]];
  promenadeSegments.forEach(([y1, y2]) => {
    fillRect(m, 47, y1, 47, y2, T.TREE);
    fillRect(m, 48, y1, 48, y2, T.DIRT_PATH);
  });

  // Sidewalk edging along the 3 cross-streets — was a flat road-to-grass
  // transition everywhere; skipped wherever a plaza already provides its
  // own distinct texture at that edge (Central Plaza's north/south edges,
  // cols 9–38).
  fillRect(m, 1, 19, 46, 19, T.SIDEWALK);               // north cross-street, north edge
  fillRect(m, 1, 40, 8, 40, T.SIDEWALK);                // north cross-street, south edge (west of plaza)
  fillRect(m, 39, 40, 46, 40, T.SIDEWALK);              // north cross-street, south edge (east of plaza)
  fillRect(m, 1, 44, 46, 44, T.SIDEWALK);               // south cross-street, south edge
  fillRect(m, 1, 62, 46, 62, T.SIDEWALK);               // Solar Quarter border road, north edge

  // East Canal — real WATER replacing the flat color-coded "canal walkway"
  // plaza fill. A wide channel south of both dike roads (clear of both
  // canal buildings, which stop at row 27) plus a connecting channel along
  // the zone's east edge (col 62 — one column short of every building's
  // max col 61).
  fillRect(m, 52, 31, 62, 38, T.WATER); // canal mouth / lake, south of the second dike
  fillRect(m, 62, 5, 62, 30, T.WATER);  // connecting channel along the east edge

  return m;
}
