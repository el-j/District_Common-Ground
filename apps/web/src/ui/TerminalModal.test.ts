// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));

const { fetchDailyNarrative } = vi.hoisted(() => ({ fetchDailyNarrative: vi.fn() }));
vi.mock('../api/narrativeGossip', () => ({ fetchDailyNarrative }));

import { TerminalModal } from './TerminalModal';
import { inputManager } from '../world/InputManager';

function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('TerminalModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows a connecting placeholder immediately, then the fetched wire lines', async () => {
    fetchDailyNarrative.mockResolvedValueOnce({
      scenarios: [{ id: 's1', archetype: 'pip', title: 'Rent hike downtown', context: '...' }],
      source: 'live',
      generatedAt: '2026-09-20',
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TerminalModal(root, vi.fn());

    expect(root.querySelector('.terminal-body')!.textContent).toContain('connecting');
    expect(inputManager.setLocked).toHaveBeenCalledWith(true);

    await flushMicrotasks();

    const body = root.querySelector('.terminal-body')!.textContent!;
    expect(body).toContain('[pip] Rent hike downtown');
    expect(body).toContain('source: live');
  });

  it('shows a no-signal line when the feed returns no scenarios', async () => {
    fetchDailyNarrative.mockResolvedValueOnce({ scenarios: [], source: 'fallback', generatedAt: '2026-09-20' });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new TerminalModal(root, vi.fn());

    await flushMicrotasks();

    expect(root.querySelector('.terminal-body')!.textContent).toContain('no signal');
  });

  it('closes when clicking the backdrop, unlocking input and calling onClose', async () => {
    vi.useFakeTimers();
    fetchDailyNarrative.mockResolvedValueOnce({ scenarios: [], source: 'fallback', generatedAt: '2026-09-20' });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onClose = vi.fn();
    const modal = new TerminalModal(root, onClose);

    const overlay = root.querySelector<HTMLElement>('.settings-overlay')!;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    vi.runAllTimers();

    expect(inputManager.setLocked).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.settings-overlay')).toBeNull();
    void modal;
    vi.useRealTimers();
  });
});
