import { describe, it, expect, vi, beforeEach } from 'vitest';
import { switchSkin, resolveUiKit, DEFAULT_UI_KIT } from './ThemeManager';
import type { SkinManifest, SkinUIKit } from './SkinInterface';

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
      style: { setProperty: vi.fn(), removeProperty: vi.fn() },
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

// M22 Test 22.1/22.2 — SkinUIKit resolution
describe('ThemeManager.resolveUiKit (M22 Test 22.1/22.2)', () => {
  it('22.1: returns the exact pre-M22 defaults when a manifest has no uiKit', () => {
    expect(resolveUiKit(undefined)).toEqual(DEFAULT_UI_KIT);
    expect(resolveUiKit({})).toEqual(DEFAULT_UI_KIT);
  });

  it('22.2: resolves a full "shiny" uiKit without falling back to defaults', () => {
    const shiny: SkinUIKit = {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontFamilyDisplay: "'Inter', system-ui, sans-serif",
      radiusSm: '10px',
      radiusMd: '18px',
      radiusLg: '28px',
      shadowPanel: '0 8px 32px rgba(0,0,0,0.35)',
      shadowGlow: '0 0 24px rgba(120,180,255,0.5)',
      gradientPanel: 'linear-gradient(160deg, rgba(30,40,70,0.75), rgba(15,20,40,0.75))',
      gradientAccent: 'linear-gradient(135deg, #6ee7f5, #a78bfa)',
      blur: '16px',
      pixelArt: false,
    };
    expect(resolveUiKit(shiny)).toEqual(shiny);
  });

  it('22.2b: falls back per-field when only some uiKit fields are set', () => {
    const resolved = resolveUiKit({ pixelArt: false, radiusLg: '28px' });
    expect(resolved.pixelArt).toBe(false);
    expect(resolved.radiusLg).toBe('28px');
    expect(resolved.fontFamily).toBe(DEFAULT_UI_KIT.fontFamily);
    expect(resolved.shadowGlow).toBe(DEFAULT_UI_KIT.shadowGlow);
  });
});

// M22 Test 22.3 — switching skins flips html[data-pixel-art]
describe('ThemeManager switchSkin uiKit application (M22 Test 22.3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets html.dataset.pixelArt = "false" for a skin whose uiKit opts out of pixel art, and back to "true" for one that does not', async () => {
    const shinyManifest = makeManifest({
      skinId: 'aurora',
      uiKit: { pixelArt: false },
    });
    const plainManifest = makeManifest({ skinId: 'labor_woodcut' });

    const doc = makeMockDocument();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') return { ok: false } as Response;
      const manifest = url.includes('aurora') ? shinyManifest : plainManifest;
      return { ok: true, json: async () => manifest } as unknown as Response;
    }));

    await switchSkin('aurora');
    expect(doc.documentElement.dataset['pixelArt']).toBe('false');

    await switchSkin('labor_woodcut');
    expect(doc.documentElement.dataset['pixelArt']).toBe('true');
  });
});
