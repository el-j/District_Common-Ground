// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CivicAction } from '@district-cg/shared-types';

const { getCivicTicker } = vi.hoisted(() => ({ getCivicTicker: vi.fn() }));
vi.mock('../api/endpoints/civic', () => ({ getCivicTicker }));

import { CivicTickerWidget } from './CivicTickerWidget';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

function makeAction(overrides: Partial<CivicAction> = {}): CivicAction {
  return {
    id: 'a1', title: 'Tool Drive', organizer: 'Riverside Tool Share',
    startTime: new Date(Date.now() + 86_400_000).toISOString(),
    locationSummary: 'Canal St', sourceUrl: 'https://example.org', regionCode: 'GENERIC',
    ...overrides,
  };
}

describe('CivicTickerWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    useGameStore.setState({ ...INITIAL_STATE });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays empty and hidden while there are no civic actions', async () => {
    getCivicTicker.mockResolvedValueOnce([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await flush();

    expect(widget.el.innerHTML).toBe('');
    widget.setVisible(true);
    expect(widget.el.hidden).toBe(true); // no items → stays hidden even when asked to show
    widget.destroy();
  });

  it('renders ticker content once actions load, doubled for the marquee loop', async () => {
    getCivicTicker.mockResolvedValueOnce([makeAction({ title: 'Tool Drive', organizer: 'Riverside Tool Share' })]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await flush();

    expect(widget.el.querySelectorAll('.civic-ticker-content')).toHaveLength(2);
    expect(widget.el.textContent).toContain('Tool Drive');
    expect(widget.el.textContent).toContain('Riverside Tool Share');
    expect(widget.el.textContent).toContain('tomorrow');
    widget.destroy();
  });

  it('setVisible(true) unhides the widget once it has items', async () => {
    getCivicTicker.mockResolvedValueOnce([makeAction()]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await flush();

    widget.setVisible(true);
    expect(widget.el.hidden).toBe(false);
    widget.setVisible(false);
    expect(widget.el.hidden).toBe(true);
    widget.destroy();
  });

  it('getHeadlines condenses up to 3 items into short strings', async () => {
    getCivicTicker.mockResolvedValueOnce([
      makeAction({ id: 'a1', title: 'Tool Drive' }),
      makeAction({ id: 'a2', title: 'Fridge Restock' }),
      makeAction({ id: 'a3', title: 'Garden Cleanup' }),
      makeAction({ id: 'a4', title: 'Fourth Event' }),
    ]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await flush();

    const headlines = widget.getHeadlines();
    expect(headlines).toHaveLength(3);
    expect(headlines[0]).toContain('Tool Drive');
    expect(headlines.join(' ')).not.toContain('Fourth Event');
    widget.destroy();
  });

  it('clears items when the fetch fails, instead of leaving stale content', async () => {
    getCivicTicker.mockRejectedValueOnce(new Error('network down'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await flush();

    expect(widget.el.innerHTML).toBe('');
    expect(widget.getHeadlines()).toEqual([]);
    widget.destroy();
  });

  it('destroy() stops the refresh interval and removes the element', async () => {
    vi.useFakeTimers();
    getCivicTicker.mockResolvedValue([]);
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new CivicTickerWidget(root);
    await vi.advanceTimersByTimeAsync(0);

    widget.destroy();
    getCivicTicker.mockClear();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(getCivicTicker).not.toHaveBeenCalled();
    expect(root.querySelector('.civic-ticker')).toBeNull();
  });
});
