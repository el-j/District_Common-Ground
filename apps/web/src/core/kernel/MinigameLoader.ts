import type { MinigameManifest, MinigameInstance, GameSessionContext } from '@district-cg/shared-types';
import { HostPlatformAPI, type HostPlatformCallbacks } from './HostPlatformAPI';
import { MinigameContainer } from './MinigameContainer';
import { useGameStore } from '../state/useGameStore';

export interface MinigameModule {
  createMinigame(): MinigameInstance;
  manifest?: MinigameManifest;
}

export class MinigameLoader {
  private static registeredModules: Map<string, () => Promise<MinigameModule>> = new Map();
  private static manifests: Map<string, MinigameManifest> = new Map();

  /**
   * Register an in-tree or pre-bundled minigame module
   */
  static registerLocalMinigame(id: string, manifest: MinigameManifest, loader: () => Promise<MinigameModule>): void {
    this.manifests.set(id, manifest);
    this.registeredModules.set(id, loader);
  }

  static unregisterMinigame(id: string): void {
    this.manifests.delete(id);
    this.registeredModules.delete(id);
  }

  static hasMinigame(id: string): boolean {
    return this.registeredModules.has(id);
  }

  static getManifest(id: string): MinigameManifest | undefined {
    return this.manifests.get(id);
  }

  /**
   * Load a minigame whose code lives outside this bundle, via a real
   * `import()` of `manifest.entrypointUrl`. Trust is enforced upstream, not
   * here — but there are now two upstream sources, not one:
   *   1. `GET /api/v1/games`, which merges the local-registry's healthy
   *      plugins with the Go backend's owner-approved verified catalog (see
   *      `internal/kernel/verification_requests.go`).
   *   2. (M29) `builtinMinigameCatalog.ts`'s hardcoded fallback list, used
   *      only when (1) is unreachable — same-origin, same-deploy, first-
   *      party manifests for the 5 built-in games, pointing at static paths
   *      that ship with the app itself. This keeps the built-ins working
   *      offline without regressing to a static compile-time import.
   * Third-party/arbitrary manifests never reach this method either way —
   * those only ever go through `PluginRegistry`'s separate hash-verified,
   * sandboxed install flow.
   */
  static async loadRemoteMinigame(manifest: MinigameManifest): Promise<void> {
    if (this.registeredModules.has(manifest.id)) return;
    if (!manifest.entrypointUrl) {
      throw new Error(`Minigame "${manifest.id}" has no entrypointUrl to load remotely.`);
    }

    const mod = (await import(/* @vite-ignore */ manifest.entrypointUrl)) as Partial<MinigameModule>;
    if (typeof mod.createMinigame !== 'function') {
      throw new Error(`Remote minigame module "${manifest.id}" does not export a createMinigame() function.`);
    }

    this.registerLocalMinigame(manifest.id, manifest, async () => mod as MinigameModule);
  }

  /**
   * List all known minigames
   */
  static listMinigames(): MinigameManifest[] {
    return Array.from(this.manifests.values());
  }

  /**
   * Launch a minigame by ID, instantiating the container and session
   */
  static async launchMinigame(
    id: string,
    callbacks: HostPlatformCallbacks = {},
    parent: HTMLElement = document.body,
  ): Promise<{ container: MinigameContainer; instance: MinigameInstance }> {
    const loader = this.registeredModules.get(id);
    if (!loader) {
      throw new Error(`Minigame "${id}" is not registered in MinigameLoader.`);
    }

    const manifest = this.manifests.get(id);
    const module = await loader();
    const instance = module.createMinigame();

    const state = useGameStore.getState();
    const container = new MinigameContainer({
      className: `minigame-${id}`,
      onClose: (result) => {
        callbacks.onClose?.(result);
        void container.unmount();
      },
    });

    if (manifest) {
      container.setTitle(manifest.title);
    }

    const host = new HostPlatformAPI({
      ...callbacks,
      onClose: (result) => {
        callbacks.onClose?.(result);
        void container.unmount();
      },
    });

    const context: GameSessionContext = {
      sessionId: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      sessionToken: 'local_offline_token',
      userId: 'local_player',
      archetype: state.player.classRole ?? 'pip',
      activeSkin: state.meta.activeSkin,
      day: state.meta.day,
      currentStats: {
        cash: state.player.cash,
        energy: state.player.energy,
        socialTrust: state.player.socialTrust,
        stressLevel: state.player.stressLevel,
      },
      host,
    };

    await container.mount(instance, context, parent);

    return { container, instance };
  }
}
