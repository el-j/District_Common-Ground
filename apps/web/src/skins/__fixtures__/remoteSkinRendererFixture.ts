import type { SkinRenderer } from '../SkinRendererInterface';

/**
 * Test fixture for SkinRendererLoader.loadRemoteSkinRenderer() — a
 * same-origin module that shapes itself exactly like a real hi-fi skin
 * renderer bundle would, without pulling in any actual package build.
 */
export function createRenderer(): SkinRenderer {
  return {
    createTilesetTexture: () => {},
    createPlayerTexture: () => {},
    createNPCTextures: () => {},
  };
}
