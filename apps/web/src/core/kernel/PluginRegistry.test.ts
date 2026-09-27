import { describe, it, expect, vi, beforeEach } from 'vitest';

const idbStore = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: (key: string) => Promise.resolve(idbStore.get(key)),
  set: (key: string, value: unknown) => {
    idbStore.set(key, value);
    return Promise.resolve();
  },
  del: (key: string) => {
    idbStore.delete(key);
    return Promise.resolve();
  },
}));

vi.mock('../../api/endpoints/games', () => ({
  listGames: vi.fn().mockResolvedValue([
    {
      id: 'server-game-1',
      version: '1.0.0',
      title: 'Server Game 1',
      description: 'Desc',
      category: 'delivery',
      thumbnailUrl: '',
      entrypointUrl: '/games/1.js',
      targetHardware: 'canvas',
    },
  ]),
}));

vi.mock('./PluginSandbox', () => ({
  inspectBundleManifest: vi.fn().mockResolvedValue({
    id: 'bundle-plugin',
    version: '1.0.0',
    title: 'Bundle Plugin',
    description: 'Uploaded file plugin',
    category: 'puzzle',
    entrypointUrl: 'index.js',
    targetHardware: 'canvas',
    permissions: ['wallet:grant'],
  }),
}));

import {
  bootstrapInstalledPlugins,
  installPluginFromManifestUrl,
  installPluginFromBundleFile,
  removeInstalledPlugin,
  getPluginCatalogSnapshot,
  type InstalledPluginRecord,
} from './PluginRegistry';

describe('PluginRegistry', () => {
  beforeEach(() => {
    idbStore.clear();
    const loc = { origin: 'http://localhost:9300', href: 'http://localhost:9300/', protocol: 'http:', hostname: 'localhost' };
    vi.stubGlobal('location', loc);
    vi.stubGlobal('window', { location: loc });
  });

  it('bootstraps installed plugins when empty and after manual insertion', async () => {
    const initial = await bootstrapInstalledPlugins();
    expect(initial.installed).toEqual([]);

    const record: InstalledPluginRecord = {
      id: 'server-game-1',
      version: '1.0.0',
      title: 'Test Plugin',
      description: 'Test Description',
      category: 'delivery',
      thumbnailUrl: '',
      entrypointUrl: 'http://localhost:9300/test.js',
      permissions: [],
      targetHardware: 'canvas',
      sourceKind: 'url',
      bundleSha256: 'abc123sha',
      bundleStorageKey: 'dcg-installed-plugin-bundle:server-game-1',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trustLevel: 'review-needed',
    };

    idbStore.set('dcg-installed-plugin-index', [record]);
    const after = await bootstrapInstalledPlugins();
    expect(after.installed).toHaveLength(1);
    expect(after.installed[0].id).toBe('server-game-1');
    // Because server has matching game, trustLevel transitions to 'trusted'
    expect(after.installed[0].trustLevel).toBe('trusted');
  });

  it('removes a plugin from index and bundle storage', async () => {
    const record: InstalledPluginRecord = {
      id: 'remove-me',
      version: '1.0.0',
      title: 'Remove Me',
      description: 'Test',
      category: 'delivery',
      thumbnailUrl: '',
      entrypointUrl: 'http://localhost:9300/remove.js',
      permissions: [],
      targetHardware: 'canvas',
      sourceKind: 'url',
      bundleSha256: 'abc',
      bundleStorageKey: 'dcg-installed-plugin-bundle:remove-me',
      installedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trustLevel: 'trusted',
    };

    idbStore.set('dcg-installed-plugin-index', [record]);
    idbStore.set(record.bundleStorageKey, 'console.log("bundle");');

    await removeInstalledPlugin('remove-me');

    const index = (idbStore.get('dcg-installed-plugin-index') as InstalledPluginRecord[]) ?? [];
    expect(index).toEqual([]);
    expect(idbStore.has(record.bundleStorageKey)).toBe(false);
  });

  it('installs from bundle file using inspectBundleManifest', async () => {
    const fakeFile = {
      name: 'bundle.js',
      text: () => Promise.resolve('export const manifest = { ... };'),
    } as unknown as File;

    const res = await installPluginFromBundleFile(fakeFile);
    expect(res.record.id).toBe('bundle-plugin');
    expect(res.record.sourceKind).toBe('file');
    expect(res.record.trustLevel).toBe('review-needed');

    const index = (idbStore.get('dcg-installed-plugin-index') as InstalledPluginRecord[]) ?? [];
    expect(index).toHaveLength(1);
    expect(index[0].id).toBe('bundle-plugin');
  });

  it('rejects installation from disallowed remote URLs', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('bad-manifest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'bad-plugin',
            version: '1.0.0',
            title: 'Bad Plugin',
            description: 'Disallowed host',
            category: 'delivery',
            entrypointUrl: 'ftp://malicious.com/bundle.js',
            targetHardware: 'canvas',
          }),
        });
      }
      return Promise.resolve({ ok: false });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      installPluginFromManifestUrl('http://localhost:9300/bad-manifest.json')
    ).rejects.toThrow('Blocked plugin bundle URL');
  });

  it('installs from a valid manifest URL and caches bundle', async () => {
    const manifestJson = {
      id: 'bundle-plugin',
      version: '1.0.0',
      title: 'Web Plugin',
      description: 'Fetched from URL',
      category: 'delivery',
      entrypointUrl: 'http://localhost:9300/plugins/web/index.js',
      targetHardware: 'canvas',
      permissions: ['wallet:grant'],
    };

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(manifestJson),
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('console.log("web plugin bundle");'),
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await installPluginFromManifestUrl('http://localhost:9300/plugins/web/manifest.json');
    expect(res.record.id).toBe('bundle-plugin');
    expect(res.record.trustLevel).toBe('review-needed');

    const index = (idbStore.get('dcg-installed-plugin-index') as InstalledPluginRecord[]) ?? [];
    expect(index.some(p => p.id === 'bundle-plugin')).toBe(true);
  });

  it('rejects manifests requesting unsupported permissions', async () => {
    const manifestJson = {
      id: 'bad-perm',
      version: '1.0.0',
      title: 'Bad Perm',
      description: 'Bad Perm',
      category: 'delivery',
      entrypointUrl: 'http://localhost:9300/index.js',
      targetHardware: 'canvas',
      permissions: ['unsupported:dangerous_perm'],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manifestJson),
      text: () => Promise.resolve('bundle code'),
    }));

    await expect(
      installPluginFromManifestUrl('http://localhost:9300/bad.json')
    ).rejects.toThrow('requests unsupported permissions');
  });

  it('getPluginCatalogSnapshot merges installed plugins and server games', async () => {
    const snapshot = await getPluginCatalogSnapshot();
    expect(snapshot.serverGames).toHaveLength(1);
    expect(snapshot.serverGames[0].id).toBe('server-game-1');
  });
});
