import type { KernelPluginModule } from '@district-cg/shared-types';
import { skinsPlugin } from '../../skins/plugin';
import { worldPlugin } from '../../world/plugin';
import { geoWeatherPlugin } from '@district-cg/plugin-geo-weather';
import { meshCommsPlugin } from '@district-cg/plugin-mesh-comms';
import { mutualCreditPlugin } from '@district-cg/plugin-mutual-credit';
import { bitchatPlugin } from '@district-cg/plugin-bitchat';

export interface BuiltinKernelPluginEntry {
  module: KernelPluginModule;
  /** Core plugins (skins/world) can't be disabled — the game doesn't run without them. */
  core: boolean;
}

/**
 * The single source of truth for which kernel plugins ship hardcoded in the
 * client bundle (as opposed to the user-installable plugins in
 * PluginRegistry.ts). Both main.ts (deciding what to actually `.use()` at
 * boot, respecting KernelPluginPrefs' disabled set) and PluginManagerModal
 * (listing all of them, including currently-disabled ones, which
 * kernel.list() alone can't show since disabled ones are never registered)
 * read from this list instead of each keeping their own copy.
 */
export const BUILTIN_KERNEL_PLUGINS: BuiltinKernelPluginEntry[] = [
  { module: skinsPlugin, core: true },
  { module: worldPlugin, core: true },
  { module: geoWeatherPlugin, core: false },
  { module: meshCommsPlugin, core: false },
  { module: mutualCreditPlugin, core: false },
  { module: bitchatPlugin, core: false },
];
