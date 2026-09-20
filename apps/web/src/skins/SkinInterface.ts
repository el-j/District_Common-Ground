// Abstract identifiers used by game logic — never refer to skin-specific asset paths.
// Skins resolve these to actual textures/frames at render time.
export type EntityToken =
  | 'TILES_ATLAS'
  | 'HERO_ATLAS'
  | 'NPC_MIRA_ATLAS'
  | 'NPC_LEO_ATLAS'
  | 'NPC_ELENA_ATLAS'
  | 'NPC_SAL_ATLAS'
  | 'NPC_MARCUS_ATLAS'
  | 'NPC_HIGGINS_ATLAS'
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
  'NPC_SAL_ATLAS',
  'NPC_MARCUS_ATLAS',
  'NPC_HIGGINS_ATLAS',
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
  // M32 — 4 new outdoor tile types (tree/water/dirt path/sidewalk), added
  // for real biome variety. Optional for the same reason as the block
  // above: every pre-M32 manifest stays valid, falling back to
  // ThemeManager.resolveWorldPalette()'s defaults.
  worldTree?: string;
  worldWater?: string;
  worldDirtPath?: string;
  worldSidewalk?: string;
  // 2026-09-20 audit §1 architecture-rule fix — decoration/furniture prop
  // colors (PROP_BOARDED_WINDOW, PROP_ANVIL, ITEM_SCRAP_STOOL, etc.) used
  // to be hardcoded 0x.../'#...' literals directly in
  // WorldScene.ts/InteriorScene.ts/InteractionPrompt.ts, a confirmed
  // violation of this file's own "game logic must never reference...color
  // hex codes" rule. Optional, keyed by whichever PropToken/
  // OutdoorPropToken/DressingPropToken/ItemToken/interaction-bubble id is
  // relevant — a plain string-keyed map rather than one giant union type,
  // since (unlike assetMap/EntityToken) an incomplete manifest here is a
  // real, supported case, not an error: ThemeManager.getActivePropColor()
  // falls back to DEFAULT_PROP_COLORS (the exact pre-fix hardcoded hex
  // each token used to have) per-key, so every pre-existing manifest
  // stays valid untouched and any skin can override just the tokens it
  // wants to art-direct differently.
  propColors?: Partial<Record<string, string>>;
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
  // M30 — a hi-fi skin's standalone renderer bundle (dynamically import()ed
  // via SkinRendererLoader), replacing WorldScene's 3 hardcoded texture
  // functions with genuinely different draw code. Optional so every pre-M30
  // manifest (solarpunk, retro_gb, labor_woodcut, aurora, sunset_commons)
  // stays valid — WorldScene falls back to its built-in DEFAULT_RENDERER
  // when this is absent, zero behavior change for them.
  rendererUrl?: string;
}

/** Verify a manifest covers all required EntityTokens (throws on violation). */
export function validateManifest(manifest: SkinManifest): void {
  for (const token of ALL_ENTITY_TOKENS) {
    if (!(token in manifest.assetMap)) {
      throw new Error(`Skin "${manifest.skinId}" is missing EntityToken: ${token}`);
    }
  }
}
