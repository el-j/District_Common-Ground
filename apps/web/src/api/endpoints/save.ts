import { request } from '../client';
import type { GameState } from '../../core/state/useGameStore';

export function loadFromServer(token: string): Promise<GameState> {
  return request<GameState>('GET', '/api/v1/save', undefined, token);
}

export function uploadToServer(token: string, state: GameState): Promise<void> {
  return request<void>('PUT', '/api/v1/save', state, token);
}
