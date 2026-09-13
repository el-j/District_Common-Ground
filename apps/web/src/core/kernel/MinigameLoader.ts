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
