/**
 * Test fixture for MinigameLoader.loadRemoteMinigame()'s failure path — a
 * module that does NOT export createMinigame(), simulating a malformed or
 * incompatible remote plugin bundle.
 */
export const notAMinigameFactory = 'this module is intentionally missing createMinigame()';
