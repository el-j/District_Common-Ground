import { describe, it, expect } from 'vitest';
import {
  MILESTONE_DEFINITIONS,
  evaluateMilestones,
  getMilestoneDefinition,
} from './Milestones';
import { INITIAL_STATE, type GameState } from '../state/useGameStore';

describe('Milestones domain', () => {
  it('defines unique milestones across all categories', () => {
    expect(MILESTONE_DEFINITIONS.length).toBeGreaterThanOrEqual(14);
    const ids = new Set(MILESTONE_DEFINITIONS.map(m => m.id));
    expect(ids.size).toBe(MILESTONE_DEFINITIONS.length);

    MILESTONE_DEFINITIONS.forEach(m => {
      expect(m.title.length).toBeGreaterThan(0);
      expect(m.description.length).toBeGreaterThan(0);
      expect(m.icon.length).toBeGreaterThan(0);
      expect(['commons', 'survival', 'solidarity', 'crafting', 'community']).toContain(m.category);
    });
  });

  it('resolves milestone definitions by ID', () => {
    const firstDawn = getMilestoneDefinition('first-dawn');
    expect(firstDawn).toBeDefined();
    expect(firstDawn?.title).toBe('First Morning');
    expect(getMilestoneDefinition('non-existent-id')).toBeUndefined();
  });

  it('evaluates newly unlocked milestones against game state', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 2 },
    };

    // First dawn should unlock
    const unlocked = evaluateMilestones(state, []);
    expect(unlocked.map(m => m.id)).toContain('first-dawn');

    // Should not re-unlock if already in unlockedIds
    const rechecked = evaluateMilestones(state, ['first-dawn']);
    expect(rechecked.map(m => m.id)).not.toContain('first-dawn');
  });

  it('detects survival milestones (day 10, day 30, full pantries)', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 10 },
      economy: { ...INITIAL_STATE.economy, starvingDays: 0 },
    };

    const unlocked = evaluateMilestones(state, []).map(m => m.id);
    expect(unlocked).toContain('first-dawn');
    expect(unlocked).toContain('ten-days-resolute');
    expect(unlocked).toContain('full-pantries');
    expect(unlocked).not.toContain('month-of-resistance');
  });

  it('detects commons build milestones', () => {
    const oneNodeState: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 5 },
      commons: {
        ...INITIAL_STATE.commons,
        kitchenProgress: 100,
      },
    };

    const unlockedOne = evaluateMilestones(oneNodeState, []).map(m => m.id);
    expect(unlockedOne).toContain('first-brick');
    expect(unlockedOne).not.toContain('four-pillars');
    expect(unlockedOne).not.toContain('safe-haven');

    const allNodesState: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 20 },
      commons: {
        ...INITIAL_STATE.commons,
        kitchenProgress: 100,
        solarGridProgress: 100,
        legalFundProgress: 100,
        toolLibraryProgress: 100,
        landTrustProgress: 100,
      },
    };

    const unlockedAll = evaluateMilestones(allNodesState, []).map(m => m.id);
    expect(unlockedAll).toContain('first-brick');
    expect(unlockedAll).toContain('four-pillars');
    expect(unlockedAll).toContain('safe-haven');
  });

  it('detects solidarity and high-trust milestones', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 6 },
      player: { ...INITIAL_STATE.player, socialTrust: 85 },
      crisisState: {
        ...INITIAL_STATE.crisisState,
        historyLog: [
          { id: 'c1', day: 1, choice: 'solidarity', summary: 'stood together' },
          { id: 'c2', day: 2, choice: 'solidarity', summary: 'stood together' },
          { id: 'c3', day: 3, choice: 'solidarity', summary: 'stood together' },
          { id: 'c4', day: 4, choice: 'solidarity', summary: 'stood together' },
          { id: 'c5', day: 5, choice: 'solidarity', summary: 'stood together' },
        ],
      },
    };

    const unlocked = evaluateMilestones(state, []).map(m => m.id);
    expect(unlocked).toContain('high-trust');
    expect(unlocked).toContain('unbroken-solidarity');
  });

  it('detects crafting, quest, and neighbour event milestones', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing', day: 4 },
      crafting: {
        ...INITIAL_STATE.crafting,
        craftedItems: { ITEM_BASIC_TOOLS: 2, ITEM_UPCYCLED_WORKBENCH: 1 },
      },
      worldQuests: {
        activeId: null,
        completedIds: ['scout-the-transit-hub', 'deliver-higgins-letter', 'fund-the-kitchen'],
      },
      neighbourEvents: {
        lastDay: 3,
        seen: { 'sal-bread': 1, 'tea-higgins': 2, 'potluck': 3 },
        pendingId: null,
      },
    };

    const unlocked = evaluateMilestones(state, []).map(m => m.id);
    expect(unlocked).toContain('master-crafter');
    expect(unlocked).toContain('district-scout');
    expect(unlocked).toContain('knock-at-the-door');
  });
});
