import type { SkinRenderer, SkinRendererModule } from './SkinRendererInterface';

const RENDERER_CACHE = new Map<string, SkinRenderer>();

export class SkinRendererLoader {
  /**
   * Loads a hi-fi skin's renderer bundle via a real `import()` of
   * `rendererUrl`, mirroring `MinigameLoader.loadRemoteMinigame`. No
   * sandboxing, no hash verification — same reasoning as that method's own
   * doc comment: these are same-origin, same-deploy, first-party bundles
   * shipped with the app itself, not third-party code. (A *future*
   * community-submitted renderer would be a materially bigger trust
   * problem — see EPIC-30's Non-Goals — not addressed here.)
   *
   * Cached by `rendererUrl`, not skin id, so two skins could theoretically
   * share one bundle without a second network fetch.
   */
  static async loadRemoteSkinRenderer(rendererUrl: string): Promise<SkinRenderer> {
    const cached = RENDERER_CACHE.get(rendererUrl);
    if (cached) return cached;

    const mod = (await import(/* @vite-ignore */ rendererUrl)) as Partial<SkinRendererModule>;
    if (typeof mod.createRenderer !== 'function') {
      throw new Error(`Remote skin renderer module "${rendererUrl}" does not export a createRenderer() function.`);
    }

    const renderer = mod.createRenderer();
    RENDERER_CACHE.set(rendererUrl, renderer);
    return renderer;
  }

  static clearCache(): void {
    RENDERER_CACHE.clear();
  }
}
