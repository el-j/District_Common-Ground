import { useGameStore, type GameState, type BuildNodeKey } from '../core/state/useGameStore';
import { playFanfare } from '../core/audio/SoundSynth';
import { inputManager } from '../world/InputManager';
import { GOALS } from './GoalsModal';

const CONFETTI = 60;
const COLORS = ['#4ade80', '#facc15', '#38bdf8', '#f472b6', '#fb923c', '#a78bfa'];

/** Builds that reached 100% between two states. The Land Trust is left to
 *  the Safe Haven ending, and loads/new games never count. */
export function justCompletedNodes(prev: GameState, next: GameState): BuildNodeKey[] {
  if (prev.meta.phase !== 'playing' || next.meta.phase !== 'playing') return [];
  if (prev.player.classRole !== next.player.classRole) return [];
  return GOALS
    .map(g => g.key)
    .filter(k => k !== 'landTrustProgress' && prev.commons[k] < 100 && next.commons[k] >= 100);
}

function confetti(): string {
  let out = '';
  for (let i = 0; i < CONFETTI; i++) {
    const x = Math.round(Math.random() * 100);
    const drift = Math.round((Math.random() - 0.5) * 240);
    const delay = (Math.random() * 0.6).toFixed(2);
    const dur = (2.2 + Math.random() * 1.6).toFixed(2);
    const spin = Math.round(360 + Math.random() * 720);
    const color = COLORS[i % COLORS.length];
    out += `<span class="confetti-piece" style="--x:${x}%;--drift:${drift}px;--delay:${delay}s;--dur:${dur}s;--spin:${spin}deg;--c:${color}"></span>`;
  }
  return out;
}

/** The big moment when a commons opens — from the player's own contribution
 *  or from neighbours overnight. Several at once are shown one by one.
 *  Returns a detach function. */
export function attachBuildCelebrations(root: HTMLElement): () => void {
  let prev = useGameStore.getState();
  const queue: BuildNodeKey[] = [];
  let showing = false;

  const showNext = (): void => {
    const key = queue.shift();
    if (!key) {
      showing = false;
      inputManager.setLocked(false);
      return;
    }
    showing = true;
    const goal = GOALS.find(g => g.key === key)!;
    const { commons } = useGameStore.getState();
    const built = GOALS.filter(g => commons[g.key] >= 100).length;

    const el = document.createElement('div');
    el.className = 'build-celebration';
    el.innerHTML = `
      <div class="confetti" aria-hidden="true">${confetti()}</div>
      <div class="celebration-card interactive" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
        <div class="celebration-burst" aria-hidden="true"></div>
        <div class="celebration-icon" aria-hidden="true">${goal.icon}</div>
        <p class="celebration-kicker">Built together · ${built} of ${GOALS.length} commons</p>
        <h2 id="celebration-title" class="celebration-title">The ${goal.label} is open!</h2>
        <p class="celebration-benefit">${goal.benefit}</p>
        <p class="celebration-resilience">District resilience is now <strong>${commons.resilienceScore}%</strong>.</p>
        <button type="button" class="celebration-close">🎉 Celebrate with the neighbours</button>
      </div>
    `;
    el.querySelector('.celebration-close')!.addEventListener('click', () => {
      el.remove();
      showNext();
    });
    root.appendChild(el);
    inputManager.setLocked(true);
    playFanfare();
    el.querySelector<HTMLButtonElement>('.celebration-close')!.focus();
  };

  return useGameStore.subscribe(next => {
    const done = justCompletedNodes(prev, next);
    prev = next;
    if (done.length === 0) return;
    queue.push(...done);
    if (!showing) showNext();
  });
}
