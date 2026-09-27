import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: (key: string) => Promise.resolve(store.get(key)),
  set: (key: string, value: unknown) => {
    store.set(key, value);
    return Promise.resolve();
  },
}));

vi.mock('../../api/endpoints/save', () => ({
  loadFromServer: vi.fn(),
  uploadToServer: vi.fn(),
}));

import { loadFromServer, uploadToServer } from '../../api/endpoints/save';
import { ApiError } from '../../api/client';

import { loadSave, saveToDB, clearSave, getToken, setToken, clearToken } from './persistence';
import { useGameStore, INITIAL_STATE } from './useGameStore';

const mockLocalStorage = (() => {
  let map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => { map.clear(); },
  };
})();
vi.stubGlobal('localStorage', mockLocalStorage);

// M48 — EPIC-36 §1/§2/§3. See docs/tasks/M48-name-and-identity-customization.md.
// The real defensive-merge fix this milestone needed — `player` gained new
// fields on an *already-existing* nested slice, the case
// useGameStore.test.ts (M38) proved zustand's shallow-merge setState()
// does NOT protect on its own.
describe('loadSave() defensive-merges player against INITIAL_STATE', () => {
  beforeEach(() => {
    store.clear();
    useGameStore.setState(INITIAL_STATE, true);
    try { localStorage.removeItem('dcg-token'); } catch { /* jsdom-less env */ }
  });

  it('an old (pre-M48) save missing name/gender/appearance loads with INITIAL_STATE defaults, not undefined', async () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    delete oldSave.player.name;
    delete oldSave.player.gender;
    delete oldSave.player.appearance;
    oldSave.meta.day = 9; // proves the rest of the save still loads correctly
    store.set('district-cg-save', oldSave);

    await loadSave();

    const { player, meta } = useGameStore.getState();
    expect(meta.day).toBe(9);
    expect(player.name).toBe(INITIAL_STATE.player.name);
    expect(player.gender).toBe(INITIAL_STATE.player.gender);
    expect(player.appearance).toBe(INITIAL_STATE.player.appearance);
  });

  it('a real (post-M48) save\'s own name/gender/appearance values are preserved, not overwritten by defaults', async () => {
    const realSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    realSave.player.name = 'Rosa';
    realSave.player.gender = 'self-describe';
    realSave.player.genderSelfDescribe = 'genderfluid';
    realSave.player.appearance = 'APPEARANCE_TONE_3';
    store.set('district-cg-save', realSave);

    await loadSave();

    const { player } = useGameStore.getState();
    expect(player.name).toBe('Rosa');
    expect(player.gender).toBe('self-describe');
    expect(player.genderSelfDescribe).toBe('genderfluid');
    expect(player.appearance).toBe('APPEARANCE_TONE_3');
  });
});

// M54 — EPIC-38 §1. The second genuine instance of this exact problem:
// `housing.visitable` is a new field on the already-existing `housing`
// slice (M43), same shape as `player`'s case above.
describe('loadSave() defensive-merges housing against INITIAL_STATE', () => {
  beforeEach(() => {
    store.clear();
    useGameStore.setState(INITIAL_STATE, true);
    try { localStorage.removeItem('dcg-token'); } catch { /* jsdom-less env */ }
  });

  it('an old (pre-M54) save missing housing.visitable loads with the INITIAL_STATE default, not undefined', async () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    delete oldSave.housing.visitable;
    oldSave.housing.currentFlatId = 'pips-courier-room';
    store.set('district-cg-save', oldSave);

    await loadSave();

    const { housing } = useGameStore.getState();
    expect(housing.visitable).toBe(INITIAL_STATE.housing.visitable);
    expect(housing.currentFlatId).toBe('pips-courier-room'); // rest of the slice still loads correctly
  });

  it('a real (post-M54) save\'s own housing.visitable value is preserved, not overwritten by the default', async () => {
    const realSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    realSave.housing.visitable = true;
    store.set('district-cg-save', realSave);

    await loadSave();

    expect(useGameStore.getState().housing.visitable).toBe(true);
  });
});

describe('persistence token management, server sync, and clearing', () => {
  beforeEach(() => {
    store.clear();
    mockLocalStorage.clear();
    useGameStore.setState(INITIAL_STATE, true);
    vi.clearAllMocks();
  });

  it('manages token via getToken, setToken, clearToken', () => {
    expect(getToken()).toBeNull();
    setToken('token-123');
    expect(getToken()).toBe('token-123');
    clearToken();
    expect(getToken()).toBeNull();
  });

  it('loads save from server when token is present and valid', async () => {
    setToken('auth-token');
    const serverState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, day: 15 },
    };
    vi.mocked(loadFromServer).mockResolvedValue(serverState as any);

    await loadSave();
    expect(useGameStore.getState().meta.day).toBe(15);
  });

  it('clears token on 401 ApiError and falls back to IndexedDB', async () => {
    setToken('bad-token');
    vi.mocked(loadFromServer).mockRejectedValue(new ApiError(401, 'Unauthorized'));

    const localSave = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, day: 4 },
    };
    store.set('district-cg-save', localSave);

    await loadSave();
    expect(getToken()).toBeNull();
    expect(useGameStore.getState().meta.day).toBe(4);
  });

  it('clears saved state in DB via clearSave()', async () => {
    store.set('district-cg-save', { test: true });
    await clearSave();
    expect(store.get('district-cg-save')).toBeUndefined();
  });

  it('saves to IndexedDB and triggers uploadToServer when token exists', async () => {
    setToken('save-token');
    vi.mocked(uploadToServer).mockResolvedValue({} as any);

    const testState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, day: 20 },
    };

    await saveToDB(testState as any);
    expect(store.get('district-cg-save')).toEqual(testState);
    expect(uploadToServer).toHaveBeenCalledWith('save-token', testState);
  });
});
