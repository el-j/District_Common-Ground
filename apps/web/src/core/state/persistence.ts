import { get, set } from 'idb-keyval';
import { useGameStore, type GameState } from './useGameStore';
import { loadFromServer, uploadToServer } from '../../api/endpoints/save';
import { ApiError } from '../../api/client';

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
        useGameStore.setState(serverState);
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
      useGameStore.setState(saved);
    }
  } catch {
    // corrupt or missing save — stay with initial state
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
