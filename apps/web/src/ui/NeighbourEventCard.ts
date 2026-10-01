import { useGameStore } from '../core/state/useGameStore';
import {
  pendingNeighbourEvent, resolveNeighbourEvent, optionAffordable,
  type NeighbourEventOption, type EventEffects,
} from '../core/simulation/NeighbourEvents';
import { inputManager } from '../world/InputManager';

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

function chips(e: EventEffects): string {
  const out: string[] = [];
  const chip = (text: string, good: boolean) => out.push(`<span class="ledger-chip ledger-chip--${good ? 'good' : 'bad'}">${text}</span>`);
  if (e.cash) chip(`${e.cash > 0 ? '+' : '−'}$${Math.abs(e.cash)}`, e.cash > 0);
  if (e.energy) chip(`${signed(e.energy)}⚡`, e.energy > 0);
  if (e.trust) chip(`${signed(e.trust)}🤝`, e.trust > 0);
  if (e.stress) chip(`${signed(e.stress)}% stress`, e.stress < 0);
  if (e.resilience) chip(`${signed(e.resilience)}% resilience`, e.resilience > 0);
  if (e.build) chip(`+${e.build}% to the build`, true);
  return out.join('');
}

function optionHtml(o: NeighbourEventOption, i: number, affordable: boolean): string {
  return `
    <button type="button" class="event-option" data-option="${i}"${affordable ? '' : ' disabled'}>
      <span class="event-option-label">${o.label}</span>
      <span class="ledger-chips">${chips(o.effects) || '<span class="ledger-chip ledger-chip--note">no change</span>'}</span>
      ${affordable ? '' : '<span class="event-option-why">Not enough cash or energy</span>'}
    </button>`;
}

/** Shows the pending neighbour moment (NeighbourEvents.ts) as a card: two
 *  choices, then the outcome. Also picks up an event still pending from a
 *  previous session. Returns a detach function. */
export function attachNeighbourEvents(root: HTMLElement): () => void {
  let open: HTMLElement | null = null;

  const show = (): void => {
    const event = pendingNeighbourEvent();
    if (!event || open) return;
    const { player } = useGameStore.getState();
    const el = document.createElement('div');
    el.className = 'neighbour-event';
    el.innerHTML = `
      <div class="event-card interactive" role="dialog" aria-modal="true" aria-labelledby="event-title">
        <div class="event-head">
          <span class="event-icon" aria-hidden="true">${event.icon}</span>
          <div>
            <p class="event-who">${event.who}</p>
            <h2 id="event-title" class="event-title">${event.title}</h2>
          </div>
        </div>
        <p class="event-text">${event.text}</p>
        <div class="event-options">
          ${event.options.map((o, i) => optionHtml(o, i, optionAffordable(o, player))).join('')}
        </div>
      </div>
    `;
    el.querySelectorAll<HTMLButtonElement>('.event-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const outcome = resolveNeighbourEvent(Number(btn.dataset['option']) as 0 | 1);
        if (outcome === null) return;
        const card = el.querySelector('.event-card')!;
        card.querySelector('.event-options')!.remove();
        const p = document.createElement('p');
        p.className = 'event-outcome';
        p.textContent = outcome;
        const next = document.createElement('button');
        next.type = 'button';
        next.className = 'event-continue';
        next.textContent = 'Continue →';
        next.addEventListener('click', () => {
          el.remove();
          open = null;
          inputManager.setLocked(false);
        });
        card.append(p, next);
        next.focus();
      });
    });
    open = el;
    root.appendChild(el);
    inputManager.setLocked(true);
  };

  show();
  let prevId = useGameStore.getState().neighbourEvents.pendingId;
  return useGameStore.subscribe(s => {
    const id = s.neighbourEvents.pendingId;
    if (id === prevId) return;
    prevId = id;
    if (id) show();
  });
}
