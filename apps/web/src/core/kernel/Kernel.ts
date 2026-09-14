import type {
  KernelContext,
  KernelHudButtonDescriptor,
  KernelPluginManifest,
  KernelPluginModule,
} from '@district-cg/shared-types';

export type { KernelContext, KernelHudButtonDescriptor, KernelPluginManifest, KernelPluginModule };

export interface HudSink {
  registerButton(button: KernelHudButtonDescriptor): void;
}

/**
 * Real implementations of the capabilities plugins get through KernelContext.
 * Injected by the composition root (main.ts) rather than imported directly
 * here, so Kernel itself stays free of the Phaser/DOM/audio module graph and
 * is unit-testable in plain Node — main.ts is where those real modules
 * (ThemeManager, SoundSynth, InputManager) already get wired up anyway.
 */
export interface KernelHostBindings {
  switchSkin(skinId: string, scene?: unknown): Promise<void>;
  getActiveSkinId(): string;
  playUIClick(): void;
  playSolidarityChime(): void;
  setInputLocked(locked: boolean): void;
}

/**
 * The one registration surface first-party features (standalone packages
 * like geo-weather/mesh-comms/mutual-credit, and in-tree system features
 * like skins/world) go through instead of being statically imported by
 * TopHUD.ts/main.ts. See docs/tasks/M14-microkernel-minigames.md's Kernel
 * addendum for what is and isn't in scope for this registry.
 */
export class Kernel {
  private readonly modules: KernelPluginModule[] = [];
  private hudSink: HudSink | null = null;
  private readonly ctx: KernelContext;

  constructor(uiRoot: HTMLElement, bindings: KernelHostBindings) {
    this.ctx = {
      uiRoot,
      hud: {
        registerButton: (button) => this.hudSink?.registerButton(button),
      },
      theme: {
        switchSkin: (skinId, scene) => bindings.switchSkin(skinId, scene),
        getActiveSkinId: () => bindings.getActiveSkinId(),
      },
      audio: {
        playUIClick: () => bindings.playUIClick(),
        playSolidarityChime: () => bindings.playSolidarityChime(),
      },
      input: {
        setLocked: (locked) => bindings.setInputLocked(locked),
      },
    };
  }

  use(module: KernelPluginModule): this {
    this.modules.push(module);
    return this;
  }

  /** Called once by TopHUD's own constructor once it exists. */
  attachHudSink(sink: HudSink): void {
    this.hudSink = sink;
  }

  async boot(): Promise<void> {
    for (const module of this.modules) {
      await module.register(this.ctx);
    }
  }

  list(): KernelPluginManifest[] {
    return this.modules.map((module) => module.manifest);
  }
}
