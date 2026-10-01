import { describe, it, expect, beforeEach } from 'vitest';
import {
  NEIGHBOUR_EVENTS, eligibleEvents, pickNeighbourEvent, rollNeighbourEvent, resolveNeighbourEvent,
  pendingNeighbourEvent, optionAffordable, EVENT_COOLDOWN_DAYS,
} from './NeighbourEvents';
import { useGameStore, INITIAL_STATE, type GameState } from '../state/useGameStore';

function state(patch: {
  day?: number; cash?: number; energy?: number; trust?: number; stress?: number; starvingDays?: number;
  kitchen?: number; focus?: GameState['economy']['focusNode']; streak?: number; resilience?: number;
  seen?: Record<string, number>; lastDay?: number; activeCrisis?: string | null;
} = {}): GameState {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.meta.day = patch.day ?? 10;
  s.player = {
    ...s.player, classRole: 'pip', cash: patch.cash ?? 40, energy: patch.energy ?? 60,
    socialTrust: patch.trust ?? 30, stressLevel: patch.stress ?? 40,
  };
  s.economy.starvingDays = patch.starvingDays ?? 0;
  s.economy.focusNode = patch.focus ?? null;
  s.commons.kitchenProgress = patch.kitchen ?? 0;
  s.commons.resilienceScore = patch.resilience ?? 20;
  s.crisisState.scapegoatStreak = patch.streak ?? 0;
  s.crisisState.activeCrisisId = patch.activeCrisis ?? null;
  s.neighbourEvents = { lastDay: patch.lastDay ?? 0, seen: patch.seen ?? {}, pendingId: null };
  return s;
}
const ids = (s: GameState) => eligibleEvents(s).map(e => e.id);

describe('neighbour event content', () => {
  it('has unique ids, two options each, and something always eligible', () => {
    expect(new Set(NEIGHBOUR_EVENTS.map(e => e.id)).size).toBe(NEIGHBOUR_EVENTS.length);
    for (const e of NEIGHBOUR_EVENTS) expect(e.options).toHaveLength(2);
    expect(NEIGHBOUR_EVENTS.length).toBeGreaterThanOrEqual(10);
    expect(eligibleEvents(state()).length).toBeGreaterThan(0);
  });

  it('never lets an option take more than a small amount (these are moments, not crises)', () => {
    for (const e of NEIGHBOUR_EVENTS) for (const o of e.options) {
      for (const v of Object.values(o.effects)) expect(Math.abs(v)).toBeLessThanOrEqual(25);
    }
  });
});

describe('which events can happen', () => {
  it('a starving player is offered food, a stressed one a break', () => {
    expect(ids(state({ starvingDays: 1 }))).toContain('sal-bread');
    expect(ids(state({ stress: 80 }))).toContain('higgins-tea');
    expect(ids(state())).not.toContain('sal-bread');
    expect(ids(state())).not.toContain('higgins-tea');
  });

  it('money, trust, the kitchen and a scapegoat streak each open their own moments', () => {
    expect(ids(state({ cash: 200, trust: 30 }))).toContain('leo-rent');
    expect(ids(state({ trust: 70 }))).toContain('thank-you-card');
    expect(ids(state({ kitchen: 100 }))).toContain('kitchen-potluck');
    expect(ids(state({ streak: 2 }))).toContain('cold-shoulder');
    expect(ids(state({ focus: 'solarGridProgress', trust: 40 }))).toContain('work-day');
  });

  it('an event rests for a week after it was shown', () => {
    const seen = { 'street-musician': 5 };
    expect(ids(state({ day: 10, seen }))).not.toContain('street-musician');
    expect(ids(state({ day: 5 + EVENT_COOLDOWN_DAYS, seen }))).toContain('street-musician');
  });
});

describe('pickNeighbourEvent', () => {
  it('picks nothing when a crisis is on, one already ran today, or the dice say no', () => {
    expect(pickNeighbourEvent(state({ activeCrisis: 'x' }), () => 0)).toBeNull();
    expect(pickNeighbourEvent(state({ lastDay: 10 }), () => 0)).toBeNull();
    expect(pickNeighbourEvent(state(), () => 0.99)).toBeNull();
  });

  it('puts urgent needs first', () => {
    expect(pickNeighbourEvent(state({ starvingDays: 2 }), () => 0.5)).toBe('sal-bread');
  });

  it('otherwise picks among eligible events', () => {
    const id = pickNeighbourEvent(state(), () => 0.1);
    expect(ids(state())).toContain(id);
  });
});

describe('rolling and resolving', () => {
  beforeEach(() => {
    useGameStore.setState(state({ cash: 200, trust: 30 }), true);
  });

  it('a roll saves the pending event and marks the day', () => {
    const id = rollNeighbourEvent(() => 0.1);
    const s = useGameStore.getState();
    expect(id).not.toBeNull();
    expect(s.neighbourEvents.pendingId).toBe(id);
    expect(s.neighbourEvents.lastDay).toBe(10);
    expect(s.neighbourEvents.seen[id!]).toBe(10);
    expect(pendingNeighbourEvent()?.id).toBe(id);
    // No second roll the same day.
    expect(rollNeighbourEvent(() => 0.1)).toBeNull();
  });

  it('resolving applies exactly the option\'s effects and clears the event', () => {
    useGameStore.setState(s => ({ neighbourEvents: { ...s.neighbourEvents, pendingId: 'leo-rent' } }));
    const lend = NEIGHBOUR_EVENTS.find(e => e.id === 'leo-rent')!.options[0];
    const before = useGameStore.getState().player;
    const outcome = resolveNeighbourEvent(0);
    const after = useGameStore.getState().player;
    expect(outcome).toBe(lend.outcome);
    expect(after.cash - before.cash).toBe(lend.effects.cash ?? 0);
    expect(after.socialTrust - before.socialTrust).toBe(lend.effects.trust ?? 0);
    expect(useGameStore.getState().neighbourEvents.pendingId).toBeNull();
  });

  it('an option the player cannot pay for is refused and changes nothing', () => {
    useGameStore.setState(s => ({
      player: { ...s.player, cash: 5 },
      neighbourEvents: { ...s.neighbourEvents, pendingId: 'leo-rent' },
    }));
    expect(optionAffordable(NEIGHBOUR_EVENTS.find(e => e.id === 'leo-rent')!.options[0], useGameStore.getState().player)).toBe(false);
    expect(resolveNeighbourEvent(0)).toBeNull();
    expect(useGameStore.getState().player.cash).toBe(5);
    expect(useGameStore.getState().neighbourEvents.pendingId).toBe('leo-rent');
  });

  it('a work day adds real progress to the build the neighbours are focused on', () => {
    useGameStore.setState(s => ({
      economy: { ...s.economy, focusNode: 'solarGridProgress' },
      neighbourEvents: { ...s.neighbourEvents, pendingId: 'work-day' },
    }));
    const join = NEIGHBOUR_EVENTS.find(e => e.id === 'work-day')!.options[0];
    resolveNeighbourEvent(0);
    expect(useGameStore.getState().commons.solarGridProgress).toBe(join.effects.build);
  });

  it('there is nothing to resolve without a pending event', () => {
    expect(resolveNeighbourEvent(0)).toBeNull();
  });
});
