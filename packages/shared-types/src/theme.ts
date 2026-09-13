// Pluggable Theming Engine — shared contracts (M15)
// See docs/planning/15-COMMUNITY-NETWORKING-CIVIC-TICKER-AND-THEME-SHOP.md

import type { DistrictBuildingType } from './kernel';

export interface ThemePalette {
  background: string;
  surface: string;
  accent: string;
  text: string;
  hudBg: string;
  hudBorder: string;
  hudText: string;
}

/** Per-building facade sprite overrides, keyed by district builder construction stage (0-3). */
export interface BuildingSkinOverride {
  stage0Url?: string;
  stage1Url?: string;
  stage2Url?: string;
  stage3Url?: string;
}

export interface ThemeManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  author: string;
  thumbnailUrl?: string;
  palette: ThemePalette;
  assetOverrides?: Record<string, string>;
  buildingOverrides?: Partial<Record<DistrictBuildingType, BuildingSkinOverride>>;
  shaderPreset?: string;
  sourceUrl?: string;
  bundleSha256?: string;
}
