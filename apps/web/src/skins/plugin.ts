import type { KernelPluginManifest, KernelPluginModule } from '@district-cg/shared-types';
import { activateDefaultSkin } from './ThemeManager';

export const manifest: KernelPluginManifest = {
  id: 'skins',
  version: '1.0.0',
  title: 'Theme Skins',
  description: 'Manifest-driven palette/asset skinning (ThemeManager) — moves default-skin bootstrap behind the kernel instead of main.ts calling it directly.',
};

export async function register(): Promise<void> {
  await activateDefaultSkin();
}

export const skinsPlugin: KernelPluginModule = { manifest, register };
