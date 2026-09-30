import { describe, it, expect } from 'vitest';
import { diffStats } from './statDiff';
import { INITIAL_STATE, type GameState } from '../state/useGameStore';

function playing(patch: Partial<GameState['player']> = {}, resilience = 20): GameState {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.player = { ...s.player, classRole: 'pip', cash: 25, energy: 80, socialTrust: 40, stressLevel: 60, ...patch };
  s.commons.resilienceScore = resilience;
  return s;
}

describe('diffStats', () => {
  it('is empty when nothing the player sees changed', () => {
    expect(diffStats(playing(), playing())).toEqual([]);
  });

  it('reports each changed stat with a signed label and whether it is good news', () => {
    const out = diffStats(playing(), playing({ cash: 37, energy: 70, socialTrust: 45, stressLevel: 55 }, 24));
    expect(out).toEqual([
      { stat: 'cash', delta: 12, good: true, text: '+$12' },
      { stat: 'energy', delta: -10, good: false, text: '−10⚡' },
      { stat: 'trust', delta: 5, good: true, text: '+5🤝' },
      { stat: 'stress', delta: -5, good: true, text: '−5% stress' },
      { stat: 'resilience', delta: 4, good: true, text: '+4% resilience' },
    ]);
  });

  it('treats rising stress as bad news', () => {
    expect(diffStats(playing(), playing({ stressLevel: 65 }))[0]).toMatchObject({ stat: 'stress', good: false, text: '+5% stress' });
  });

  it('stays quiet outside play and across a new game or character change', () => {
    const select = structuredClone(INITIAL_STATE);
    expect(diffStats(select, playing())).toEqual([]);
    expect(diffStats(playing(), { ...playing({ cash: 0 }), meta: { ...playing().meta, phase: 'select' } })).toEqual([]);
    expect(diffStats(playing(), playing({ classRole: 'arthur', cash: 1200 }))).toEqual([]);
  });
});
