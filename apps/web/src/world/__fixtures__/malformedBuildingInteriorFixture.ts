/**
 * Test fixture for BuildingInteriorLoader.loadRemote()'s failure path — a
 * module that does NOT export createScene(), simulating a malformed or
 * incompatible remote building-interior bundle.
 */
export const notASceneFactory = 'this module is intentionally missing createScene()';
