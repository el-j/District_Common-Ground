import { describe, it, expect } from 'vitest';
import { statusWarnings, describeDayReport } from './hudStatus';
import { INITIAL_STATE, type GameState } from '../core/state/useGameStore';

function state(patch: { player?: Partial<GameState['player']>; economy?: Partial<GameState['economy']>; flat?: string | null } = {}): GameState {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.player = { ...s.player, classRole: 'pip', cash: 50, energy: 50, stressLevel: 30, ...patch.player };
  s.economy = { ...s.economy, ...patch.economy };
  s.housing = { ...s.housing, currentFlatId: patch.flat === undefined ? 'pips-courier-room' : patch.flat };
  return s;
}

// 2026-09-29 launch audit §1.7 / D2 — stress, hunger and homelessness now
// have consequences, so the HUD has to say so before they bite.
describe('statusWarnings', () => {
  it('is quiet when nothing is wrong', () => {
    expect(statusWarnings(state())).toEqual([]);
  });

  it('warns at breaking point that a breakdown will happen tonight', () => {
    expect(statusWarnings(state({ player: { stressLevel: 100 } })).join(' ')).toMatch(/break down tonight/i);
  });

  it('warns about restless sleep at high stress', () => {
    expect(statusWarnings(state({ player: { stressLevel: 80 } })).join(' ')).toMatch(/restless/i);
  });

  it('warns while starving', () => {
    expect(statusWarnings(state({ economy: { starvingDays: 2 } })).join(' ')).toMatch(/starving/i);
  });

  it('warns about sleeping rough', () => {
    expect(statusWarnings(state({ flat: null })).join(' ')).toMatch(/sleeping rough/i);
  });
});

describe('describeDayReport', () => {
  const base = { day: 2, starving: false, unpaid: 0, breakdown: false, communityNode: null, communityPct: 0 } as const;

  it('reports neighbours\' help on the focus build', () => {
    const lines = describeDayReport({ ...base, communityNode: 'kitchenProgress', communityPct: 3 });
    expect(lines.join(' ')).toMatch(/Neighbours added \+3% to the Community Kitchen/);
  });

  it('reports unpaid costs and a breakdown', () => {
    const lines = describeDayReport({ ...base, starving: true, unpaid: 12, breakdown: true, day: 4 });
    expect(lines.join(' ')).toMatch(/\$12/);
    expect(lines.join(' ')).toMatch(/breakdown/i);
  });

  it('is empty for an uneventful night', () => {
    expect(describeDayReport(base)).toEqual([]);
  });
});
