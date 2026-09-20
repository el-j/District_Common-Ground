import { get, set } from 'idb-keyval';
import { useGameStore, INITIAL_STATE, type GameState } from './useGameStore';
import { loadFromServer, uploadToServer } from '../../api/endpoints/save';
import { ApiError } from '../../api/client';

/**
 * M48 — EPIC-36 §1/§2/§3. `player` gained new fields (`name`/`gender`/
 * `genderSelfDescribe`/`appearance`) on its *already-existing* nested
 * slice — the genuinely unsafe case `useGameStore.test.ts` (M38) proved
 * zustand's default shallow-merge `setState()` does **not** protect: an
 * old save's `player` object lacks these keys entirely, and a plain
 * `setState(saved)` would replace `state.player` with that old object
 * wholesale, leaving `name`/`gender`/`appearance` `undefined` instead of
 * falling back to `INITIAL_STATE.player`'s defaults. Every other new field
 * added since M38 landed as a brand-new *top-level* slice specifically to
 * avoid needing this — `player` predates all of them, so this was the
 * first genuine defensive-merge this project actually needed to write, not
 * a precautionary one.
 *
 * M54 — EPIC-38 §1 added `housing.visitable`, the second genuine instance
 * of this exact problem: `housing` is an M43 slice that already existed
 * before this field, so it needs the same treatment as `player`.
 */
function mergeWithDefaults(saved: GameState): GameState {
  return {
    ...saved,
    player: { ...INITIAL_STATE.player, ...saved.player },
    housing: { ...INITIAL_STATE.housing, ...saved.housing },
  };
}

const SAVE_KEY = 'district-cg-save';
const TOKEN_KEY = 'dcg-token';

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

export async function loadSave(): Promise<void> {
  const token = getToken();

  if (token) {
    try {
      const serverState = await loadFromServer(token);
      if (serverState && typeof serverState.meta?.day === 'number') {
        useGameStore.setState(mergeWithDefaults(serverState));
        return;
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
      }
      // fall through to IndexedDB on any network error
    }
  }

  try {
    const saved = await get<GameState>(SAVE_KEY);
    if (saved && typeof saved.meta?.day === 'number') {
      useGameStore.setState(mergeWithDefaults(saved));
    }
  } catch {
    // corrupt or missing save — stay with initial state
  }
}

export async function clearSave(): Promise<void> {
  try {
    await set(SAVE_KEY, undefined);
  } catch {
    // best effort
  }
}

export async function saveToDB(state: GameState): Promise<void> {
  try {
    await set(SAVE_KEY, state);
  } catch {
    // IndexedDB unavailable — best effort only
  }

  const token = getToken();
  if (token) {
    // fire-and-forget: never block gameplay on network
    uploadToServer(token, state).catch(() => {
      // silent — IndexedDB already has the save
    });
  }
}
