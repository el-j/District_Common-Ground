import { useGameStore } from '../core/state/useGameStore';
import { validateManifest, type SkinManifest, type SkinPalette, type SkinUIKit } from './SkinInterface';
import { setSfxProfile, setBgmProfile } from '../core/audio/SoundSynth';

const MANIFEST_CACHE = new Map<string, SkinManifest>();

/** M21 — the pre-M21 hardcoded hex literals from `createTilesetTexture()`, kept
 * as the fallback for skins (or the no-skin-loaded boot moment) that don't
 * populate the new world-tile palette fields yet. */
export const DEFAULT_WORLD_PALETTE: Required<Pick<SkinPalette,
  'worldFloor' | 'worldWall' | 'worldWallShadow' | 'worldGrass' | 'worldRoad' |
  'worldRoadBorder' | 'worldPlaza' | 'worldDoor' | 'worldHighlight'
>> = {
  worldFloor: '#18182a',
  worldWall: '#1e1e30',
  worldWallShadow: '#444268',
  worldGrass: '#1a2c18',
  worldRoad: '#2c2c3a',
  worldRoadBorder: '#20202e',
  worldPlaza: '#20202e',
  worldDoor: '#5a3c14',
  worldHighlight: '#44ee88',
};

export type ResolvedWorldPalette = typeof DEFAULT_WORLD_PALETTE;

/** Fills in any missing world-tile field with the pre-M21 default so
 * `createTilesetTexture()` always has a complete palette to draw from. */
export function resolveWorldPalette(palette?: Partial<SkinPalette>): ResolvedWorldPalette {
  return {
    worldFloor: palette?.worldFloor ?? DEFAULT_WORLD_PALETTE.worldFloor,
    worldWall: palette?.worldWall ?? DEFAULT_WORLD_PALETTE.worldWall,
    worldWallShadow: palette?.worldWallShadow ?? DEFAULT_WORLD_PALETTE.worldWallShadow,
    worldGrass: palette?.worldGrass ?? DEFAULT_WORLD_PALETTE.worldGrass,
    worldRoad: palette?.worldRoad ?? DEFAULT_WORLD_PALETTE.worldRoad,
    worldRoadBorder: palette?.worldRoadBorder ?? DEFAULT_WORLD_PALETTE.worldRoadBorder,
    worldPlaza: palette?.worldPlaza ?? DEFAULT_WORLD_PALETTE.worldPlaza,
    worldDoor: palette?.worldDoor ?? DEFAULT_WORLD_PALETTE.worldDoor,
    worldHighlight: palette?.worldHighlight ?? DEFAULT_WORLD_PALETTE.worldHighlight,
  };
}

/** Resolves the world-tile palette for whichever skin is currently active,
 * reading straight from the manifest cache so it's usable synchronously
 * from `WorldScene.preload()` (which can't await a fetch). Falls back to
 * `DEFAULT_WORLD_PALETTE` when the manifest hasn't been fetched yet — the
 * scene re-fetches/redraws when `switchSkin()` completes shortly after boot. */
export function getActiveWorldPalette(): ResolvedWorldPalette {
  const { activeSkin } = useGameStore.getState().meta;
  const cached = MANIFEST_CACHE.get(activeSkin);
  return resolveWorldPalette(cached?.palette);
}

async function fetchManifest(skinId: string): Promise<SkinManifest> {
  const cached = MANIFEST_CACHE.get(skinId);
  if (cached) return cached;

  const url = `assets/skins/${skinId}/skin.manifest.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Skin manifest not found: ${url}`);
  const manifest = (await res.json()) as SkinManifest;
  validateManifest(manifest);
  MANIFEST_CACHE.set(skinId, manifest);
  return manifest;
}

/**
 * Seeds the manifest cache for a theme whose manifest lives at an arbitrary
 * URL (a verified community theme's `entrypoint`) rather than the built-in
 * `assets/skins/<id>/` convention. Called by ThemePluginManager before
 * switchSkin() so community themes resolve through the same palette/audio
 * application path as built-ins.
 */
