import { describe, it, expect } from 'vitest';
import { DIALOGUES, pickDialogueKey } from './NpcDialogues';

// M23 Test 23.3a — dialogue rotation widened from 3 to 5 trees per NPC.
describe('pickDialogueKey', () => {
  it('cycles through the first 3 days as before', () => {
    expect(pickDialogueKey('mira', 1)).toBe('mira_intro');
    expect(pickDialogueKey('mira', 2)).toBe('mira_day2');
    expect(pickDialogueKey('mira', 3)).toBe('mira_day3');
  });

  it('day 4 and day 5 resolve to new trees, not a repeat of days 1-3', () => {
    expect(pickDialogueKey('mira', 4)).toBe('mira_day4');
    expect(pickDialogueKey('mira', 5)).toBe('mira_day5');
    expect(pickDialogueKey('leo', 4)).toBe('leo_day4');
    expect(pickDialogueKey('leo', 5)).toBe('leo_day5');
    expect(pickDialogueKey('elena', 4)).toBe('elena_day4');
    expect(pickDialogueKey('elena', 5)).toBe('elena_day5');
  });

  it('wraps back to day 1\'s tree on day 6 (cycle length 5)', () => {
    expect(pickDialogueKey('mira', 6)).toBe('mira_intro');
    expect(pickDialogueKey('leo', 6)).toBe('leo_intro');
    expect(pickDialogueKey('elena', 6)).toBe('elena_intro');
  });

  it('falls back to mira_intro for an unknown npc', () => {
    expect(pickDialogueKey('nobody', 4)).toBe('mira_intro');
  });
});

describe('DIALOGUES', () => {
  it('every npc has exactly 5 dialogue trees', () => {
    for (const npc of ['mira', 'leo', 'elena']) {
      const keys = [1, 2, 3, 4, 5].map(day => pickDialogueKey(npc, day));
      expect(new Set(keys).size).toBe(5);
      keys.forEach(key => expect(DIALOGUES[key]).toBeDefined());
    }
  });

  it('every dialogue tree resolves every response.next to a real node or null', () => {
    for (const tree of Object.values(DIALOGUES)) {
      for (const node of Object.values(tree)) {
        for (const response of node.responses) {
          if (response.next !== null) {
            expect(tree[response.next]).toBeDefined();
          }
        }
      }
    }
  });
});
