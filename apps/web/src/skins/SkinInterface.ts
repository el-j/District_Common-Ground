// Abstract identifiers used by game logic — never refer to skin-specific asset paths.
// Skins resolve these to actual textures/frames at render time.
export type EntityToken =
  | 'TILES_ATLAS'
  | 'HERO_ATLAS'
  | 'NPC_MIRA_ATLAS'
  | 'NPC_LEO_ATLAS'
  | 'NPC_ELENA_ATLAS'
  | 'BUILD_KITCHEN_IDLE'
  | 'BUILD_KITCHEN_BUILT'
  | 'BUILD_SOLAR_IDLE'
  | 'BUILD_SOLAR_BUILT'
  | 'BUILD_LEGAL_IDLE'
  | 'BUILD_LEGAL_BUILT';

export const ALL_ENTITY_TOKENS: readonly EntityToken[] = [
  'TILES_ATLAS',
  'HERO_ATLAS',
  'NPC_MIRA_ATLAS',
  'NPC_LEO_ATLAS',
  'NPC_ELENA_ATLAS',
  'BUILD_KITCHEN_IDLE',
  'BUILD_KITCHEN_BUILT',
  'BUILD_SOLAR_IDLE',
  'BUILD_SOLAR_BUILT',
  'BUILD_LEGAL_IDLE',
  'BUILD_LEGAL_BUILT',
] as const;

export interface SkinAssetEntry {
  atlasUrl?: string;     // Phaser atlas spritesheet JSON (references textureUrl)
  textureUrl?: string;   // PNG or WebP image
  frameRate?: number;    // Walk animation FPS override
  tileSize?: [number, number];
  footprint?: [number, number];
}

export interface SkinPalette {
  background: string;
  surface: string;
  accent: string;
  text: string;
  hudBg: string;
  hudBorder: string;
  hudText: string;
  // M21 — world-tile-level fields (spec §4/§7.2). Optional so existing/older
  // manifests (e.g. labor_woodcut, community themes) stay valid; WorldScene
  // falls back to the pre-M21 hardcoded hex values via
  // ThemeManager.resolveWorldPalette() when these are absent.
  worldFloor?: string;
  worldWall?: string;
  worldWallShadow?: string;
  worldGrass?: string;
  worldRoad?: string;
  worldRoadBorder?: string;
  worldPlaza?: string;
  worldDoor?: string;
  worldHighlight?: string;
}

export interface SkinAudioProfile {
  sfxType: string;
  bgmType: string;
}

// M22 — UI chrome tokens, parallel to SkinPalette but for fonts/shape/depth
// rather than color. Optional so every pre-M22 manifest (solarpunk, retro_gb,
// labor_woodcut, any community theme) stays valid; ThemeManager.resolveUiKit()
// fills in the exact pre-M22 hardcoded look when a field/the whole section
// is absent.
export interface SkinUIKit {
  fontFamily?: string;
  fontFamilyDisplay?: string;
  radiusSm?: string;
  radiusMd?: string;
  radiusLg?: string;
  shadowPanel?: string;
  shadowGlow?: string;
  gradientPanel?: string;
  gradientAccent?: string;
  blur?: string;
  pixelArt?: boolean;
}

export interface SkinManifest {
  skinId: string;
  version: string;
  displayName: string;
  palette: SkinPalette;
  assetMap: Record<EntityToken, SkinAssetEntry>;
  audioProfile: SkinAudioProfile;
  uiKit?: SkinUIKit;
}

/** Verify a manifest covers all required EntityTokens (throws on violation). */
export function validateManifest(manifest: SkinManifest): void {
  for (const token of ALL_ENTITY_TOKENS) {
    if (!(token in manifest.assetMap)) {
      throw new Error(`Skin "${manifest.skinId}" is missing EntityToken: ${token}`);
    }
  }
}
