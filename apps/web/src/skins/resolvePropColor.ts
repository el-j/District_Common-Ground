import { getActivePropColorHex } from './ThemeManager';

/**
 * The Phaser-numeric-color bridge for getActivePropColorHex(). Deliberately
 * does its own hex parsing rather than importing real Phaser for
 * `Phaser.Display.Color.HexStringToColor` — Phaser's module-scope init
 * touches `HTMLCanvasElement.getContext('2d')`, which jsdom doesn't
 * implement, so any file with a real (non-type-only) `import Phaser from
 * 'phaser'` at module scope is excluded from this project's unit tests by
 * established convention (WorldScene.ts/InteriorScene.ts/RegionScene.ts).
 * A one-line hex parse doesn't need to buy into that just to avoid one
 * import — this stays plain, dependency-free, and testable under the
 * default node environment like everything else in core/ and skins/.
 */
export function resolvePropColor(token: string): number {
  return Number.parseInt(getActivePropColorHex(token).replace('#', ''), 16);
}
