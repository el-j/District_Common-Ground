import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NPCEntity, type NPCDefinition } from './NPCEntity';

// M34 §1 — EPIC-31. NPCEntity gained real wander state this milestone
// (previously: positioned once, update() only ever measured distance to the
// player). These tests pin down the 3 things the task doc's own Section 1
// explicitly calls for: wander stays within the NPC's home zone, talk-prompt
// (isActive) keeps working from the live (moved) position, and a rejected
// (non-walkable) step never actually moves the NPC.

function makeDefinition(overrides: Partial<NPCDefinition> = {}): NPCDefinition {
  return {
    id: 'test-npc',
    name: 'Test NPC',
    token: 'NPC_NEIGHBOR',
    position: { x: 100, y: 100 },
    proximity: 38,
    dialogueKey: 'test_intro',
    ...overrides,
  };
}

describe('NPCEntity wander (M34 §1)', () => {
  // Deterministic direction/pause — pickWanderDirection() reads Math.random()
  // twice (angle, pause-chance); pin it away from the 40% pause branch and to
  // a fixed rightward angle so tick() always actually attempts to move.
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays within its home wanderRadius over many ticks when every tile is walkable', () => {
    const npc = new NPCEntity(makeDefinition({ wanderRadius: 48 }), () => undefined);
    const alwaysWalkable = () => true;

    for (let i = 0; i < 500; i++) {
      npc.tick(100, alwaysWalkable);
      const dist = Math.hypot(npc.x - 100, npc.y - 100);
      expect(dist).toBeLessThanOrEqual(48 + 0.001);
    }
  });

  it('never moves when every candidate tile is reported non-walkable', () => {
    const npc = new NPCEntity(makeDefinition(), () => undefined);
    const neverWalkable = () => false;

    for (let i = 0; i < 20; i++) npc.tick(100, neverWalkable);

    expect(npc.x).toBe(100);
    expect(npc.y).toBe(100);
  });

  it('talk-prompt (isActive) still triggers correctly once the NPC has wandered away from its home position', () => {
    const onChange = vi.fn();
    const npc = new NPCEntity(makeDefinition({ proximity: 38 }), onChange);
    const alwaysWalkable = () => true;

    // Walk it well outside its original home coordinates.
    for (let i = 0; i < 50; i++) npc.tick(200, alwaysWalkable);
    expect(Math.hypot(npc.x - 100, npc.y - 100)).toBeGreaterThan(0);

    // Player standing exactly on the NPC's new live position should trigger
    // talkability — proves proximity is measured from x/y, not the static
    // home `position`.
    npc.update(npc.x, npc.y);
    expect(npc.isActive).toBe(true);
    expect(onChange).toHaveBeenCalledWith('test-npc', true);

    // Player far from both the live position and the home position should not.
    onChange.mockClear();
    npc.update(npc.x + 500, npc.y + 500);
    expect(npc.isActive).toBe(false);
  });

  it('exposes the live x/y separately from the static home `position`', () => {
    const npc = new NPCEntity(makeDefinition(), () => undefined);
    expect(npc.position).toEqual({ x: 100, y: 100 });

    for (let i = 0; i < 30; i++) npc.tick(100, () => true);

    // position (home anchor) is unchanged; x/y (live) has moved.
    expect(npc.position).toEqual({ x: 100, y: 100 });
    expect(npc.x === 100 && npc.y === 100).toBe(false);
  });
});
