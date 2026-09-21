import { describe, it, expect } from 'vitest';
import { WORLD_QUEST_DEFINITIONS, ZONE_BUILD_NODE, getWorldQuestDefinition } from './WorldQuests';

// Closes the mutation-testing gap the 2026-09-20/21 Stryker audit found:
// WorldQuests.ts had no dedicated unit test file at all — its only coverage
// came indirectly through actions.test.ts's completeActiveWorldQuest()
// exercises, which never assert on this module's own pure data/helpers.
describe('WORLD_QUEST_DEFINITIONS', () => {
  it('has exactly 3 quests, one per target kind, each with a unique id', () => {
    expect(WORLD_QUEST_DEFINITIONS.length).toBe(3);
    const kinds = new Set(WORLD_QUEST_DEFINITIONS.map(q => q.target.kind));
    expect(kinds).toEqual(new Set(['reach-zone', 'talk-to-npc', 'build-node-threshold']));
    const ids = new Set(WORLD_QUEST_DEFINITIONS.map(q => q.id));
    expect(ids.size).toBe(3);
  });

  it('every quest declares a giver NPC and a non-empty reward', () => {
    WORLD_QUEST_DEFINITIONS.forEach(q => {
      expect(q.giverNpcId.length).toBeGreaterThan(0);
      const rewardKeys = Object.keys(q.reward);
      expect(rewardKeys.length).toBeGreaterThan(0);
    });
  });

  it('the reach-zone quest targets the Transit Hub zone specifically', () => {
    const quest = WORLD_QUEST_DEFINITIONS.find(q => q.target.kind === 'reach-zone')!;
    expect(quest.target).toEqual({ kind: 'reach-zone', zone: 'North — Transit Hub' });
  });

  it('the talk-to-npc quest targets leo specifically', () => {
    const quest = WORLD_QUEST_DEFINITIONS.find(q => q.target.kind === 'talk-to-npc')!;
    expect(quest.target).toEqual({ kind: 'talk-to-npc', npcId: 'leo' });
  });

  it('the build-node-threshold quest targets kitchenProgress at exactly 50', () => {
    const quest = WORLD_QUEST_DEFINITIONS.find(q => q.target.kind === 'build-node-threshold')!;
    expect(quest.target).toEqual({ kind: 'build-node-threshold', node: 'kitchenProgress', threshold: 50 });
  });

  it('fund-the-kitchen carries a real commons bonus alongside its cash/trust reward', () => {
    const quest = getWorldQuestDefinition('fund-the-kitchen')!;
    expect(quest.reward).toEqual({ cashDelta: 25, trustDelta: 10, commonsBonusNode: 'kitchenProgress', commonsBonusAmount: 5 });
  });
});

describe('getWorldQuestDefinition', () => {
  it('resolves a known id to its full definition', () => {
    expect(getWorldQuestDefinition('scout-the-transit-hub')).toBe(WORLD_QUEST_DEFINITIONS[0]);
  });

  it('returns undefined for an unknown id', () => {
    // @ts-expect-error deliberately invalid id for the negative-path test
    expect(getWorldQuestDefinition('not-a-real-quest')).toBeUndefined();
  });
});

describe('ZONE_BUILD_NODE', () => {
  it('maps every one of the 5 real world zones to a commons progress field', () => {
    const zones: (keyof typeof ZONE_BUILD_NODE)[] = [
      'North — Transit Hub', 'Central Plaza', 'South Quarter', 'East Canal', 'South Solar Quarter',
    ];
    expect(Object.keys(ZONE_BUILD_NODE).sort()).toEqual([...zones].sort());
  });

  it('maps the exact node for each zone per the grounded construction-marker placement', () => {
    expect(ZONE_BUILD_NODE['North — Transit Hub']).toBe('solarGridProgress');
    expect(ZONE_BUILD_NODE['Central Plaza']).toBe('legalFundProgress');
    expect(ZONE_BUILD_NODE['South Quarter']).toBe('kitchenProgress');
    expect(ZONE_BUILD_NODE['East Canal']).toBe('resilienceScore');
    expect(ZONE_BUILD_NODE['South Solar Quarter']).toBe('solarGridProgress');
  });
});
