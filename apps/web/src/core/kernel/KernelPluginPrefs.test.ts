import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: (key: string) => Promise.resolve(store.get(key)),
  set: (key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  },
}));

import { getDisabledKernelPluginIds, setKernelPluginDisabled } from './KernelPluginPrefs';

describe('KernelPluginPrefs', () => {
  beforeEach(() => store.clear());

  it('starts with no disabled plugins', async () => {
    expect(await getDisabledKernelPluginIds()).toEqual(new Set());
  });

  it('persists a disabled id and returns it from a later read', async () => {
    await setKernelPluginDisabled('bitchat', true);
    expect(await getDisabledKernelPluginIds()).toEqual(new Set(['bitchat']));
  });

  it('re-enabling removes the id again, leaving other disabled ids intact', async () => {
    await setKernelPluginDisabled('bitchat', true);
    await setKernelPluginDisabled('mesh-comms', true);
    await setKernelPluginDisabled('bitchat', false);
    expect(await getDisabledKernelPluginIds()).toEqual(new Set(['mesh-comms']));
  });
});
