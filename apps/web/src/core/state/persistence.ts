import { get, set } from 'idb-keyval';
import { useGameStore, INITIAL_STATE, type GameState } from './useGameStore';
import { loadFromServer, uploadToServer } from '../../api/endpoints/save';
import { ApiError } from '../../api/client';
import { computeResilienceScore } from '../simulation/EconomyMath';

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Old saves predate fields added later. Every top-level slice that is a
 * plain object in INITIAL_STATE is merged one level deep against its
 * default, so a missing field (or a whole missing slice) loads with its
 * default instead of `undefined`. Arrays and the save's own values always
 * win. (Before the 2026-09-29 audit only `player` and `housing` were
 * merged, and each new field needed a hand-written special case.)
 *
 * Derived values are recomputed after the merge so an old save carrying a
 * value from a since-fixed bug (e.g. resilience reset to 0) heals on load.
 */
export function mergeWithDefaults(saved: GameState): GameState {
  const merged: Record<string, unknown> = { ...INITIAL_STATE, ...saved };
  for (const [key, def] of Object.entries(INITIAL_STATE)) {
    const value = (saved as unknown as Record<string, unknown>)[key];
    if (isPlainObject(def)) {
      merged[key] = isPlainObject(value) ? { ...def, ...value } : def;
    }
  }
  const state = merged as unknown as GameState;
  // Saves from before the first-day guide existed: those players are past day one.
  if (!isPlainObject((saved as unknown as Record<string, unknown>)['tutorial']) && saved.meta?.day > 1) {
    state.tutorial = { step: 0, done: true };
  }
  state.commons = { ...state.commons, resilienceScore: computeResilienceScore(state.commons) };
  state.meta = { ...state.meta, saveVersion: INITIAL_STATE.meta.saveVersion };
  return state;
}

const SAVE_KEY = 'district-cg-save';
const TOKEN_KEY = 'dcg-token';
const OFFLINE_KEY = 'dcg-play-offline';

/** Remembers "Play offline" so the sign-in screen doesn't block every
 *  launch (audit §3.6). Signing in later (Settings) clears it. */
export function rememberOfflineChoice(): void {
  try { localStorage.setItem(OFFLINE_KEY, '1'); } catch { /* private browsing */ }
}

export function hasChosenOffline(): boolean {
  try { return localStorage.getItem(OFFLINE_KEY) === '1'; } catch { return false; }
}

export function clearOfflineChoice(): void {
  try { localStorage.removeItem(OFFLINE_KEY); } catch { /* no-op */ }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private browsing — no-op
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // no-op
  }
}

const savedAtOf = (s: GameState | null | undefined): number =>
  s && typeof s.meta?.savedAt === 'number' ? s.meta.savedAt : 0;
const isSave = (s: unknown): s is GameState =>
  !!s && typeof (s as GameState).meta?.day === 'number';

/** Loads the newest of the server save (when signed in) and the local
 *  IndexedDB save. Newer local progress (e.g. played offline) is kept and
 *  pushed back up instead of being overwritten by an older server copy. */
export async function loadSave(): Promise<void> {
  const token = getToken();
  let server: GameState | null = null;
  let local: GameState | null = null;

  if (token) {
    try {
      const serverState = await loadFromServer(token);
      if (isSave(serverState)) server = serverState;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
      }
      // fall through to IndexedDB on any network error
    }
  }

  try {
    const saved = await get<GameState>(SAVE_KEY);
    if (isSave(saved)) local = saved;
  } catch {
    // corrupt or missing save — stay with initial state
  }

  const chosen = server && (!local || savedAtOf(server) >= savedAtOf(local)) ? server : local;
  if (!chosen) return;
  useGameStore.setState(mergeWithDefaults(chosen));

  const currentToken = getToken();
  if (chosen === local && currentToken && (!server || savedAtOf(local) > savedAtOf(server))) {
    uploadToServer(currentToken, local).catch(() => { /* retried by autosave */ });
  }
}

export async function clearSave(): Promise<void> {
  try {
    await set(SAVE_KEY, undefined);
  } catch {
    // best effort
  }
}

function stamp(state: GameState): GameState {
  return { ...state, meta: { ...state.meta, savedAt: Date.now() } };
}

async function saveLocal(state: GameState): Promise<void> {
  try {
    await set(SAVE_KEY, state);
  } catch {
    // IndexedDB unavailable — best effort only
  }
}

function upload(state: GameState, keepalive = false): Promise<void> {
  const token = getToken();
  if (!token) return Promise.resolve();
  return uploadToServer(token, state, keepalive).catch(() => {
    // silent — IndexedDB already has the save; autosave retries later
  });
}

/** Saves now: IndexedDB always, the server too when signed in (without
 *  blocking gameplay on the network). */
export async function saveToDB(state: GameState): Promise<void> {
  const stamped = stamp(state);
  await saveLocal(stamped);
  void upload(stamped);
}

// ── Autosave (audit §2.1 — saves used to happen only on End Day) ───────────

let flushHandler: (() => void) | null = null;

/** Flushes any pending autosave immediately (page hidden / closing). */
export function flushSave(): void {
  flushHandler?.();
}

/** Saves locally shortly after every change while playing, and uploads to
 *  the server at most once per `serverIntervalMs`. Also flushes when the
 *  page is hidden or closed. Returns a stop function. */
export function startAutosave(
  { localDelayMs = 1500, serverIntervalMs = 30_000 }: { localDelayMs?: number; serverIntervalMs?: number } = {},
): () => void {
  let localTimer: ReturnType<typeof setTimeout> | null = null;
  let serverTimer: ReturnType<typeof setTimeout> | null = null;
  let lastUpload = 0;
  let serverDirty = false;

  const uploadIfDue = () => {
    if (!serverDirty || !getToken()) return;
    const wait = lastUpload + serverIntervalMs - Date.now();
    if (wait > 0) {
      if (!serverTimer) serverTimer = setTimeout(() => { serverTimer = null; uploadIfDue(); }, wait);
      return;
    }
    serverDirty = false;
    lastUpload = Date.now();
    void upload(stamp(useGameStore.getState()));
  };

  const writeLocal = () => {
    localTimer = null;
    const state = useGameStore.getState();
    if (state.meta.phase !== 'playing') return;
    void saveLocal(stamp(state));
    uploadIfDue();
  };

  const unsubscribe = useGameStore.subscribe((state) => {
    if (state.meta.phase !== 'playing') return;
    serverDirty = true;
    if (localTimer) clearTimeout(localTimer);
    localTimer = setTimeout(writeLocal, localDelayMs);
  });

  const flush = () => {
    if (localTimer) { clearTimeout(localTimer); localTimer = null; }
    const state = useGameStore.getState();
    if (state.meta.phase !== 'playing') return;
    const stamped = stamp(state);
    void saveLocal(stamped);
    if (serverDirty) {
      serverDirty = false;
      lastUpload = Date.now();
      void upload(stamped, true);
    }
  };
  flushHandler = flush;

  const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  if (typeof window !== 'undefined') window.addEventListener('pagehide', flush);

  return () => {
    unsubscribe();
    if (localTimer) clearTimeout(localTimer);
    if (serverTimer) clearTimeout(serverTimer);
    if (flushHandler === flush) flushHandler = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', flush);
  };
}

/** New Game (audit §2.3): replaces the local *and* server save with a fresh
 *  game, so a signed-in player's old save can't come back on next boot. */
export async function startNewGame(): Promise<void> {
  const fresh = stamp(structuredClone(INITIAL_STATE));
  useGameStore.setState(fresh, true);
  await saveLocal(fresh);
  await upload(fresh);
}
