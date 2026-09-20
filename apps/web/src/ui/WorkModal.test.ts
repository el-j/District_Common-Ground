// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn() }));
const { playStageCompleteChime } = vi.hoisted(() => ({ playStageCompleteChime: vi.fn() }));
vi.mock('../builder/TactileEffects', () => ({ TactileEffects: { playStageCompleteChime } }));

import { WorkModal } from './WorkModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playUIClick } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

describe('WorkModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('renders nothing work-related before an archetype is chosen', () => {
    resetStore({ player: { ...INITIAL_STATE.player, classRole: null } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorkModal(root);

    expect(root.querySelector('.quest-row')).toBeNull();
  });

  it("performs pip's delivery gig, trading energy for cash and marking the day worked", () => {
    resetStore({
      meta: { ...INITIAL_STATE.meta, day: 4 },
      player: { ...INITIAL_STATE.player, classRole: 'pip', energy: 80, cash: 10, lastWorkedDay: null },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorkModal(root);

    root.querySelector<HTMLButtonElement>('[data-work]')!.click();

    expect(playUIClick).toHaveBeenCalledTimes(1);
    expect(playStageCompleteChime).toHaveBeenCalledTimes(1);
    const { player } = useGameStore.getState();
    expect(player.energy).toBe(70); // 80 - 10
    expect(player.cash).toBe(25);   // 10 + 15
    expect(player.lastWorkedDay).toBe(4);
  });

  it('shows "already worked" and disables the button after working today', () => {
    resetStore({
      meta: { ...INITIAL_STATE.meta, day: 4 },
      player: { ...INITIAL_STATE.player, classRole: 'pip', energy: 80, lastWorkedDay: 4 },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorkModal(root);

    const btn = root.querySelector<HTMLButtonElement>('[data-work]')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Done for Today');

    btn.click();
    expect(playUIClick).not.toHaveBeenCalled();
  });

  it('shows "too tired" and disables the button when energy is below the cost', () => {
    resetStore({
      meta: { ...INITIAL_STATE.meta, day: 1 },
      player: { ...INITIAL_STATE.player, classRole: 'morgan', energy: 5, lastWorkedDay: null },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new WorkModal(root);

    const btn = root.querySelector<HTMLButtonElement>('[data-work]')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Too Tired');
  });
});
