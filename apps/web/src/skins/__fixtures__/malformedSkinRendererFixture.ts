/**
 * Test fixture for SkinRendererLoader.loadRemoteSkinRenderer()'s failure
 * path — a module that does NOT export createRenderer(), simulating a
 * malformed or incompatible remote renderer bundle.
 */
export const notARendererFactory = 'this module is intentionally missing createRenderer()';
