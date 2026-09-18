import type Phaser from 'phaser';
import type { ResolvedWorldPalette } from './ThemeManager';

/**
 * Contract a hi-fi skin's renderer bundle must satisfy. Signatures
 * deliberately mirror `WorldScene.ts`'s 3 hardcoded texture-drawing
 * functions exactly, so `WorldScene` can call through either the built-in
 * `DEFAULT_RENDERER` or a dynamically-loaded one interchangeably.
 *
 * Frame-layout contract (the type system can't enforce this — respect it):
 * `createPlayerTexture` must produce an 8-frame 16×16 spritesheet keyed
 * `'player'` in the exact down×2, up×2, side×2, side-flipped×2 layout
 * `WorldScene.create()`'s `anims.create()` calls assume (frame indices
 * 0–7). `createNPCTextures` must produce exactly 6 16×16 frames keyed
 * `'npcs'` in NPC-array order (mira, leo, elena, sal, marcus, higgins). A
 * renderer may change what's drawn inside each frame — never the frame
 * count or order, since that would silently break the existing
 * animation/sprite-index wiring for every renderer, not just its own.
 */
export interface SkinRenderer {
  createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void;
  createPlayerTexture(scene: Phaser.Scene): void;
  createNPCTextures(scene: Phaser.Scene): void;
}

/** Shape a renderer bundle's module must export — mirrors `MinigameModule.createMinigame()`. */
export interface SkinRendererModule {
  createRenderer(): SkinRenderer;
}
