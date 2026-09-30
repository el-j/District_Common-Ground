import { useGameStore } from '../core/state/useGameStore';
import { diffStats, type StatDelta } from '../core/feedback/statDiff';
import { playCoin, playSoftDrop, playWarmRise } from '../core/audio/SoundSynth';

const POP_MS = 1600;
/** Half the widest pop, in px, kept clear of the viewport edges. */
const POP_EDGE = 70;

/** One sound per store change, picked by what matters most to the player.
 *  Energy and stress stay silent: they change on almost every action. */
function soundFor(deltas: StatDelta[]): (() => void) | null {
  const cash = deltas.find(d => d.stat === 'cash');
  if (cash) return cash.good ? playCoin : playSoftDrop;
  if (deltas.some(d => (d.stat === 'trust' || d.stat === 'resilience') && d.good)) return playWarmRise;
  return null;
}

/** Floating "+$12" / "−10⚡" feedback on every visible stat change, anchored
 *  to the matching HUD stat (`[data-stat=…]`) when it is on screen. Returns a
 *  detach function. */
export function attachStatPops(root: HTMLElement): () => void {
  let prev = useGameStore.getState();
  const stack = new Map<string, number>();

  return useGameStore.subscribe(next => {
    const deltas = diffStats(prev, next);
    prev = next;
    if (deltas.length === 0) return;
    soundFor(deltas)?.();

    for (const d of deltas) {
      const pop = document.createElement('div');
      pop.className = `stat-pop stat-pop--${d.good ? 'good' : 'bad'}`;
      pop.setAttribute('aria-hidden', 'true');
      pop.textContent = d.text;
      const anchor = document.querySelector<HTMLElement>(`[data-stat="${d.stat}"]`);
      if (anchor) {
        const r = anchor.getBoundingClientRect();
        // Stack pops for the same stat so quick successive changes don't overlap.
        const n = stack.get(d.stat) ?? 0;
        stack.set(d.stat, n + 1);
        // Centred on the stat, but never so close to an edge that the
        // (widest, "+25% resilience") label gets cut off.
        const x = Math.max(POP_EDGE, Math.min(window.innerWidth - POP_EDGE, r.left + r.width / 2));
        pop.style.left = `${x}px`;
        pop.style.top = `${r.bottom + n * 16}px`;
      } else {
        pop.classList.add('stat-pop--center');
      }
      root.appendChild(pop);
      setTimeout(() => {
        pop.remove();
        stack.set(d.stat, Math.max(0, (stack.get(d.stat) ?? 1) - 1));
      }, POP_MS);
    }
  });
}
