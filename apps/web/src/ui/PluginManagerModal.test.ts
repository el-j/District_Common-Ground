// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: (key: string) => Promise.resolve(store.get(key)),
  set: (key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  },
}));

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

vi.mock('../core/audio/SoundSynth', () => ({
  playUIClick: vi.fn(),
}));

vi.mock('../core/kernel/PluginRegistry', () => ({
  getPluginCatalogSnapshot: vi.fn(() => Promise.resolve({ installed: [], serverGames: [] })),
  installPluginFromBundleFile: vi.fn(),
  installPluginFromManifestUrl: vi.fn(),
  launchInstalledPlugin: vi.fn(),
  refreshInstalledPlugins: vi.fn(() => Promise.resolve()),
  removeInstalledPlugin: vi.fn(() => Promise.resolve()),
}));

vi.mock('../api/endpoints/plugins', () => ({
  listVerificationRequests: vi.fn(() => Promise.resolve([])),
  reviewVerificationRequest: vi.fn(),
  submitVerificationRequest: vi.fn(),
}));

vi.mock('../core/state/persistence', () => ({
  getToken: vi.fn(() => null),
}));

const { listBuiltinKernelPlugins } = vi.hoisted(() => ({
  listBuiltinKernelPlugins: vi.fn(),
}));
vi.mock('../api/endpoints/kernelPlugins', () => ({ listBuiltinKernelPlugins }));

import { PluginManagerModal } from './PluginManagerModal';
import { BUILTIN_KERNEL_PLUGINS } from '../core/kernel/builtinKernelPlugins';

const CORE_COUNT = BUILTIN_KERNEL_PLUGINS.filter(e => e.core).length;
const OPTIONAL_COUNT = BUILTIN_KERNEL_PLUGINS.length - CORE_COUNT;

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

// Bugfix — the Plugin Library previously only listed user-installed
// plugins, giving no visibility into the always-on kernel plugins
// hardcoded into the client bundle (skins/world/geo-weather/mesh-comms/
// mutual-credit/bitchat). This exercises the new "Built-in Plugins"
// section: full listing (including disabled ones, which kernel.list()
// alone can't show), version-drift detection against the server's
// BuiltinKernelPluginManifests, and the disable/enable toggle for
// non-core entries.
describe('PluginManagerModal built-in plugins section', () => {
  beforeEach(() => {
    store.clear();
    listBuiltinKernelPlugins.mockReset();
    listBuiltinKernelPlugins.mockResolvedValue(
      BUILTIN_KERNEL_PLUGINS.map(e => ({ ...e.module.manifest, core: e.core })),
    );
  });

  it('lists every built-in kernel plugin, including core ones', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    const cards = root.querySelectorAll('[data-builtin-plugin-id]');
    expect(cards.length).toBe(BUILTIN_KERNEL_PLUGINS.length);
  });

  it('marks core plugins as required with no disable button, others as toggleable', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    expect(root.querySelectorAll('.plugin-pill--core').length).toBe(CORE_COUNT);
    expect(root.querySelectorAll('[data-action="toggle-builtin"]').length).toBe(OPTIONAL_COUNT);
  });

  it('shows "Up to date" when the server version matches the bundled version', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    expect(root.querySelectorAll('.plugin-pill--matches').length).toBe(BUILTIN_KERNEL_PLUGINS.length);
  });

  it('shows "Update available" when the server reports a different version', async () => {
    listBuiltinKernelPlugins.mockResolvedValue(
      BUILTIN_KERNEL_PLUGINS.map(e => ({ ...e.module.manifest, version: '99.0.0', core: e.core })),
    );
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    expect(root.querySelectorAll('.plugin-pill--outdated').length).toBe(BUILTIN_KERNEL_PLUGINS.length);
  });

  it('falls back to "Unable to check" without crashing when the server is unreachable', async () => {
    listBuiltinKernelPlugins.mockRejectedValue(new Error('network error'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    expect(root.querySelectorAll('.plugin-pill--missing').length).toBe(BUILTIN_KERNEL_PLUGINS.length);
  });

  it('disabling a non-core plugin persists the choice and flips the button to Enable', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    const optionalId = BUILTIN_KERNEL_PLUGINS.find(e => !e.core)!.module.manifest.id;
    const toggleBtn = root.querySelector<HTMLButtonElement>(`[data-builtin-id="${optionalId}"]`)!;
    expect(toggleBtn.textContent).toBe('Disable');
    toggleBtn.click();
    await flush();

    const { getDisabledKernelPluginIds } = await import('../core/kernel/KernelPluginPrefs');
    expect(await getDisabledKernelPluginIds()).toEqual(new Set([optionalId]));

    const reRendered = root.querySelector<HTMLButtonElement>(`[data-builtin-id="${optionalId}"]`)!;
    expect(reRendered.textContent).toBe('Enable');
  });

  it('re-enabling a disabled plugin removes it from the persisted disabled set', async () => {
    const { setKernelPluginDisabled } = await import('../core/kernel/KernelPluginPrefs');
    const optionalId = BUILTIN_KERNEL_PLUGINS.find(e => !e.core)!.module.manifest.id;
    await setKernelPluginDisabled(optionalId, true);

    const root = document.createElement('div');
    document.body.appendChild(root);
    new PluginManagerModal(root);
    await flush();

    const toggleBtn = root.querySelector<HTMLButtonElement>(`[data-builtin-id="${optionalId}"]`)!;
    expect(toggleBtn.textContent).toBe('Enable');
    toggleBtn.click();
    await flush();

    const { getDisabledKernelPluginIds } = await import('../core/kernel/KernelPluginPrefs');
    expect(await getDisabledKernelPluginIds()).toEqual(new Set());
  });
});
