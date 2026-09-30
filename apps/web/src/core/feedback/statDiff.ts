import type { GameState } from '../state/useGameStore';

export type StatKey = 'cash' | 'energy' | 'trust' | 'stress' | 'resilience';

export interface StatDelta {
  stat: StatKey;
  delta: number;
  /** Whether this change is good news for the player (drives colour/sound). */
  good: boolean;
  text: string;
}

const sign = (n: number) => (n > 0 ? '+' : '−');

const STATS: Array<{ stat: StatKey; read: (s: GameState) => number; higherIsBetter: boolean; label: (d: number) => string }> = [
  { stat: 'cash', read: s => s.player.cash, higherIsBetter: true, label: d => `${sign(d)}$${Math.abs(d)}` },
  { stat: 'energy', read: s => s.player.energy, higherIsBetter: true, label: d => `${sign(d)}${Math.abs(d)}⚡` },
  { stat: 'trust', read: s => s.player.socialTrust, higherIsBetter: true, label: d => `${sign(d)}${Math.abs(d)}🤝` },
  { stat: 'stress', read: s => s.player.stressLevel, higherIsBetter: false, label: d => `${sign(d)}${Math.abs(d)}% stress` },
  { stat: 'resilience', read: s => s.commons.resilienceScore, higherIsBetter: true, label: d => `${sign(d)}${Math.abs(d)}% resilience` },
];

/** The visible stat changes between two store states, for the HUD's
 *  floating "+$12" feedback. Silent outside play, and across a new game or a
 *  character change, where numbers jump without the player doing anything. */
export function diffStats(prev: GameState, next: GameState): StatDelta[] {
  if (prev.meta.phase !== 'playing' || next.meta.phase !== 'playing') return [];
  if (prev.player.classRole !== next.player.classRole) return [];
  const out: StatDelta[] = [];
  for (const { stat, read, higherIsBetter, label } of STATS) {
    const delta = Math.round(read(next) - read(prev));
    if (delta === 0) continue;
    out.push({ stat, delta, good: (delta > 0) === higherIsBetter, text: label(delta) });
  }
  return out;
}
