import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE } from './useGameStore';
import {
  assignWorldQuest, checkZoneWorldQuestProgress, checkTalkWorldQuestProgress, updateCommonsProgress,
} from './actions';
import { WORLD_QUEST_DEFINITIONS, ZONE_BUILD_NODE, type WorldZoneId } from '../simulation/WorldQuests';

// M35 — EPIC-31 §2/§3/§4. WorldQuest completion is real, state-verified
// checks (position-derived zone, a completed dialogue interaction, or live
// commons progress) — the core mechanical difference from IrlQuestSystem's
// self-attested "Done" button. These tests exercise exactly the 3 real
// event sites the actual game calls (WorldScene.updateZone()'s zone string,
// WorldScene.openTalk()'s onClose, actions.ts's own updateCommonsProgress())
// rather than a UI button claiming completion happened.

function resetStore() {
  useGameStore.setState(INITIAL_STATE, true);
}

describe('WorldQuest assignment (M35 §4)', () => {
  beforeEach(resetStore);

  it('assigns the given quest as active', () => {
    assignWorldQuest('scout-the-transit-hub');
    expect(useGameStore.getState().worldQuests.activeId).toBe('scout-the-transit-hub');
  });

  it('is idempotent — reassigning the same already-active quest is a harmless no-op', () => {
    assignWorldQuest('scout-the-transit-hub');
    assignWorldQuest('scout-the-transit-hub');
    expect(useGameStore.getState().worldQuests.activeId).toBe('scout-the-transit-hub');
  });

  it('refuses to replace an already-active quest with a different one', () => {
    assignWorldQuest('scout-the-transit-hub');
    assignWorldQuest('fund-the-kitchen');
    expect(useGameStore.getState().worldQuests.activeId).toBe('scout-the-transit-hub');
  });

  it('refuses to reassign an already-completed quest', () => {
    useGameStore.setState({ worldQuests: { activeId: null, completedIds: ['scout-the-transit-hub'] } });
    assignWorldQuest('scout-the-transit-hub');
    expect(useGameStore.getState().worldQuests.activeId).toBeNull();
  });
});

describe('checkZoneWorldQuestProgress — reach-zone verification (M35 §2)', () => {
  beforeEach(resetStore);

  it('completes the active reach-zone quest only when the real reported zone matches its target', () => {
    assignWorldQuest('scout-the-transit-hub');

    checkZoneWorldQuestProgress('Central Plaza');
    expect(useGameStore.getState().worldQuests.activeId).toBe('scout-the-transit-hub');

    checkZoneWorldQuestProgress('North — Transit Hub');
    const state = useGameStore.getState();
    expect(state.worldQuests.activeId).toBeNull();
    expect(state.worldQuests.completedIds).toContain('scout-the-transit-hub');
  });

  it('applies the quest reward on completion', () => {
    const before = useGameStore.getState().player;
    assignWorldQuest('scout-the-transit-hub');
    checkZoneWorldQuestProgress('North — Transit Hub');
    const after = useGameStore.getState().player;
    expect(after.cash).toBe(before.cash + 15);
    expect(after.energy).toBe(before.energy + 10);
  });

  it('does nothing when no WorldQuest is active', () => {
    checkZoneWorldQuestProgress('North — Transit Hub');
    expect(useGameStore.getState().worldQuests.completedIds).toEqual([]);
  });

  it('does nothing when the active quest is a different target kind', () => {
    assignWorldQuest('deliver-higgins-letter'); // talk-to-npc, not reach-zone
    checkZoneWorldQuestProgress('North — Transit Hub');
    expect(useGameStore.getState().worldQuests.activeId).toBe('deliver-higgins-letter');
  });
});

