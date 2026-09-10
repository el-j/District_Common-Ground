import { get, set } from 'idb-keyval';
import { useGameStore, type GameState } from './useGameStore';

const SAVE_KEY = 'district-cg-save';

export async function loadSave(): Promise<void> {
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
}
