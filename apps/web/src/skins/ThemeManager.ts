import { useGameStore } from '../core/state/useGameStore';
import { validateManifest, type SkinManifest } from './SkinInterface';
import { setSfxProfile, setBgmProfile } from '../core/audio/SoundSynth';

const MANIFEST_CACHE = new Map<string, SkinManifest>();

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
