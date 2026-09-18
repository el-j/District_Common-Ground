// Dynamic theme catalog (M15). Merges the 3 built-in starter themes with any
// community theme that has cleared the M14 plugin trust gate, then hands off
// to ThemeManager's existing palette/audio/facade-swap machinery to apply one.
import { listThemes, type ServerThemeManifest } from '../api/endpoints/themes';
import { registerRemoteThemeManifest, switchSkin } from './ThemeManager';

export interface ThemeCatalogEntry {
  id: string;
  title: string;
  author: string;
  builtIn: boolean;
  entrypoint: string;
}

const BUILT_IN_IDS = new Set([
  'solarpunk', 'retro_gb', 'labor_woodcut', 'aurora', 'sunset_commons',
  // M30 — 3 hi-fi skins, each with its own dynamically-loaded SkinRenderer bundle.
  'diorama_glow', 'flat_vector', 'neon_city',
]);

function toCatalogEntry(theme: ServerThemeManifest): ThemeCatalogEntry {
  return {
    id: theme.id,
    title: theme.name,
    author: theme.author,
    builtIn: BUILT_IN_IDS.has(theme.id),
    entrypoint: theme.entrypoint,
  };
}

/** Fetches the server-merged theme catalog (built-ins + owner-approved community themes). */
export async function getThemeCatalog(): Promise<ThemeCatalogEntry[]> {
  try {
    const themes = await listThemes();
    return themes.map(toCatalogEntry);
  } catch {
    // Offline or server unreachable: fall back to what's guaranteed local.
    return [
      { id: 'solarpunk', title: 'Solarpunk', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/solarpunk/skin.manifest.json' },
      { id: 'retro_gb', title: 'Retro GB', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/retro_gb/skin.manifest.json' },
      { id: 'labor_woodcut', title: '1930s Labor Woodcut', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/labor_woodcut/skin.manifest.json' },
      { id: 'aurora', title: 'Aurora Glass', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/aurora/skin.manifest.json' },
      { id: 'sunset_commons', title: 'Sunset Commons', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/sunset_commons/skin.manifest.json' },
      // M30 — 3 hi-fi skins, each with its own dynamically-loaded SkinRenderer bundle.
      { id: 'diorama_glow', title: 'Diorama Glow', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/diorama_glow/skin.manifest.json' },
      { id: 'flat_vector', title: 'Flat Vector Minimal', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/flat_vector/skin.manifest.json' },
      { id: 'neon_city', title: 'Neon Night-City', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/neon_city/skin.manifest.json' },
    ];
  }
}

/** Applies a theme by catalog id — resolves community theme manifests before delegating to switchSkin. */
export async function applyTheme(entry: ThemeCatalogEntry, scene?: Phaser.Scene): Promise<void> {
  if (!entry.builtIn) {
    await registerRemoteThemeManifest(entry.id, entry.entrypoint);
  }
  await switchSkin(entry.id, scene);
}
