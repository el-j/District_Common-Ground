import { useGameStore, type GameState } from '../core/state/useGameStore';
import { getMilestoneDefinition, type MilestoneDefinition } from '../core/simulation/Milestones';
import { playWarmRise } from '../core/audio/SoundSynth';

/**
 * Listens for newly unlocked milestones on the store and renders
 * an accessible celebratory toast notification under the top HUD.
 */
export function justUnlockedMilestones(prev: GameState, next: GameState): MilestoneDefinition[] {
  if (prev.meta.phase !== 'playing' || next.meta.phase !== 'playing') return [];
  const prevIds = new Set(prev.milestones?.unlockedIds ?? []);
  const nextIds = next.milestones?.unlockedIds ?? [];
  const newlyUnlocked: MilestoneDefinition[] = [];

  for (const id of nextIds) {
    if (!prevIds.has(id)) {
      const def = getMilestoneDefinition(id);
      if (def) newlyUnlocked.push(def);
    }
  }
  return newlyUnlocked;
}

export function attachMilestoneCelebrations(root: HTMLElement): () => void {
  let prev = useGameStore.getState();
  const queue: MilestoneDefinition[] = [];
  let showing = false;

  const showNext = (): void => {
    const milestone = queue.shift();
    if (!milestone) {
      showing = false;
      return;
    }
    showing = true;

    const el = document.createElement('div');
    el.className = 'milestone-toast interactive';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    const rewardParts: string[] = [];
    if (milestone.reward?.cashDelta) rewardParts.push(`+$${milestone.reward.cashDelta}`);
    if (milestone.reward?.trustDelta) rewardParts.push(`+${milestone.reward.trustDelta}% Trust`);
    if (milestone.reward?.energyDelta) rewardParts.push(`+${milestone.reward.energyDelta}⚡`);
    const rewardText = rewardParts.length > 0 ? ` · ${rewardParts.join(', ')}` : '';

    el.innerHTML = `
      <div class="milestone-toast-icon" aria-hidden="true">${milestone.icon}</div>
      <div class="milestone-toast-content">
        <div class="milestone-toast-kicker">🏆 Milestone Achieved</div>
        <div class="milestone-toast-title">${milestone.title}${rewardText}</div>
        <div class="milestone-toast-desc">${milestone.description}</div>
      </div>
      <button type="button" class="milestone-toast-dismiss" aria-label="Dismiss">×</button>
    `;

    const dismiss = (): void => {
      el.classList.add('milestone-toast--hiding');
      setTimeout(() => {
        el.remove();
        showNext();
      }, 250);
    };

    el.querySelector('.milestone-toast-dismiss')?.addEventListener('click', e => {
      e.stopPropagation();
      dismiss();
    });
    el.addEventListener('click', dismiss);

    root.appendChild(el);
    playWarmRise();

    // Auto-dismiss after 4.5 seconds
    setTimeout(() => {
      if (el.parentNode) dismiss();
    }, 4500);
  };

  return useGameStore.subscribe(next => {
    const newly = justUnlockedMilestones(prev, next);
    prev = next;
    if (newly.length === 0) return;
    queue.push(...newly);
    if (!showing) showNext();
  });
}
