import type Phaser from 'phaser';
import type { ResolvedWorldPalette } from './ThemeManager';
import type { AppearanceToken } from '../core/state/useGameStore';

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
 *
 * M52 — `createPlayerTexture`'s `appearance` param is optional and additive:
 * it wires up M48's previously-unconsumed `player.appearance` token (4
 * skin-tone variants) without breaking any existing `packages/skin-*`
 * bundle, each of which copies this interface locally rather than
 * importing it (see `skin-diorama-glow`'s own doc comment) — an older
 * bundle simply never reads the extra argument JS passes it. Only the
 * flagship (`skin-painterly-depth`) and the built-in `DEFAULT_RENDERER`
 * actually vary output by it; retrofitting the other 3 hi-fi packages is
 * an explicit, recorded non-goal for this milestone (see M52's task doc).
 */
export interface SkinRenderer {
  createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void;
  createPlayerTexture(scene: Phaser.Scene, appearance?: AppearanceToken): void;
  createNPCTextures(scene: Phaser.Scene): void;
}

/** Shape a renderer bundle's module must export — mirrors `MinigameModule.createMinigame()`. */
export interface SkinRendererModule {
  createRenderer(): SkinRenderer;
}
