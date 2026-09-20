import { get, set } from 'idb-keyval';

const DISABLED_KEY = 'dcg-disabled-kernel-plugins';

/**
 * Persists which optional built-in kernel plugins (BUILTIN_KERNEL_PLUGINS,
 * core ones excluded) the player has turned off via the Plugin Library.
 * Read once at boot in main.ts before `.use()`-ing each module — there's no
 * live unregister path on KernelPluginModule, so a toggle here only takes
 * effect on the next load, which PluginManagerModal's UI says explicitly.
 */
export async function getDisabledKernelPluginIds(): Promise<Set<string>> {
  try {
    const stored = await get<string[]>(DISABLED_KEY);
    return new Set(stored ?? []);
  } catch {
    return new Set();
  }
}

export async function setKernelPluginDisabled(id: string, disabled: boolean): Promise<void> {
  const current = await getDisabledKernelPluginIds();
  if (disabled) current.add(id);
  else current.delete(id);
  await set(DISABLED_KEY, Array.from(current));
}
