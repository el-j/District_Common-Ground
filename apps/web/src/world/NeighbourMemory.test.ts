import { describe, it, expect } from 'vitest';
import { neighbourMemory, withMemoryOpener, NEIGHBOUR_IDS } from './NeighbourMemory';
import { INITIAL_STATE, type GameState, type CrisisLogEntry } from '../core/state/useGameStore';

function state(patch: {
  day?: number; log?: CrisisLogEntry[]; stress?: number; trust?: number; starvingDays?: number;
} = {}): GameState {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.meta.day = patch.day ?? 10;
  s.player = { ...s.player, classRole: 'pip', stressLevel: patch.stress ?? 30, socialTrust: patch.trust ?? 40 };
  s.crisisState.historyLog = patch.log ?? [];
  s.economy.starvingDays = patch.starvingDays ?? 0;
  return s;
}
const entry = (day: number, choice: 'solidarity' | 'scapegoat', id = `crisis-${day}`): CrisisLogEntry =>
  ({ id, day, choice, summary: 'x' });

describe('withMemoryOpener', () => {
  const tree = { mira_intro: { text: 'Hey.', responses: [{ label: 'Bye', next: null }] } };

  it('opens the conversation with the memory, then continues into the usual talk', () => {
    const out = withMemoryOpener(tree, 'mira_intro', { text: 'I heard.', mood: 'happy' });
    expect(out.startKey).not.toBe('mira_intro');
    const opener = out.tree[out.startKey];
    expect(opener.text).toBe('I heard.');
    expect(opener.mood).toBe('happy');
    expect(opener.responses[0].next).toBe('mira_intro');
    expect(out.tree['mira_intro']).toBe(tree.mira_intro);
  });

  it('leaves the tree alone when there is nothing to remember', () => {
    expect(withMemoryOpener(tree, 'mira_intro', null)).toEqual({ tree, startKey: 'mira_intro' });
  });
});

describe('neighbourMemory', () => {
  it('has nothing to say on an ordinary day', () => {
    expect(neighbourMemory('mira', state())).toBeNull();
  });

  it('remembers a recent solidarity choice warmly, in every neighbour\'s own words', () => {
    const lines = NEIGHBOUR_IDS.map(id => neighbourMemory(id, state({ log: [entry(9, 'solidarity')] })));
    for (const l of lines) expect(l?.mood).toBe('happy');
    expect(new Set(lines.map(l => l!.text)).size).toBe(NEIGHBOUR_IDS.length);
  });

  it('remembers a recent scapegoat choice coldly', () => {
    const l = neighbourMemory('leo', state({ log: [entry(10, 'scapegoat')] }));
    expect(l?.mood).toBe('tired');
    expect(l?.text.length).toBeGreaterThan(20);
  });

  it('only the latest crisis counts, and it fades after a couple of days', () => {
    const both = state({ log: [entry(8, 'scapegoat'), entry(9, 'solidarity')] });
    expect(neighbourMemory('sal', both)?.mood).toBe('happy');
    expect(neighbourMemory('sal', state({ day: 14, log: [entry(9, 'solidarity')] }))).toBeNull();
  });

  it('a pattern of blaming neighbours is remembered longer and more sharply than one slip', () => {
    const pattern = state({ day: 14, log: [entry(5, 'scapegoat'), entry(8, 'scapegoat'), entry(11, 'scapegoat')] });
    const one = neighbourMemory('marcus', state({ log: [entry(10, 'scapegoat')] }))!;
    const many = neighbourMemory('marcus', pattern)!;
    expect(many).not.toBeNull();
    expect(many.text).not.toBe(one.text);
  });

  it('ignores Town Hall votes, which share the log', () => {
    expect(neighbourMemory('mira', state({ log: [entry(10, 'scapegoat', 'assembly-10')] }))).toBeNull();
  });

  it('notices when the player is hungry or close to breaking', () => {
    expect(neighbourMemory('higgins', state({ starvingDays: 2 }))?.text).toMatch(/eat|hungry|food|soup|bread/i);
    expect(neighbourMemory('elena', state({ stress: 90 }))?.text).toMatch(/breath|rest|tired|worn|sleep/i);
  });

  it('greets a deeply trusted neighbour like family', () => {
    expect(neighbourMemory('mira', state({ trust: 80 }))?.mood).toBe('happy');
  });

  it('is silent for unknown NPCs', () => {
    expect(neighbourMemory('stranger', state({ log: [entry(10, 'solidarity')] }))).toBeNull();
  });
});
