import { describe, it, expect } from 'vitest';
import { SkinRendererLoader } from './SkinRendererLoader';

// M30 — mirrors MinigameLoader.test.ts's loadRemoteMinigame coverage style.
describe('SkinRendererLoader.loadRemoteSkinRenderer', () => {
  it('loads a real same-origin fixture module and returns a usable SkinRenderer', async () => {
    const renderer = await SkinRendererLoader.loadRemoteSkinRenderer('./__fixtures__/remoteSkinRendererFixture.ts');
    expect(typeof renderer.createTilesetTexture).toBe('function');
    expect(typeof renderer.createPlayerTexture).toBe('function');
    expect(typeof renderer.createNPCTextures).toBe('function');
  });

  it('caches the resolved renderer by rendererUrl — a second call does not re-import', async () => {
    const first = await SkinRendererLoader.loadRemoteSkinRenderer('./__fixtures__/remoteSkinRendererFixture.ts');
    const second = await SkinRendererLoader.loadRemoteSkinRenderer('./__fixtures__/remoteSkinRendererFixture.ts');
    expect(second).toBe(first);
  });

  it('rejects a malformed remote module without crashing the loader', async () => {
    await expect(
      SkinRendererLoader.loadRemoteSkinRenderer('./__fixtures__/malformedSkinRendererFixture.ts'),
    ).rejects.toThrow('does not export a createRenderer');
  });
});
