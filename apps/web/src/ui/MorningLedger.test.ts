// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { showMorningLedger } from './MorningLedger';
import type { SettledDayReport } from '../core/state/useGameStore';

function report(patch: Partial<SettledDayReport> = {}): SettledDayReport {
  return {
    day: 5, starving: false, unpaid: 0, breakdown: false, communityNode: null, communityPct: 0,
    lines: [
      { icon: '🚲', label: 'Gig shifts', cash: 5 },
      { icon: '🛒', label: 'Groceries', cash: -3 },
      { icon: '😴', label: "A night's rest", energy: 35 },
      { icon: '😰', label: 'Everyday pressure', stress: 5 },
      { icon: '🍲', label: 'Meals at the Community Kitchen', note: 'free food' },
    ],
    before: { cash: 20, energy: 30, stress: 40, trust: 40 },
    after: { cash: 22, energy: 65, stress: 45, trust: 40 },
    ...patch,
  };
}

describe('showMorningLedger', () => {
  let root: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });
  afterEach(() => vi.useRealTimers());

  it('titles the new day and lists every line with signed amounts', () => {
    const el = showMorningLedger(root, report(), []);
    expect(el.querySelector('.ledger-title')!.textContent).toMatch(/Day 5/);
    const rows = [...el.querySelectorAll('.ledger-line')].map(r => r.textContent!.replace(/\s+/g, ' '));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatch(/Gig shifts.*\+\$5/);
    expect(rows[1]).toMatch(/Groceries.*−\$3/);
    expect(rows[2]).toMatch(/\+35⚡/);
    expect(rows[3]).toMatch(/\+5% stress/);
    expect(rows[4]).toMatch(/free food/);
  });

  it('colours each amount by whether it is good for the player', () => {
    const el = showMorningLedger(root, report(), []);
    const chips = [...el.querySelectorAll('.ledger-chip')];
    const byText = (t: string) => chips.find(c => c.textContent === t)!;
    expect(byText('+$5').classList).toContain('ledger-chip--good');
    expect(byText('−$3').classList).toContain('ledger-chip--bad');
    expect(byText('+35⚡').classList).toContain('ledger-chip--good');
    expect(byText('+5% stress').classList).toContain('ledger-chip--bad');
  });

  it('shows real before → after totals, including trust only when it changed', () => {
    const el = showMorningLedger(root, report(), []);
    const totals = el.querySelector('.ledger-totals')!.textContent!.replace(/\s+/g, ' ');
    expect(totals).toMatch(/\$20 → \$22/);
    expect(totals).toMatch(/30 → 65/);
    expect(totals).toMatch(/40% → 45%/);
    expect(totals).not.toMatch(/🤝/);
    const hit = showMorningLedger(root, report({ after: { cash: 22, energy: 65, stress: 45, trust: 35 } }), []);
    expect(hit.querySelector('.ledger-totals')!.textContent).toMatch(/🤝 40 → 35/);
  });

  it('leads with the headline events (breakdown, hunger, neighbours) and marks a lost day', () => {
    const el = showMorningLedger(root, report({ breakdown: true }), ['💥 You had a breakdown.']);
    expect(el.querySelector('.ledger-highlights')!.textContent).toMatch(/breakdown/);
    expect(el.querySelector('.ledger-title')!.textContent).toMatch(/lost a day/i);
  });

  it('replaces an earlier ledger and closes from its button', () => {
    showMorningLedger(root, report(), []);
    const el = showMorningLedger(root, report({ day: 6 }), []);
    expect(root.querySelectorAll('.morning-ledger')).toHaveLength(1);
    el.querySelector<HTMLButtonElement>('.ledger-close')!.click();
    expect(root.querySelector('.morning-ledger')).toBeNull();
  });

  it('gets out of the way on its own after a while', () => {
    vi.useFakeTimers();
    showMorningLedger(root, report(), []);
    vi.advanceTimersByTime(30_000);
    expect(root.querySelector('.morning-ledger')).toBeNull();
  });

  it('copes with a report that has no lines', () => {
    const el = showMorningLedger(root, report({ lines: [] }), []);
    expect(el.querySelectorAll('.ledger-line')).toHaveLength(0);
    expect(el.querySelector('.ledger-totals')).not.toBeNull();
  });
});
