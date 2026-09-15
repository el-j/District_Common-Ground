import type { MinigameInstance } from '@district-cg/shared-types';

/**
 * Test fixture for MinigameLoader.loadRemoteMinigame() — a same-origin module
 * that shapes itself exactly like a real remote plugin bundle would, without
 * pulling in any actual third-party host.
 */
export function createMinigame(): MinigameInstance {
  return {
    mount: async () => {},
    unmount: async () => {},
  };
}
