// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { setLocked } = vi.hoisted(() => ({ setLocked: vi.fn() }));
vi.mock('../world/InputManager', () => ({ inputManager: { setLocked } }));

import { attachNeighbourEvents } from './NeighbourEventCard';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function start(pendingId: string | null, cash = 200): void {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.meta.day = 10;
  s.player = { ...s.player, classRole: 'pip', cash, energy: 60, socialTrust: 30, stressLevel: 40 };
  s.neighbourEvents = { lastDay: 10, seen: {}, pendingId };
  useGameStore.setState(s, true);
}

describe('attachNeighbourEvents', () => {
  let root: HTMLElement;
  let detach: () => void;

  beforeEach(() => {
    setLocked.mockClear();
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => detach?.());

  it('shows an event that was already pending at load (a reload can\'t skip it)', () => {
    start('leo-rent');
    detach = attachNeighbourEvents(root);
    const card = root.querySelector('.neighbour-event')!;
    expect(card.querySelector('.event-title')!.textContent).toMatch(/rent/i);
    expect(card.querySelectorAll('.event-option')).toHaveLength(2);
    expect(card.textContent).toMatch(/−\$20/);
    expect(setLocked).toHaveBeenCalledWith(true);
  });

  it('appears when an event becomes pending', () => {
    start(null);
    detach = attachNeighbourEvents(root);
    expect(root.querySelector('.neighbour-event')).toBeNull();
    useGameStore.setState(s => ({ neighbourEvents: { ...s.neighbourEvents, pendingId: 'teo-bike' } }));
    expect(root.querySelector('.neighbour-event')).not.toBeNull();
  });

  it('choosing applies it, shows the outcome, then closes and unlocks input', () => {
    start('leo-rent');
    detach = attachNeighbourEvents(root);
    root.querySelectorAll<HTMLButtonElement>('.event-option')[0].click();
    expect(useGameStore.getState().player.cash).toBe(180);
    expect(root.querySelector('.event-outcome')!.textContent).toMatch(/forget/i);
    root.querySelector<HTMLButtonElement>('.event-continue')!.click();
    expect(root.querySelector('.neighbour-event')).toBeNull();
    expect(setLocked).toHaveBeenLastCalledWith(false);
  });

  it('disables an option the player can\'t pay for and says why', () => {
    start('leo-rent', 5);
    detach = attachNeighbourEvents(root);
    const lend = root.querySelectorAll<HTMLButtonElement>('.event-option')[0];
    expect(lend.disabled).toBe(true);
    expect(lend.textContent).toMatch(/not enough/i);
  });
});