describe('checkTalkWorldQuestProgress — talk-to-npc verification (M35 §2)', () => {
  beforeEach(resetStore);

  it('completes the active talk-to-npc quest only for the exact target npc', () => {
    assignWorldQuest('deliver-higgins-letter');

    checkTalkWorldQuestProgress('mira');
    expect(useGameStore.getState().worldQuests.activeId).toBe('deliver-higgins-letter');

    checkTalkWorldQuestProgress('leo');
    const state = useGameStore.getState();
    expect(state.worldQuests.activeId).toBeNull();
    expect(state.worldQuests.completedIds).toContain('deliver-higgins-letter');
  });

  it('applies the quest reward on completion', () => {
    const before = useGameStore.getState().player;
    assignWorldQuest('deliver-higgins-letter');
    checkTalkWorldQuestProgress('leo');
    const after = useGameStore.getState().player;
    expect(after.socialTrust).toBe(before.socialTrust + 15);
    expect(after.stressLevel).toBe(Math.max(0, before.stressLevel - 5));
  });
});

describe('build-node-threshold verification, wired through the real updateCommonsProgress() (M35 §2)', () => {
  beforeEach(resetStore);

  it('does not complete the quest before its threshold is reached', () => {
    assignWorldQuest('fund-the-kitchen'); // kitchenProgress >= 50
    updateCommonsProgress('kitchenProgress', 20);
    expect(useGameStore.getState().worldQuests.activeId).toBe('fund-the-kitchen');
  });

  it('completes the quest, and applies its cash/trust reward plus the direct commons bonus, once the real threshold is crossed', () => {
    assignWorldQuest('fund-the-kitchen');
    const cashBefore = useGameStore.getState().player.cash;
    const trustBefore = useGameStore.getState().player.socialTrust;

    // 45 alone doesn't cross the 50 threshold...
    updateCommonsProgress('kitchenProgress', 45);
    expect(useGameStore.getState().worldQuests.activeId).toBe('fund-the-kitchen');

    // ...but the next contribution does.
    updateCommonsProgress('kitchenProgress', 10);
    const state = useGameStore.getState();
    expect(state.worldQuests.activeId).toBeNull();
    expect(state.worldQuests.completedIds).toContain('fund-the-kitchen');
    expect(state.player.cash).toBe(cashBefore + 25);
    expect(state.player.socialTrust).toBe(trustBefore + 10);
    // 45 + 10 (player's own contribution) + 5 (the quest's own direct
    // commons bonus, applied through the same updateCommonsProgress()) = 60.
    expect(state.commons.kitchenProgress).toBe(60);
  });

  it('is a real state check, not a self-attested claim — completing an unrelated node never completes the active build-node quest', () => {
    assignWorldQuest('fund-the-kitchen');
    updateCommonsProgress('solarGridProgress', 100);
    expect(useGameStore.getState().worldQuests.activeId).toBe('fund-the-kitchen');
  });
});

describe('WorldQuest definitions and the zone↔build-node "level" mapping (M35 §1/§2)', () => {
  it('every definition target references a real commons field or a real WorldZoneId', () => {
    const commonsKeys = Object.keys(INITIAL_STATE.commons);
    WORLD_QUEST_DEFINITIONS.forEach(def => {
      if (def.target.kind === 'build-node-threshold') {
        expect(commonsKeys).toContain(def.target.node);
      }
      if (def.target.kind === 'reach-zone') {
        expect(Object.keys(ZONE_BUILD_NODE)).toContain(def.target.zone);
      }
      if (def.reward.commonsBonusNode) {
        expect(commonsKeys).toContain(def.reward.commonsBonusNode);
      }
    });
  });

  it('maps every one of WorldScene.updateZone()\'s 5 real zone strings to a real commons field', () => {
    const zones: WorldZoneId[] = [
      'North — Transit Hub', 'Central Plaza', 'South Quarter', 'East Canal', 'South Solar Quarter',
    ];
    const commonsKeys = Object.keys(INITIAL_STATE.commons);
    zones.forEach(zone => {
      expect(commonsKeys).toContain(ZONE_BUILD_NODE[zone]);
    });
  });
});
