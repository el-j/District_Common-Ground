import { del, get, set } from 'idb-keyval';
import type {
  MinigameCategory,
  MinigameHardwareTarget,
  MinigameManifest,
  MinigameRole,
} from '@district-cg/shared-types';
import { listGames, type ServerGameManifest } from '../../api/endpoints/games';
import { MinigameLoader } from './MinigameLoader';
import { inspectBundleManifest } from './PluginSandbox';

const INDEX_KEY = 'dcg-installed-plugin-index';
const BUNDLE_KEY_PREFIX = 'dcg-installed-plugin-bundle:';

const ALLOWED_PERMISSIONS = new Set(['wallet:grant']);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export type PluginSourceKind = 'url' | 'file';

export interface InstalledPluginRecord {
  id: string;
  version: string;
  title: string;
  description: string;
  category: MinigameCategory;
  thumbnailUrl: string;
  entrypointUrl: string;
  permissions: string[];
  requiredRole?: MinigameRole;
  targetHardware: MinigameHardwareTarget;
  sourceKind: PluginSourceKind;
  manifestUrl?: string;
  sourceUrl?: string;
  bundleSha256: string;
  bundleStorageKey: string;
  installedAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  serverVersion?: string;
  serverStatus?: 'matches' | 'outdated' | 'conflict' | 'missing';
  trustLevel: 'trusted' | 'review-needed';
}

export interface PluginInstallResult {
  record: InstalledPluginRecord;
  manifest: MinigameManifest;
}

export interface PluginCatalogSnapshot {
  installed: InstalledPluginRecord[];
  serverGames: ServerGameManifest[];
}

type BundleModule = MinigameModule & { manifest?: MinigameManifest };

