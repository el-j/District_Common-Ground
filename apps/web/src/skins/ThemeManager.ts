import { useGameStore } from '../core/state/useGameStore';
import { validateManifest, type SkinManifest, type SkinPalette } from './SkinInterface';
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
    meta: { ...state.meta, activeSkin: skinId },
  }));
}

/** Load the active skin at startup — applies palette immediately; no texture swap needed on first load. */
export async function activateDefaultSkin(): Promise<void> {
  const { activeSkin } = useGameStore.getState().meta;
  try {
    const manifest = await fetchManifest(activeSkin);
    applyPalette(manifest);
    setSfxProfile(manifest.audioProfile.sfxType);
    setBgmProfile(manifest.audioProfile.bgmType);
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
    BUILD_KITCHEN_IDLE:  'build_kitchen_idle',
    BUILD_KITCHEN_BUILT: 'build_kitchen_built',
    BUILD_SOLAR_IDLE:    'build_solar_idle',
    BUILD_SOLAR_BUILT:   'build_solar_built',
    BUILD_LEGAL_IDLE:    'build_legal_idle',
    BUILD_LEGAL_BUILT:   'build_legal_built',
  };
  return map[token] ?? null;
}
