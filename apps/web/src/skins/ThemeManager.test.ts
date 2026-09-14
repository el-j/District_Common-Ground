import { describe, it, expect, vi, beforeEach } from 'vitest';
import { switchSkin } from './ThemeManager';
import type { SkinManifest } from './SkinInterface';

// M15 outstanding test: dynamic theme loading overrides building stage
// textures on a live Phaser scene without a full page reload. `switchSkin()`
// must call `scene.textures.remove` + `scene.load.image` for each
// BUILD_*_IDLE/BUILT token whose manifest texture actually resolves (HEAD
// 200), and must never touch `window.location` to do it.

function makeManifest(overrides: Partial<SkinManifest> = {}): SkinManifest {
  const textureEntry = { textureUrl: 'assets/skins/labor_woodcut/build_kitchen_built.png' };
  return {
    skinId: 'labor_woodcut',
    version: '1.0.0',
    displayName: '1930s Labor Woodcut',
    palette: {
      background: '#111', surface: '#222', accent: '#333',
      text: '#eee', hudBg: '#000', hudBorder: '#444', hudText: '#fff',
    },
    assetMap: {
      TILES_ATLAS: {},
      HERO_ATLAS: {},
      NPC_MIRA_ATLAS: {},
      NPC_LEO_ATLAS: {},
      NPC_ELENA_ATLAS: {},
      BUILD_KITCHEN_IDLE: {},
      BUILD_KITCHEN_BUILT: textureEntry,
      BUILD_SOLAR_IDLE: {},
      BUILD_SOLAR_BUILT: {},
      BUILD_LEGAL_IDLE: {},
      BUILD_LEGAL_BUILT: {},
    },
    audioProfile: { sfxType: 'woodcut', bgmType: 'woodcut' },
    ...overrides,
  };
}

function makeMockDocument() {
  return {
    documentElement: {
      style: { setProperty: vi.fn() },
      dataset: {} as Record<string, string>,
    },
  };
}

function makeMockScene() {
  const onceHandlers: Record<string, () => void> = {};
  return {
    textures: {
      remove: vi.fn(),
      emit: vi.fn(),
    },
    load: {
      image: vi.fn(),
      once: vi.fn((event: string, cb: () => void) => { onceHandlers[event] = cb; }),
      start: vi.fn(() => { onceHandlers['complete']?.(); }),
    },
  };
}

describe('ThemeManager dynamic theme loading (M15 outstanding test)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('overrides a built-stage building texture on an existing scene without a page reload', async () => {
    const manifest = makeManifest();
    const locationReload = vi.fn();
    vi.stubGlobal('document', makeMockDocument());
    vi.stubGlobal('location', { reload: locationReload });
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return { ok: true } as Response;
      }
      return { ok: true, json: async () => manifest } as unknown as Response;
    }));

    const scene = makeMockScene();
    await switchSkin('labor_woodcut', scene as unknown as Phaser.Scene);

    expect(scene.textures.remove).toHaveBeenCalledWith('build_kitchen_built');
    expect(scene.load.image).toHaveBeenCalledWith(
      'build_kitchen_built',
      'assets/skins/labor_woodcut/build_kitchen_built.png',
    );
    expect(scene.load.start).toHaveBeenCalled();
    expect(locationReload).not.toHaveBeenCalled();
  });

  it('skips a building token whose texture file 404s instead of throwing', async () => {
    const manifest = makeManifest();
    vi.stubGlobal('document', makeMockDocument());
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return { ok: false } as Response;
      }
      return { ok: true, json: async () => manifest } as unknown as Response;
    }));

    const scene = makeMockScene();
    await expect(switchSkin('labor_woodcut', scene as unknown as Phaser.Scene)).resolves.not.toThrow();
    expect(scene.textures.remove).not.toHaveBeenCalled();
    expect(scene.load.image).not.toHaveBeenCalled();
  });
});
