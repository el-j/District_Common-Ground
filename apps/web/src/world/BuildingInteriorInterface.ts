import type Phaser from 'phaser';

/**
 * M41 — EPIC-34 §2. Contract a packaged building-interior plugin's bundle
 * must satisfy. Phaser-coupled (unlike `BuildingInteriorManifest`, which
 * stays in `packages/shared-types`), so it lives here — mirroring exactly
 * where `SkinRenderer`/`SkinRendererModule` live (`SkinRendererInterface.ts`
 * sits in `apps/web/src/skins/`, not in shared-types either) rather than
 * the plain data-only `MinigameManifest`. **Deviation from the M41 task
 * doc's original wording, recorded not silent**: the doc said this contract
 * would live in `packages/shared-types/src/building.ts` alongside the
 * manifest — following the real `SkinRenderer` precedent instead keeps
 * Phaser out of the shared-types package, which every other type in it is
 * already free of.
 */
export interface BuildingInteriorHostAPI {
  /** The interior id this scene was created for — lets one module serve
   *  more than one manifest entry if useful. */
  interiorId: string;
  /** Call to leave the interior — mirrors InteriorScene.ts's own exit path
   *  (sleep restored, WorldScene woken at the stored return position). */
  exit(): void;
}

/** Shape a remote building-interior bundle's module must export — mirrors
 *  `SkinRendererModule.createRenderer()`/`MinigameModule.createMinigame()`. */
export interface BuildingInteriorModule {
  createScene(host: BuildingInteriorHostAPI): Phaser.Scene;
}
