import type { KernelPluginManifest, KernelPluginModule } from '@district-cg/shared-types';

/**
 * Inventory-only registration: WorldScene (Phaser scene — collision,
 * dialogue, day/night, portals) is not decomposed into the plugin contract.
 * There is exactly one WorldScene and nothing today needs a second one, so
 * forcing its lifecycle through a generic plugin API would be a large,
 * speculative rewrite for no concrete present benefit. Phaser.Game +
 * WorldScene construction stays in main.ts's boot(), unchanged. This module
 * exists only so kernel.list() truthfully reports "world" as a registered
 * system alongside skins/geo-weather/mesh-comms/mutual-credit.
 */
export const manifest: KernelPluginManifest = {
  id: 'world',
  version: '1.0.0',
  title: 'World Simulation',
  description: 'The Phaser WorldScene — inventory entry only; construction and lifecycle stay in main.ts.',
};

export function register(): void {
  // Intentional no-op — see comment above.
}

export const worldPlugin: KernelPluginModule = { manifest, register };