interface MinigameModule {
  createMinigame(): {
    mount(container: HTMLElement, context: unknown): Promise<void>;
    unmount(): Promise<void>;
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function cloneManifest(manifest: MinigameManifest): MinigameManifest {
  return {
    ...manifest,
    permissions: manifest.permissions ? [...manifest.permissions] : undefined,
  };
}

function validateManifest(manifest: MinigameManifest): void {
  if (!ID_PATTERN.test(manifest.id)) {
    throw new Error(`Invalid plugin id "${manifest.id}"`);
  }
  if (!VERSION_PATTERN.test(manifest.version)) {
    throw new Error(`Invalid plugin version for ${manifest.id}`);
  }
  if (!manifest.title.trim() || !manifest.description.trim()) {
    throw new Error(`Plugin ${manifest.id} is missing title or description`);
  }
  if (!manifest.entrypointUrl.trim()) {
    throw new Error(`Plugin ${manifest.id} is missing entrypointUrl`);
  }
  if (manifest.permissions?.some(permission => !ALLOWED_PERMISSIONS.has(permission))) {
    throw new Error(`Plugin ${manifest.id} requests unsupported permissions`);
  }
}

function isAllowedRemoteUrl(url: URL): boolean {
  if (url.origin === window.location.origin) return true;
  if (url.protocol === 'https:') return true;
  return (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.protocol === 'http:';
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(digest);
}

async function importTrustedBundle(bundleText: string, label: string): Promise<BundleModule> {
  const blob = new Blob([bundleText], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const module = await import(/* @vite-ignore */ blobUrl) as BundleModule;
    if (typeof module.createMinigame !== 'function') {
      throw new Error(`Plugin bundle ${label} does not export createMinigame()`);
    }
    return module;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function readIndex(): Promise<InstalledPluginRecord[]> {
  try {
    return (await get<InstalledPluginRecord[]>(INDEX_KEY)) ?? [];
  } catch {
    return [];
  }
}

async function writeIndex(records: InstalledPluginRecord[]): Promise<void> {
  await set(INDEX_KEY, records);
}

function bundleStorageKey(id: string): string {
  return `${BUNDLE_KEY_PREFIX}${id}`;
}

async function loadBundleText(record: InstalledPluginRecord): Promise<string | null> {
  try {
    return (await get<string>(record.bundleStorageKey)) ?? null;
  } catch {
    return null;
  }
}

function versionParts(version: string): number[] {
  return version.split(/[.+-]/).map(part => Number.parseInt(part, 10) || 0);
}

function compareVersions(left: string, right: string): number {
  const leftParts = versionParts(left);
  const rightParts = versionParts(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

async function registerLoadedModule(manifest: MinigameManifest, module: BundleModule): Promise<void> {
  MinigameLoader.registerLocalMinigame(manifest.id, cloneManifest(manifest), async () => ({
    createMinigame: module.createMinigame,
  }));
}

function createRecord(manifest: MinigameManifest, bundleSha256: string, sourceKind: PluginSourceKind, manifestUrl?: string): InstalledPluginRecord {
  const timestamp = nowIso();
  return {
    id: manifest.id,
    version: manifest.version,
    title: manifest.title,
    description: manifest.description,
    category: manifest.category,
    thumbnailUrl: manifest.thumbnailUrl,
    entrypointUrl: manifest.entrypointUrl,
    permissions: manifest.permissions ? [...manifest.permissions] : [],
    requiredRole: manifest.requiredRole,
    targetHardware: manifest.targetHardware,
    sourceKind,
    manifestUrl,
    sourceUrl: manifest.sourceUrl,
    bundleSha256,
    bundleStorageKey: bundleStorageKey(manifest.id),
    installedAt: timestamp,
    updatedAt: timestamp,
    trustLevel: sourceKind === 'file' || sourceKind === 'url' ? 'review-needed' : 'trusted',
  };
}

async function persistInstallation(record: InstalledPluginRecord, bundleText: string): Promise<void> {
  const index = await readIndex();
  const next = index.filter(item => item.id !== record.id).concat(record);
  await writeIndex(next);
  await set(record.bundleStorageKey, bundleText);
}

async function compareWithServer(record: InstalledPluginRecord): Promise<void> {
  const serverGames = await listGames().catch(() => []);
  const server = serverGames.find(game => game.id === record.id);
  if (!server) {
    record.serverStatus = 'missing';
    record.serverVersion = undefined;
    return;
  }
  record.serverVersion = server.version;
  record.serverStatus = server.version === record.version
    ? 'matches'
    : compareVersions(server.version, record.version) > 0
      ? 'outdated'
      : 'conflict';
}

async function quarantineManifestAndBundle(manifest: MinigameManifest, bundleText: string, sourceKind: PluginSourceKind, manifestUrl?: string): Promise<PluginInstallResult> {
  validateManifest(manifest);
  const hash = await sha256(bundleText);
  if (manifest.bundleSha256 && manifest.bundleSha256 !== hash) {
    throw new Error(`Bundle hash mismatch for ${manifest.id}`);
  }

  const inspectedManifest = cloneManifest(await inspectBundleManifest(bundleText, manifest.id));
  validateManifest(inspectedManifest);
  if (inspectedManifest.id !== manifest.id) {
    throw new Error(`Plugin bundle id mismatch for ${manifest.id}`);
  }

  const record = createRecord(inspectedManifest, hash, sourceKind, manifestUrl);
  await persistInstallation(record, bundleText);
  await compareWithServer(record);

  return { record, manifest: inspectedManifest };
}

async function fetchBundleFromManifest(manifestUrl: string, entrypointUrl: string): Promise<{ bundleText: string; bundleUrl: string }> {
  const bundleUrl = new URL(entrypointUrl, manifestUrl);
  if (!isAllowedRemoteUrl(bundleUrl)) {
    throw new Error(`Blocked plugin bundle URL: ${bundleUrl.toString()}`);
  }
  const response = await fetch(bundleUrl.toString(), { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Unable to fetch plugin bundle: ${bundleUrl.toString()}`);
  }
  return { bundleText: await response.text(), bundleUrl: bundleUrl.toString() };
}

export async function bootstrapInstalledPlugins(): Promise<PluginCatalogSnapshot> {
  const installed = await readIndex();
  for (const record of installed) {
    if (record.trustLevel !== 'trusted') {
      continue;
    }
    const bundleText = await loadBundleText(record);
    if (!bundleText) {
      continue;
    }
    try {
      const module = await importTrustedBundle(bundleText, record.id);
      const manifest = module.manifest ?? {
        id: record.id,
        version: record.version,
        title: record.title,
        description: record.description,
        category: record.category,
        thumbnailUrl: record.thumbnailUrl,
        entrypointUrl: record.entrypointUrl,
        permissions: record.permissions,
        requiredRole: record.requiredRole,
        targetHardware: record.targetHardware,
      };
      await registerLoadedModule(cloneManifest(manifest), module);
    } catch {
      MinigameLoader.unregisterMinigame(record.id);
    }
  }

  const serverGames = await listGames().catch(() => []);
  return { installed: await readIndex(), serverGames };
}

export async function installPluginFromManifestUrl(manifestUrl: string): Promise<PluginInstallResult> {
  const response = await fetch(new URL(manifestUrl, window.location.href).toString(), { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`Unable to fetch manifest: ${manifestUrl}`);
  }

  const parsedManifest = cloneManifest(await response.json() as MinigameManifest);
  validateManifest(parsedManifest);
  if (!parsedManifest.sourceUrl) {
    parsedManifest.sourceUrl = new URL(parsedManifest.entrypointUrl, manifestUrl).toString();
  }

  const { bundleText, bundleUrl } = await fetchBundleFromManifest(manifestUrl, parsedManifest.entrypointUrl);
  parsedManifest.sourceUrl = bundleUrl;
  const result = await quarantineManifestAndBundle(parsedManifest, bundleText, 'url', manifestUrl);
  return result;
}

export async function installPluginFromBundleFile(file: File): Promise<PluginInstallResult> {
  if (!/\.(js|mjs)$/i.test(file.name)) {
    throw new Error('Upload a bundled JavaScript module (.js or .mjs)');
  }

  const bundleText = await file.text();
  const manifest = cloneManifest(await inspectBundleManifest(bundleText, file.name));
  manifest.sourceUrl = file.name;
  return quarantineManifestAndBundle(manifest, bundleText, 'file');
}

export async function refreshInstalledPlugins(): Promise<InstalledPluginRecord[]> {
  const index = await readIndex();

  for (const record of index) {
    await compareWithServer(record);
    if (record.serverStatus === 'missing' && record.trustLevel === 'trusted') {
      record.trustLevel = 'review-needed';
      MinigameLoader.unregisterMinigame(record.id);
    }
    if (record.serverStatus !== 'missing' && record.trustLevel !== 'trusted') {
      record.trustLevel = 'trusted';
      record.updatedAt = nowIso();
    }
    if (!record.manifestUrl) {
      continue;
    }

    const response = await fetch(record.manifestUrl, { mode: 'cors', credentials: 'omit' }).catch(() => null);
    if (!response || !response.ok) {
      record.lastCheckedAt = nowIso();
      continue;
    }

    const remoteManifest = cloneManifest(await response.json() as MinigameManifest);
    validateManifest(remoteManifest);
    const remoteBundleUrl = new URL(remoteManifest.entrypointUrl, record.manifestUrl);
    if (!isAllowedRemoteUrl(remoteBundleUrl)) {
      continue;
    }

    const bundleResponse = await fetch(remoteBundleUrl.toString(), { mode: 'cors', credentials: 'omit' }).catch(() => null);
    if (!bundleResponse || !bundleResponse.ok) {
      continue;
    }

    const bundleText = await bundleResponse.text();
    const hash = await sha256(bundleText);
    if (remoteManifest.bundleSha256 && remoteManifest.bundleSha256 !== hash) {
      continue;
    }

    const newer = compareVersions(remoteManifest.version, record.version) > 0;
    const changed = hash !== record.bundleSha256;
    if (!newer && !changed) {
      record.lastCheckedAt = nowIso();
      continue;
    }

    const inspectedManifest = cloneManifest(await inspectBundleManifest(bundleText, record.id));
    validateManifest(inspectedManifest);
    if (inspectedManifest.id !== record.id) {
      continue;
    }

    record.version = inspectedManifest.version;
    record.title = inspectedManifest.title;
    record.description = inspectedManifest.description;
    record.category = inspectedManifest.category;
    record.thumbnailUrl = inspectedManifest.thumbnailUrl;
    record.entrypointUrl = inspectedManifest.entrypointUrl;
    record.permissions = [...(inspectedManifest.permissions ?? [])];
    record.requiredRole = inspectedManifest.requiredRole;
    record.targetHardware = inspectedManifest.targetHardware;
    record.sourceUrl = remoteBundleUrl.toString();
    record.bundleSha256 = hash;
    record.updatedAt = nowIso();
    record.lastCheckedAt = nowIso();

    await persistInstallation(record, bundleText);
  }

  await writeIndex(index);
  await bootstrapInstalledPlugins();
  return index;
}

export async function removeInstalledPlugin(id: string): Promise<void> {
  const index = await readIndex();
  const record = index.find(item => item.id === id);
  await writeIndex(index.filter(item => item.id !== id));
  if (record) {
    await del(record.bundleStorageKey);
  }
  MinigameLoader.unregisterMinigame(id);
}

export async function getPluginCatalogSnapshot(): Promise<PluginCatalogSnapshot> {
  return {
    installed: await readIndex(),
    serverGames: await listGames().catch(() => []),
  };
}
