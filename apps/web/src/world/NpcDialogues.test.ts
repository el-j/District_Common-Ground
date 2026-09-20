import { describe, it, expect } from 'vitest';
import { DIALOGUES, pickDialogueKey } from './NpcDialogues';
import { RECIPES } from '../core/simulation/Recipes';

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

  // M26 — three new NPCs (sal, marcus, higgins) follow the same 5-tree rotation.
  it('resolves the M26 roster (sal, marcus, higgins) through the same 5-day cycle', () => {
    expect(pickDialogueKey('sal', 1)).toBe('sal_intro');
    expect(pickDialogueKey('sal', 5)).toBe('sal_day5');
    expect(pickDialogueKey('sal', 6)).toBe('sal_intro');
    expect(pickDialogueKey('marcus', 1)).toBe('marcus_intro');
    expect(pickDialogueKey('marcus', 5)).toBe('marcus_day5');
    expect(pickDialogueKey('marcus', 6)).toBe('marcus_intro');
    expect(pickDialogueKey('higgins', 1)).toBe('higgins_intro');
    expect(pickDialogueKey('higgins', 5)).toBe('higgins_day5');
    expect(pickDialogueKey('higgins', 6)).toBe('higgins_intro');
  });
});

describe('DIALOGUES', () => {
  it('every npc has exactly 5 dialogue trees', () => {
    for (const npc of ['mira', 'leo', 'elena', 'sal', 'marcus', 'higgins']) {
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

  // M39 §2 — EPIC-33. Every node that teaches a recipe references a real
  // recipe id and carries a real trust threshold (never an unguarded 0,
  // which would defeat the point of gating on trust at all).
  it('every teachesRecipe node references a real recipe and a positive minTrust', () => {
    let teachingNodesFound = 0;
    for (const tree of Object.values(DIALOGUES)) {
      for (const node of Object.values(tree)) {
        if (!node.teachesRecipe) continue;
        teachingNodesFound += 1;
        expect(RECIPES[node.teachesRecipe]).toBeDefined();
        expect(node.minTrust ?? 0).toBeGreaterThan(0);
      }
    }
    expect(teachingNodesFound).toBe(5); // Elena/Higgins/Marcus (M39) + Priya/Ezra (M42)
  });

  // M40 §3 — RECIPE_CIRCUIT_BOARD is deliberately found-cookbook-only (see
  // Recipes.ts's comment), never taught by any NPC. Real assertion against
  // the actual dialogue data, not a proxy check.
  it('never teaches RECIPE_CIRCUIT_BOARD from any NPC', () => {
    for (const tree of Object.values(DIALOGUES)) {
      for (const node of Object.values(tree)) {
        expect(node.teachesRecipe).not.toBe('RECIPE_CIRCUIT_BOARD');
      }
    }
  });

  // M49 — EPIC-36 §2. Every family member's dialogueKey resolves to a real
  // tree, keyed exactly the way NpcDialogues.ts's own convention requires
  // (the outer DIALOGUES key matches the first inner node's key).
  it('every FamilyTemplates.ts member dialogueKey resolves to a real DIALOGUES tree', async () => {
    const { FAMILY_TEMPLATES } = await import('../core/simulation/FamilyTemplates');
    FAMILY_TEMPLATES.forEach(t => {
      t.members.forEach(m => {
        const tree = DIALOGUES[m.dialogueKey];
        expect(tree).toBeDefined();
        expect(tree?.[m.dialogueKey]).toBeDefined();
      });
    });
  });
});
