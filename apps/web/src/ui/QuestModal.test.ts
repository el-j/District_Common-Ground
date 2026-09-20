// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn() }));

import { QuestModal } from './QuestModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playUIClick } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('QuestModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore({ meta: { ...INITIAL_STATE.meta, day: 1 } });
  });

  it('renders the 3-quest window for the current day, all available', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new QuestModal(root);

    const rows = root.querySelectorAll('.quest-row');
    expect(rows).toHaveLength(3);
    expect(root.querySelectorAll('.quest-row--done')).toHaveLength(0);
    expect(root.querySelectorAll('[data-quest]:not([disabled])')).toHaveLength(3);
  });

  it('completing a quest applies its reward, marks it done, and re-renders', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    new QuestModal(root);

    // Day 1's window starts at 'digital-deescalation' (energy +25, capped at maxEnergy).
    const btn = root.querySelector<HTMLButtonElement>('[data-quest="digital-deescalation"]')!;
    btn.click();

    expect(playUIClick).toHaveBeenCalledTimes(1);
    expect(useGameStore.getState().player.energy).toBe(25);
    expect(useGameStore.getState().quests.find(q => q.questId === 'digital-deescalation')!.completedOnDay).toBe(1);

    const rerendered = root.querySelector<HTMLButtonElement>('[data-quest="digital-deescalation"]')!;
    expect(rerendered.disabled).toBe(true);
    expect(rerendered.textContent).toContain('Claimed');
  });

  it('ignores clicks on an already-disabled quest button', () => {
    resetStore({
      meta: { ...INITIAL_STATE.meta, day: 1 },
      quests: INITIAL_STATE.quests.map(q =>
        q.questId === 'digital-deescalation' ? { ...q, completedOnDay: 1 } : q,
      ),
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new QuestModal(root);

    root.querySelector<HTMLButtonElement>('[data-quest="digital-deescalation"]')!.click();

    expect(playUIClick).not.toHaveBeenCalled();
    expect(useGameStore.getState().player.energy).toBe(0);
  });
});
