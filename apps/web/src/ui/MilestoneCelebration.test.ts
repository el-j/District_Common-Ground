// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachMilestoneCelebrations, justUnlockedMilestones } from './MilestoneCelebration';
import { useGameStore, INITIAL_STATE, type GameState } from '../core/state/useGameStore';

describe('MilestoneCelebration', () => {
  let root: HTMLElement;
  let detach: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.replaceChildren(root);
    useGameStore.setState(structuredClone(INITIAL_STATE), true);
  });

  it('detects newly unlocked milestones between states', () => {
    const prev: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing' },
      milestones: { unlockedIds: [], unlockedAt: {} },
    };
    const next: GameState = {
      ...prev,
      milestones: { unlockedIds: ['first-dawn'], unlockedAt: { 'first-dawn': 1234 } },
    };

    const newly = justUnlockedMilestones(prev, next);
    expect(newly).toHaveLength(1);
    expect(newly[0]?.id).toBe('first-dawn');
    expect(newly[0]?.title).toBe('First Morning');
  });

  it('ignores already unlocked milestones or non-playing phase', () => {
    const prev: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'playing' },
      milestones: { unlockedIds: ['first-dawn'], unlockedAt: { 'first-dawn': 1234 } },
    };
    const next: GameState = {
      ...prev,
      milestones: { unlockedIds: ['first-dawn'], unlockedAt: { 'first-dawn': 1234 } },
    };
    expect(justUnlockedMilestones(prev, next)).toHaveLength(0);

    const selectState: GameState = {
      ...INITIAL_STATE,
      meta: { ...INITIAL_STATE.meta, phase: 'select' },
      milestones: { unlockedIds: ['first-dawn'], unlockedAt: {} },
    };
    expect(justUnlockedMilestones(selectState, selectState)).toHaveLength(0);
  });

  it('renders a toast notification when a milestone is unlocked', () => {
    useGameStore.setState(s => ({ meta: { ...s.meta, phase: 'playing' } }));
    detach = attachMilestoneCelebrations(root);

    useGameStore.setState(() => ({
      milestones: { unlockedIds: ['first-dawn'], unlockedAt: { 'first-dawn': Date.now() } },
    }));

    const toast = root.querySelector('.milestone-toast');
    expect(toast).not.toBeNull();
    expect(toast?.textContent).toContain('First Morning');
    expect(toast?.textContent).toContain('Survive your first night');

    // Click dismiss
    const dismissBtn = root.querySelector<HTMLButtonElement>('.milestone-toast-dismiss');
    dismissBtn?.click();
    vi.advanceTimersByTime(300);
    expect(root.querySelector('.milestone-toast')).toBeNull();

    detach();
  });
});
