import { describe, it, expect } from 'vitest';
import { FAMILY_TEMPLATES, getFamilyTemplate } from './FamilyTemplates';
import { ARCHETYPE_SEEDS } from '../state/actions';

// M47 — EPIC-36 §1. See docs/tasks/M47-birth-and-family-generation.md.
describe('FAMILY_TEMPLATES', () => {
  it('is deterministic — re-importing the module yields the same data', async () => {
    const again = await import('./FamilyTemplates');
    expect(again.FAMILY_TEMPLATES).toEqual(FAMILY_TEMPLATES);
  });

  it('carries forward all 3 existing archetypes (pip/morgan/arthur), one template each', () => {
    expect(FAMILY_TEMPLATES.length).toBe(3);
    const roles = FAMILY_TEMPLATES.map(t => t.classRole).sort();
    expect(roles).toEqual(['arthur', 'morgan', 'pip']);
  });

  it('every template\'s startingStats matches actions.ts\'s ARCHETYPE_SEEDS for its classRole exactly — no retroactive rebalance', () => {
    FAMILY_TEMPLATES.forEach(t => {
      const seed = ARCHETYPE_SEEDS[t.classRole];
      expect(t.startingStats).toEqual({
        cash: seed.cash, energy: seed.energy, trust: seed.socialTrust, stress: seed.stressLevel,
      });
    });
  });

  it('every template has a unique id and familyName', () => {
    const ids = new Set(FAMILY_TEMPLATES.map(t => t.id));
    const names = new Set(FAMILY_TEMPLATES.map(t => t.familyName));
    expect(ids.size).toBe(FAMILY_TEMPLATES.length);
    expect(names.size).toBe(FAMILY_TEMPLATES.length);
  });

  it('every template has at least 2 named family members', () => {
    FAMILY_TEMPLATES.forEach(t => {
      expect(t.members.length).toBeGreaterThanOrEqual(2);
      t.members.forEach(m => {
        expect(m.name.length).toBeGreaterThan(0);
        expect(m.relation.length).toBeGreaterThan(0);
      });
    });
  });

  it('every template declares a real homeRegion string', () => {
    FAMILY_TEMPLATES.forEach(t => expect(t.homeRegion).toBe('REGION_COMMON_GROUND'));
  });

  // M49 — EPIC-36 §2.
  it('every template declares a homeInteriorId, and every member has a dialogueKey', () => {
    FAMILY_TEMPLATES.forEach(t => {
      expect(t.homeInteriorId.length).toBeGreaterThan(0);
      t.members.forEach(m => expect(m.dialogueKey.length).toBeGreaterThan(0));
    });
  });

  it('every member dialogueKey is unique across the whole library (no accidental tree collisions)', () => {
    const keys = FAMILY_TEMPLATES.flatMap(t => t.members.map(m => m.dialogueKey));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('getFamilyTemplate', () => {
  it('resolves a known id', () => {
    expect(getFamilyTemplate('courier-family')?.classRole).toBe('pip');
  });

  it('returns undefined for an unknown id', () => {
    // @ts-expect-error deliberately invalid id for the negative-path test
    expect(getFamilyTemplate('not-a-real-template')).toBeUndefined();
  });
});
