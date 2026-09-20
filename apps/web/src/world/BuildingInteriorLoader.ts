import type { BuildingInteriorManifest } from '@district-cg/shared-types';
import type { BuildingInteriorModule } from './BuildingInteriorInterface';

/**
 * M41 — EPIC-34 §2. Mirrors `MinigameLoader`/`SkinRendererLoader` exactly:
 * a registry of `() => Promise<Module>` loaders, plus a real remote-load
 * path via a genuine `import()` of `manifest.entrypointUrl`. No real
 * `packages/building-*` package exists yet — every interior shipped this
 * milestone (`InteriorScene.ts`'s data-only path) doesn't go through this
 * loader at all, matching M29's own precedent of building the loading
 * mechanism ahead of real remote content, and EPIC-34's explicit non-goal
 * that not every building needs to become a full package.
 *
 * M53 — EPIC-38 §3 audited this loader against `MinigameLoader` and found
 * one real functional gap (not just a naming difference): manifests were
 * never retained after `loadRemote()`, so unlike `MinigameLoader`, there
 * was no way to list or re-fetch a registered building's manifest. Added
 * `manifests`/`getManifest()`/`listInteriors()` to close it — this loader
 * still has zero real call sites outside its own tests (confirmed by grep
 * before changing it), so this is purely additive with no blast radius.
 * The method-naming divergence from `MinigameLoader` (`registerLocal` vs
 * `registerLocalMinigame`, etc.) was deliberately left as-is rather than
 * renamed to match — see `docs/planning/23-PLUGIN-LOADER-CONVENTIONS.md`
 * for why that's a documented convention for *new* loaders, not a
 * retrofit mandate for this one.
 */
export class BuildingInteriorLoader {
  private static registeredModules: Map<string, () => Promise<BuildingInteriorModule>> = new Map();
  private static manifests: Map<string, BuildingInteriorManifest> = new Map();

  static registerLocal(id: string, loader: () => Promise<BuildingInteriorModule>, manifest?: BuildingInteriorManifest): void {
    this.registeredModules.set(id, loader);
    if (manifest) this.manifests.set(id, manifest);
  }

  static unregister(id: string): void {
    this.registeredModules.delete(id);
    this.manifests.delete(id);
  }

  static hasInterior(id: string): boolean {
    return this.registeredModules.has(id);
  }

  static getManifest(id: string): BuildingInteriorManifest | undefined {
    return this.manifests.get(id);
  }

  static listInteriors(): BuildingInteriorManifest[] {
    return Array.from(this.manifests.values());
  }

  /** Same-origin, first-party-only for now — no sandboxing/hash
   *  verification, identical reasoning to `MinigameLoader.loadRemoteMinigame()`'s
   *  doc comment. */
  static async loadRemote(manifest: BuildingInteriorManifest): Promise<void> {
    if (this.registeredModules.has(manifest.id)) return;
    if (!manifest.entrypointUrl) {
      throw new Error(`Building interior "${manifest.id}" has no entrypointUrl to load remotely.`);
    }

    const mod = (await import(/* @vite-ignore */ manifest.entrypointUrl)) as Partial<BuildingInteriorModule>;
    if (typeof mod.createScene !== 'function') {
      throw new Error(`Remote building interior module "${manifest.id}" does not export a createScene() function.`);
    }

    this.registerLocal(manifest.id, async () => mod as BuildingInteriorModule, manifest);
  }

  static async getModule(id: string): Promise<BuildingInteriorModule> {
    const loader = this.registeredModules.get(id);
    if (!loader) {
      throw new Error(`Building interior "${id}" is not registered in BuildingInteriorLoader.`);
    }
    return loader();
  }
}
