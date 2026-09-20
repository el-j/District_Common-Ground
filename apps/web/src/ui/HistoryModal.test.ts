// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

import { HistoryModal } from './HistoryModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';

function resetStore(historyLog: typeof INITIAL_STATE.crisisState.historyLog = []) {
  useGameStore.setState({
    ...INITIAL_STATE,
    crisisState: { ...INITIAL_STATE.crisisState, historyLog },
  });
}

describe('HistoryModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows an empty-state message when no crises have been resolved', () => {
    resetStore([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HistoryModal(root, vi.fn());

    expect(root.querySelector('.history-empty')).not.toBeNull();
    expect(root.querySelectorAll('.history-row')).toHaveLength(0);
  });

  it('renders one row per log entry, most recent first, and locks input', () => {
    resetStore([
      { id: 'crisis-a', day: 1, choice: 'solidarity', summary: 'Neighbors pitched in.' },
      { id: 'crisis-b', day: 3, choice: 'scapegoat', summary: 'Blamed the newcomers.' },
    ]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new HistoryModal(root, vi.fn());

    const rows = root.querySelectorAll('.history-row');
    expect(rows).toHaveLength(2);
    // Most recent (day 3) rendered first.
    expect(rows[0]!.textContent).toContain('Day 3');
    expect(rows[0]!.textContent).toContain('Scapegoated');
    expect(rows[1]!.textContent).toContain('Day 1');
    expect(rows[1]!.textContent).toContain('Solidarity');
    expect(inputManager.setLocked).toHaveBeenCalledWith(true);
  });

  it('unlocks input and calls onClose after closing via the × button', async () => {
    vi.useFakeTimers();
    resetStore([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new HistoryModal(root, onClose);

    root.querySelector<HTMLButtonElement>('.history-close')!.click();
    vi.runAllTimers();

    expect(inputManager.setLocked).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.history-overlay')).toBeNull();
    vi.useRealTimers();
  });

  it('closes on Escape', () => {
    vi.useFakeTimers();
    resetStore([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    new HistoryModal(root, onClose);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    vi.runAllTimers();

    expect(onClose).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
