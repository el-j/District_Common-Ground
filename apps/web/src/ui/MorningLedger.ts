import type { SettledDayReport } from '../core/state/useGameStore';
import type { LedgerLine } from '../core/simulation/EconomyMath';

/** How long the ledger stays up if the player just keeps playing. */
const AUTO_HIDE_MS = 25_000;

type Tone = 'good' | 'bad';

function chip(text: string, tone: Tone): string {
  return `<span class="ledger-chip ledger-chip--${tone}">${text}</span>`;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

function chipsFor(l: LedgerLine): string {
  const out: string[] = [];
  if (l.cash) out.push(chip(`${l.cash > 0 ? '+' : '−'}$${Math.abs(l.cash)}`, l.cash > 0 ? 'good' : 'bad'));
  if (l.energy) out.push(chip(`${signed(l.energy)}⚡`, l.energy > 0 ? 'good' : 'bad'));
  // More stress is bad, so the tone is inverted.
  if (l.stress) out.push(chip(`${signed(l.stress)}% stress`, l.stress > 0 ? 'bad' : 'good'));
  if (l.note) out.push(`<span class="ledger-chip ledger-chip--note">${l.note}</span>`);
  return out.join('');
}

function total(icon: string, from: string, to: string, tone: Tone | 'same'): string {
  return `<span class="ledger-total ledger-total--${tone}">${icon} ${from} → ${to}</span>`;
}

function toneOf(delta: number, higherIsBetter: boolean): Tone | 'same' {
  if (delta === 0) return 'same';
  return (delta > 0) === higherIsBetter ? 'good' : 'bad';
}

/** The morning after End Day: every overnight change itemised, with the real
 *  before → after totals, so no stat ever moves without a reason on screen.
 *  Non-blocking — the player can keep playing while it is up. */
export function showMorningLedger(root: HTMLElement, report: SettledDayReport, highlights: string[]): HTMLElement {
  root.querySelector('.morning-ledger')?.remove();
  const { before: b, after: a } = report;

  const el = document.createElement('section');
  el.className = 'morning-ledger interactive';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', `Morning ledger, day ${report.day}`);
  el.innerHTML = `
    <header class="ledger-head">
      <h2 class="ledger-title">☀️ Day ${report.day}${report.breakdown ? ' — you lost a day' : ''}</h2>
      <button type="button" class="ledger-close" aria-label="Close the morning ledger">Start the day →</button>
    </header>
    ${highlights.length ? `<div class="ledger-highlights">${highlights.map(h => `<p>${h}</p>`).join('')}</div>` : ''}
    <div class="ledger-totals">
      ${total('💰', `$${b.cash}`, `$${a.cash}`, toneOf(a.cash - b.cash, true))}
      ${total('⚡', `${b.energy}`, `${a.energy}`, toneOf(a.energy - b.energy, true))}
      ${total('😰', `${b.stress}%`, `${a.stress}%`, toneOf(a.stress - b.stress, false))}
      ${a.trust !== b.trust ? total('🤝', `${b.trust}`, `${a.trust}`, toneOf(a.trust - b.trust, true)) : ''}
    </div>
    <ul class="ledger-lines">
      ${report.lines.map((l, i) => `
        <li class="ledger-line" style="--i:${i}">
          <span class="ledger-icon" aria-hidden="true">${l.icon}</span>
          <span class="ledger-label">${l.label}</span>
          <span class="ledger-chips">${chipsFor(l)}</span>
        </li>`).join('')}
    </ul>
  `;

  const timer = setTimeout(() => el.remove(), AUTO_HIDE_MS);
  el.querySelector('.ledger-close')!.addEventListener('click', () => {
    clearTimeout(timer);
    el.remove();
  });
  root.appendChild(el);
  return el;
}
