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
  launchInstalledPlugin: vi.fn(() => Promise.resolve()),
  refreshInstalledPlugins: vi.fn(() => Promise.resolve()),
  removeInstalledPlugin: vi.fn(() => Promise.resolve()),
}));

vi.mock('../api/endpoints/plugins', () => ({
  listVerificationRequests: vi.fn(() => Promise.resolve([])),
  reviewVerificationRequest: vi.fn(() => Promise.resolve()),
  submitVerificationRequest: vi.fn(() => Promise.resolve()),
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

describe('PluginManagerModal catalog, installation, and verification queue', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
    store.clear();
    vi.clearAllMocks();
    listBuiltinKernelPlugins.mockResolvedValue([]);
  });

  it('installs plugin from manifest URL and handles empty input error', async () => {
    new PluginManagerModal(root);
    await flush();

    const installUrlBtn = root.querySelector<HTMLButtonElement>('[data-action=install-url]')!;
    const input = root.querySelector<HTMLInputElement>('.plugin-input')!;

    // Empty URL shows error
    installUrlBtn.click();
    await flush();
    expect(root.querySelector('.plugin-status')?.textContent).toContain('Enter a manifest URL first.');

    // Valid URL triggers install
    input.value = 'https://example.com/plugin.json';
    const { installPluginFromManifestUrl } = await import('../core/kernel/PluginRegistry');
    vi.mocked(installPluginFromManifestUrl).mockResolvedValue({
      record: {
        id: 'test-custom',
        version: '1.0.0',
        title: 'Test Plugin',
        description: 'Testing',
        category: 'delivery',
        thumbnailUrl: '',
        entrypointUrl: '',
        permissions: [],
        targetHardware: 'canvas',
        sourceKind: 'manifest',
        manifestUrl: 'https://example.com/plugin.json',
        bundleSha256: 'abc1234567890',
        installedAt: new Date().toISOString(),
        trustLevel: 'unverified',
      },
    } as any);

    installUrlBtn.click();
    await flush();
    expect(installPluginFromManifestUrl).toHaveBeenCalledWith('https://example.com/plugin.json');
  });

  it('installs plugin from uploaded bundle file and handles missing file error', async () => {
    new PluginManagerModal(root);
    await flush();

    const installFileBtn = root.querySelector<HTMLButtonElement>('[data-action=install-file]')!;
    const fileInput = root.querySelector<HTMLInputElement>('.plugin-file')!;

    // No file selected shows error
    installFileBtn.click();
    await flush();
    expect(root.querySelector('.plugin-status')?.textContent).toContain('Choose a bundled JavaScript module first.');

    // With file selected
    const mockFile = new File(['export default {}'], 'plugin.js', { type: 'application/javascript' });
    Object.defineProperty(fileInput, 'files', { value: [mockFile], configurable: true });

    const { installPluginFromBundleFile } = await import('../core/kernel/PluginRegistry');
    vi.mocked(installPluginFromBundleFile).mockResolvedValue({
      record: {
        id: 'test-uploaded',
        version: '1.0.0',
        title: 'Uploaded Plugin',
        description: 'Testing upload',
        category: 'puzzle',
        thumbnailUrl: '',
        entrypointUrl: '',
        permissions: [],
        targetHardware: 'canvas',
        sourceKind: 'upload',
        bundleSha256: 'xyz987654321',
        installedAt: new Date().toISOString(),
        trustLevel: 'unverified',
      },
    } as any);

    installFileBtn.click();
    await flush();
    expect(installPluginFromBundleFile).toHaveBeenCalledWith(mockFile);
  });

  it('renders installed plugin card and handles launch and remove actions', async () => {
    const { getPluginCatalogSnapshot, removeInstalledPlugin, launchInstalledPlugin } = await import('../core/kernel/PluginRegistry');
    vi.mocked(getPluginCatalogSnapshot).mockResolvedValue({
      installed: [
        {
          id: 'test-card-plugin',
          version: '1.2.0',
          title: 'Card Game',
          description: 'A playable card plugin',
          category: 'puzzle',
          thumbnailUrl: '',
          entrypointUrl: '',
          permissions: [],
          targetHardware: 'canvas',
          sourceKind: 'manifest',
          bundleSha256: 'hash123456789',
          installedAt: new Date().toISOString(),
          trustLevel: 'verified',
        },
      ],
      serverGames: [],
    } as any);

    new PluginManagerModal(root);
    await flush();

    const card = root.querySelector('[data-plugin-id="test-card-plugin"]');
    expect(card).not.toBeNull();

    // Launch
    const launchBtn = card?.querySelector<HTMLButtonElement>('[data-action=launch]');
    launchBtn?.click();
    await flush();
    expect(launchInstalledPlugin).toHaveBeenCalledWith('test-card-plugin', {}, expect.any(Object));

    // Remove
    const removeBtn = card?.querySelector<HTMLButtonElement>('[data-action=remove]');
    removeBtn?.click();
    await flush();
    expect(removeInstalledPlugin).toHaveBeenCalledWith('test-card-plugin');
  });

  it('renders owner verification queue and handles approve/reject reviews', async () => {
    const { listVerificationRequests, reviewVerificationRequest } = await import('../api/endpoints/plugins');
    vi.mocked(listVerificationRequests).mockResolvedValue([
      {
        id: 'req-1',
        requesterUserId: 'user-pip',
        pluginId: 'community-radio',
        sourceKind: 'manifest',
        bundleSha256: 'abcdef123456',
        status: 'pending',
        pluginMetadata: {
          title: 'Community Radio',
          description: 'Radio station streaming',
        },
        createdAt: new Date().toISOString(),
      },
    ] as any);

    new PluginManagerModal(root);
    await flush();

    const queueCard = root.querySelector('[data-request-id="req-1"]');
    expect(queueCard).not.toBeNull();

    // Approve
    const approveBtn = queueCard?.querySelector<HTMLButtonElement>('[data-action=approve]');
    approveBtn?.click();
    await flush();
    expect(reviewVerificationRequest).toHaveBeenCalledWith('req-1', true, 'Approved by owner');

    // Reject
    const rejectBtn = queueCard?.querySelector<HTMLButtonElement>('[data-action=reject]');
    rejectBtn?.click();
    await flush();
    expect(reviewVerificationRequest).toHaveBeenCalledWith('req-1', false, 'Rejected by owner');
  });
});

