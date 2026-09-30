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

import {
  loadSave, saveToDB, clearSave, getToken, setToken, clearToken, startAutosave, flushSave, startNewGame,
  rememberOfflineChoice, hasChosenOffline, clearOfflineChoice,
} from './persistence';
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

// 2026-09-29 launch audit §2.7 — the merge used to cover only `player` and
// `housing`, so the next new field on any other slice would load as
// `undefined`. Every object slice is now merged against INITIAL_STATE.
describe('loadSave() defensive-merges every object slice against INITIAL_STATE', () => {
  beforeEach(() => {
    store.clear();
    useGameStore.setState(INITIAL_STATE, true);
    try { localStorage.removeItem('dcg-token'); } catch { /* jsdom-less env */ }
  });

  it('fills new fields on existing slices (commons, crisisState, meta) from defaults', async () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    delete oldSave.commons.resilienceModifier;
    delete oldSave.crisisState.lastCrisisDay;
    delete oldSave.meta.saveVersion;
    oldSave.commons.kitchenProgress = 40;
    store.set('district-cg-save', oldSave);

    await loadSave();

    const s = useGameStore.getState();
    expect(s.commons.resilienceModifier).toBe(INITIAL_STATE.commons.resilienceModifier);
    expect(s.crisisState.lastCrisisDay).toBe(INITIAL_STATE.crisisState.lastCrisisDay);
    expect(s.commons.kitchenProgress).toBe(40);
  });

  it('fills a whole missing slice (e.g. economy) from defaults', async () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    delete oldSave.economy;
    store.set('district-cg-save', oldSave);

    await loadSave();

    expect(useGameStore.getState().economy).toEqual(INITIAL_STATE.economy);
  });

  it('recomputes resilience from the single owner formula on load', async () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE));
    // a pre-fix save that had its score reset to 0 by the old bug
    oldSave.commons.resilienceScore = 0;
    oldSave.commons.kitchenProgress = 1;
    delete oldSave.commons.resilienceModifier;
    store.set('district-cg-save', oldSave);

    await loadSave();

    expect(useGameStore.getState().commons.resilienceScore).toBeGreaterThanOrEqual(20);
  });

  it('keeps arrays and records from the save as-is (no merging into arrays)', async () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE));
    save.crafting.knownRecipes = ['RECIPE_SCRAP_STOOL'];
    save.inventory.materials = { MATERIAL_WOOD: 3 };
    store.set('district-cg-save', save);

    await loadSave();

    const s = useGameStore.getState();
    expect(s.crafting.knownRecipes).toEqual(['RECIPE_SCRAP_STOOL']);
    expect(s.inventory.materials).toEqual({ MATERIAL_WOOD: 3 });
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
    // the stored/uploaded copy is the same state plus a savedAt stamp
    const expected = { ...testState, meta: { ...testState.meta, savedAt: expect.any(Number) } };
    expect(store.get('district-cg-save')).toEqual(expected);
    expect(uploadToServer).toHaveBeenCalledWith('save-token', expected, false);
  });
});

// 2026-09-29 launch audit §2.1/§2.3/§2.6 — saves only happened on End Day,
// an older server save silently overwrote newer local progress, and New
// Game didn't reset signed-in players.
describe('newest save wins on load', () => {
  beforeEach(() => {
    store.clear();
    mockLocalStorage.clear();
    useGameStore.setState(INITIAL_STATE, true);
    vi.clearAllMocks();
  });

  const at = (day: number, savedAt: number) => ({ ...INITIAL_STATE, meta: { ...INITIAL_STATE.meta, day, savedAt } });

  it('keeps newer local progress over an older server save, and pushes it up', async () => {
    setToken('t');
    vi.mocked(loadFromServer).mockResolvedValue(at(3, 1000) as any);
    vi.mocked(uploadToServer).mockResolvedValue(undefined);
    store.set('district-cg-save', at(7, 2000));

    await loadSave();

    expect(useGameStore.getState().meta.day).toBe(7);
    expect(uploadToServer).toHaveBeenCalled();
  });

  it('uses the server save when it is newer', async () => {
    setToken('t');
    vi.mocked(loadFromServer).mockResolvedValue(at(9, 5000) as any);
    store.set('district-cg-save', at(7, 2000));

    await loadSave();

    expect(useGameStore.getState().meta.day).toBe(9);
  });
});

describe('saveToDB stamps savedAt', () => {
  beforeEach(() => {
    store.clear();
    mockLocalStorage.clear();
    useGameStore.setState(INITIAL_STATE, true);
  });

  it('writes a savedAt timestamp into the stored save', async () => {
    await saveToDB(useGameStore.getState());
    const saved = store.get('district-cg-save') as { meta: { savedAt: number } };
    expect(saved.meta.savedAt).toBeGreaterThan(0);
  });
});