export async function registerRemoteThemeManifest(skinId: string, manifestUrl: string): Promise<SkinManifest> {
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Theme manifest not found: ${manifestUrl}`);
  const manifest = (await res.json()) as SkinManifest;
  validateManifest(manifest);
  MANIFEST_CACHE.set(skinId, manifest);
  return manifest;
}

/** M22 — the pre-M22 hardcoded UI chrome (monospace font, sharp/blocky radii,
 * the existing subtle shadows, crisp pixel-art rendering, no blur/glow), kept
 * as the fallback for skins (or the no-skin-loaded boot moment) that don't
 * populate the new `uiKit` manifest section yet. Values match the literals
 * that were hardcoded in index.html/style.css before M22. */
export const DEFAULT_UI_KIT: Required<SkinUIKit> = {
  fontFamily: 'ui-monospace, monospace',
  fontFamilyDisplay: 'ui-monospace, monospace',
  radiusSm: '4px',
  radiusMd: '6px',
  radiusLg: '10px',
  shadowPanel: '0 4px 12px rgba(0,0,0,0.4)',
  shadowGlow: '0 0 0 rgba(0,0,0,0)',
  gradientPanel: 'linear-gradient(180deg, #1a1a2e, #12121f)',
  gradientAccent: 'linear-gradient(180deg, #2a3a50, #1a2434)',
  blur: 'none',
  pixelArt: true,
};

export type ResolvedUiKit = Required<SkinUIKit>;

/** Fills in any missing `uiKit` field with the pre-M22 default so
 * `applyUiKit()` always has a complete token set to write to CSS. */
export function resolveUiKit(uiKit?: SkinUIKit): ResolvedUiKit {
  return {
    fontFamily: uiKit?.fontFamily ?? DEFAULT_UI_KIT.fontFamily,
    fontFamilyDisplay: uiKit?.fontFamilyDisplay ?? uiKit?.fontFamily ?? DEFAULT_UI_KIT.fontFamilyDisplay,
    radiusSm: uiKit?.radiusSm ?? DEFAULT_UI_KIT.radiusSm,
    radiusMd: uiKit?.radiusMd ?? DEFAULT_UI_KIT.radiusMd,
    radiusLg: uiKit?.radiusLg ?? DEFAULT_UI_KIT.radiusLg,
    shadowPanel: uiKit?.shadowPanel ?? DEFAULT_UI_KIT.shadowPanel,
    shadowGlow: uiKit?.shadowGlow ?? DEFAULT_UI_KIT.shadowGlow,
    gradientPanel: uiKit?.gradientPanel ?? DEFAULT_UI_KIT.gradientPanel,
    gradientAccent: uiKit?.gradientAccent ?? DEFAULT_UI_KIT.gradientAccent,
    blur: uiKit?.blur ?? DEFAULT_UI_KIT.blur,
    pixelArt: uiKit?.pixelArt ?? DEFAULT_UI_KIT.pixelArt,
  };
}

/**
 * Writes `uiKit` fields to CSS custom properties on <html> — but only the
 * fields a manifest actually supplies. This is the crucial difference from
 * `resolveWorldPalette`'s single-consumer pattern (the tileset canvas): many
 * *different* components each already have their own bespoke hardcoded
 * background/shadow/radius (a warm-amber radio widget, a green end-day
 * button, a navy dialogue panel, ...). If every unset field fell back to
 * one shared DEFAULT_UI_KIT literal, switching to any skin (even one with no
 * uiKit at all) would flatten every component to the same generic gradient
 * — a real regression, not the no-op Section 1 requires. So an absent field
 * clears the CSS variable instead, letting each component's own local
 * `var(--ui-x, <its current hardcoded value>)` fallback keep doing its job.
 * Only a skin that actually opts into a field (e.g. Aurora Glass) makes
 * every panel referencing that variable pick up the new shared look.
 */
function applyUiKit(manifest: SkinManifest): void {
  const kit = manifest.uiKit;
  const root = document.documentElement;
  const setOrClear = (prop: string, value: string | undefined): void => {
    if (value !== undefined) root.style.setProperty(prop, value);
    else root.style.removeProperty(prop);
  };
  setOrClear('--ui-font', kit?.fontFamily);
  setOrClear('--ui-font-display', kit?.fontFamilyDisplay ?? kit?.fontFamily);
  setOrClear('--ui-radius-sm', kit?.radiusSm);
  setOrClear('--ui-radius-md', kit?.radiusMd);
  setOrClear('--ui-radius-lg', kit?.radiusLg);
  setOrClear('--ui-shadow-panel', kit?.shadowPanel);
  setOrClear('--ui-shadow-glow', kit?.shadowGlow);
  setOrClear('--ui-gradient-panel', kit?.gradientPanel);
  setOrClear('--ui-gradient-accent', kit?.gradientAccent);
  setOrClear('--ui-blur', kit?.blur === undefined ? undefined : kit.blur === 'none' ? 'none' : `blur(${kit.blur})`);
  root.dataset['pixelArt'] = String(kit?.pixelArt ?? DEFAULT_UI_KIT.pixelArt);
}

function applyPalette(manifest: SkinManifest): void {
  const { palette } = manifest;
  const root = document.documentElement;
  root.style.setProperty('--skin-bg',         palette.background);
  root.style.setProperty('--skin-surface',    palette.surface);
  root.style.setProperty('--skin-accent',     palette.accent);
  root.style.setProperty('--skin-text',       palette.text);
  root.style.setProperty('--skin-hud-bg',     palette.hudBg);
  root.style.setProperty('--skin-hud-border', palette.hudBorder);
  root.style.setProperty('--skin-hud-text',   palette.hudText);
  root.dataset['skin'] = manifest.skinId;
}

/** Switch to a new skin. Passes Phaser scene so textures can be reloaded if assets exist. */
export async function switchSkin(skinId: string, scene?: Phaser.Scene): Promise<void> {
  const manifest = await fetchManifest(skinId);
  applyPalette(manifest);
  applyUiKit(manifest);
  setSfxProfile(manifest.audioProfile.sfxType);
  setBgmProfile(manifest.audioProfile.bgmType);

  // Swap Phaser textures only if the atlas files are actually loaded
  if (scene) {
    for (const [token, entry] of Object.entries(manifest.assetMap)) {
      const key = tokenToTextureKey(token);
      if (!key) continue;
      const url = entry.textureUrl;
      if (!url) continue;
      // Only replace if the texture file exists (404 gracefully skipped)
      const check = await fetch(url, { method: 'HEAD' }).catch(() => null);
      if (check?.ok) {
        scene.textures.remove(key);
        scene.load.image(key, url);
        scene.load.once('complete', () => { scene.textures.emit('addtexture', key); });
        scene.load.start();
      }
    }
  }

  useGameStore.setState(state => ({
    // `?? 0` guards a save persisted before this field existed — without it,
    // `undefined + 1` is `NaN`, and `NaN !== NaN` is always true, which would
    // make WorldScene's subscription below fire on every store change forever.
    meta: { ...state.meta, activeSkin: skinId, skinRevision: (state.meta.skinRevision ?? 0) + 1 },
  }));
}

/** Load the active skin at startup — applies palette immediately; no texture swap needed on first load.
 *
 * M28 — this used to be the boot-time cause of the world tileset never
 * picking up the default skin's real colors: it applied the palette/uiKit to
 * CSS vars but never touched the store, so `WorldScene`'s tileset-rebuild
 * subscription (keyed on `activeSkin` changing) never fired on first boot,
 * since the default skin's id never actually changes. Bumping
 * `skinRevision` here — the same field `switchSkin()` bumps — gives
 * `WorldScene` a signal decoupled from "did the id change" that fires
 * exactly once real manifest data is available, on boot or any later switch. */
export async function activateDefaultSkin(): Promise<void> {
  const { activeSkin } = useGameStore.getState().meta;
  try {
    const manifest = await fetchManifest(activeSkin);
    applyPalette(manifest);
    applyUiKit(manifest);
    setSfxProfile(manifest.audioProfile.sfxType);
    setBgmProfile(manifest.audioProfile.bgmType);
    useGameStore.setState(state => ({
      meta: { ...state.meta, skinRevision: (state.meta.skinRevision ?? 0) + 1 },
    }));
  } catch {
    // Non-fatal: game uses built-in procedural textures + default palette
  }
}

export function getActiveSkinId(): string {
  return useGameStore.getState().meta.activeSkin;
}

/** Map abstract EntityToken strings to the Phaser texture key used in WorldScene. */
function tokenToTextureKey(token: string): string | null {
  const map: Record<string, string> = {
    TILES_ATLAS:         'tiles',
    HERO_ATLAS:          'player',
    NPC_MIRA_ATLAS:      'npc_mira',
    NPC_LEO_ATLAS:       'npc_leo',
    NPC_ELENA_ATLAS:     'npc_elena',
    NPC_SAL_ATLAS:       'npc_sal',
    NPC_MARCUS_ATLAS:    'npc_marcus',
    NPC_HIGGINS_ATLAS:   'npc_higgins',
    BUILD_KITCHEN_IDLE:  'build_kitchen_idle',
    BUILD_KITCHEN_BUILT: 'build_kitchen_built',
    BUILD_SOLAR_IDLE:    'build_solar_idle',
    BUILD_SOLAR_BUILT:   'build_solar_built',
    BUILD_LEGAL_IDLE:    'build_legal_idle',
    BUILD_LEGAL_BUILT:   'build_legal_built',
  };
  return map[token] ?? null;
}
