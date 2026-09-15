/**
 * M21 — pure viewport-independent zoom calculation.
 *
 * The "Ant Farm Problem" (spec §2.1) isn't the zoom API — WorldScene already
 * called `setZoom(2)` — it's that `main.ts` runs Phaser in `Scale.RESIZE`
 * mode, so the canvas (and therefore the camera's field of view in tiles)
 * grows with the player's window/monitor size while the zoom stays fixed.
 * This function always returns the zoom that keeps a fixed tile count
 * on screen regardless of viewport size, so a wide desktop monitor and a
 * phone show the same amount of the world.
 */

export const DEFAULT_TILES_WIDE = 12;
export const DEFAULT_TILES_TALL = 10;

export function computeViewportZoom(
  viewportW: number,
  viewportH: number,
  tileSize: number,
  tilesWide: number = DEFAULT_TILES_WIDE,
  tilesTall: number = DEFAULT_TILES_TALL,
): number {
  return Math.min(viewportW / (tilesWide * tileSize), viewportH / (tilesTall * tileSize));
}