describe('startAutosave', () => {
  beforeEach(() => {
    store.clear();
    mockLocalStorage.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
    const s = structuredClone(INITIAL_STATE);
    s.meta.phase = 'playing';
    useGameStore.setState(s, true);
  });

  it('saves locally shortly after any change while playing', async () => {
    const stop = startAutosave({ localDelayMs: 500, serverIntervalMs: 60_000 });
    useGameStore.setState(s => ({ player: { ...s.player, cash: 42 } }));
    expect(store.get('district-cg-save')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(600);
    expect((store.get('district-cg-save') as { player: { cash: number } }).player.cash).toBe(42);
    stop();
    vi.useRealTimers();
  });

  it('debounces bursts of changes into one write', async () => {
    const stop = startAutosave({ localDelayMs: 500, serverIntervalMs: 60_000 });
    for (let i = 0; i < 5; i += 1) {
      useGameStore.setState(s => ({ player: { ...s.player, cash: i } }));
      await vi.advanceTimersByTimeAsync(100);
    }
    expect(store.get('district-cg-save')).toBeUndefined();
    await vi.advanceTimersByTimeAsync(500);
    expect((store.get('district-cg-save') as { player: { cash: number } }).player.cash).toBe(4);
    stop();
    vi.useRealTimers();
  });

  it('uploads to the server at most once per interval when signed in', async () => {
    setToken('t');
    vi.mocked(uploadToServer).mockResolvedValue(undefined);
    const stop = startAutosave({ localDelayMs: 100, serverIntervalMs: 10_000 });
    useGameStore.setState(s => ({ player: { ...s.player, cash: 1 } }));
    await vi.advanceTimersByTimeAsync(200);
    useGameStore.setState(s => ({ player: { ...s.player, cash: 2 } }));
    await vi.advanceTimersByTimeAsync(200);
    expect(uploadToServer).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(uploadToServer).toHaveBeenCalledTimes(2);
    stop();
    vi.useRealTimers();
  });

  it('flushes immediately when the page is hidden', async () => {
    const stop = startAutosave({ localDelayMs: 5_000, serverIntervalMs: 60_000 });
    useGameStore.setState(s => ({ player: { ...s.player, cash: 77 } }));
    flushSave();
    await vi.advanceTimersByTimeAsync(0);
    expect((store.get('district-cg-save') as { player: { cash: number } }).player.cash).toBe(77);
    stop();
    vi.useRealTimers();
  });

  it('does not save on the character-select screen', async () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, phase: 'select' } }));
    const stop = startAutosave({ localDelayMs: 100, serverIntervalMs: 60_000 });
    useGameStore.setState(s => ({ meta: { ...s.meta, regionCode: 'X' } }));
    await vi.advanceTimersByTimeAsync(500);
    expect(store.get('district-cg-save')).toBeUndefined();
    stop();
    vi.useRealTimers();
  });
});

describe('startNewGame', () => {
  beforeEach(() => {
    store.clear();
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it('replaces both the local and the server save with a fresh game', async () => {
    setToken('t');
    vi.mocked(uploadToServer).mockResolvedValue(undefined);
    const s = structuredClone(INITIAL_STATE);
    s.meta.day = 30;
    s.meta.phase = 'playing';
    useGameStore.setState(s, true);

    await startNewGame();

    expect(useGameStore.getState().meta.day).toBe(1);
    expect(useGameStore.getState().meta.phase).toBe('select');
    expect((store.get('district-cg-save') as { meta: { day: number } }).meta.day).toBe(1);
    const calls = vi.mocked(uploadToServer).mock.calls;
    const uploaded = calls[calls.length - 1]![1];
    expect(uploaded.meta.day).toBe(1);
  });
});

describe('offline choice', () => {
  beforeEach(() => mockLocalStorage.clear());

  it('is remembered until cleared', () => {
    expect(hasChosenOffline()).toBe(false);
    rememberOfflineChoice();
    expect(hasChosenOffline()).toBe(true);
    clearOfflineChoice();
    expect(hasChosenOffline()).toBe(false);
  });
});

describe('first-day guide on old saves', () => {
  beforeEach(() => { store.clear(); mockLocalStorage.clear(); useGameStore.setState(INITIAL_STATE, true); });

  it('is marked done for a pre-guide save that is already past day one', async () => {
    const old = JSON.parse(JSON.stringify(INITIAL_STATE));
    delete old.tutorial;
    old.meta.day = 12;
    store.set('district-cg-save', old);
    await loadSave();
    expect(useGameStore.getState().tutorial.done).toBe(true);
  });
});
