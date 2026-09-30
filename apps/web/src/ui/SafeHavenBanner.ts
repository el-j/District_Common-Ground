import { inputManager } from '../world/InputManager';
import { TactileEffects } from '../builder/TactileEffects';
import { useGameStore, type GameState } from '../core/state/useGameStore';
import { startNewGame } from '../core/state/persistence';

export interface RunSummary {
  days: number;
  solidarityChoices: number;
  scapegoatChoices: number;
  breakdowns: number;
  trust: number;
  resilience: number;
}

/** Crisis choices only — Town Hall votes share the history log under
 *  `assembly-*` ids and aren't counted as crisis choices. */
export function runSummary(state: GameState): RunSummary {
  const crises = state.crisisState.historyLog.filter(e => !e.id.startsWith('assembly-'));
  return {
    days: state.meta.day,
    solidarityChoices: crises.filter(e => e.choice === 'solidarity').length,
    scapegoatChoices: crises.filter(e => e.choice === 'scapegoat').length,
    breakdowns: state.economy.breakdowns,
    trust: state.player.socialTrust,
    resilience: state.commons.resilienceScore,
  };
}

/**
 * One-time celebratory ending banner shown the moment the Community Land
 * Trust (node E) reaches 100% — see EPIC-11 Test 11.2 "Safe Haven" ending.
 */
export class SafeHavenBanner {
  private readonly el: HTMLElement;
  private readonly onClose?: () => void;

  constructor(root: HTMLElement, onClose?: () => void) {
    this.onClose = onClose;
    const sum = runSummary(useGameStore.getState());
    // shown once per save, even across reloads
    useGameStore.setState(st => ({ economy: { ...st.economy, endingSeen: true } }));

    this.el = document.createElement('div');
    this.el.className = 'safe-haven-banner';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'safe-haven-title');
    this.el.innerHTML = `
      <div class="safe-haven-panel interactive">
        <div class="safe-haven-icon">🌿</div>
        <h2 id="safe-haven-title" class="safe-haven-title">Safe Haven Achieved</h2>
        <p class="safe-haven-body">
          The Community Land Trust is fully funded. No investor can ever buy these buildings
          out from under this neighbourhood again — this ground belongs to the people who
          live on it, for good.
        </p>
        <ul class="safe-haven-summary">
          <li>📅 ${sum.days} days</li>
          <li>🤝 ${sum.solidarityChoices} solidarity choices · ⚠ ${sum.scapegoatChoices} scapegoat choices</li>
          <li>🛡 Resilience ${sum.resilience}% · Trust ${sum.trust}</li>
          <li>💥 ${sum.breakdowns} breakdown${sum.breakdowns === 1 ? '' : 's'}</li>
        </ul>
        <div class="safe-haven-actions">
          <button class="safe-haven-close" type="button">Keep playing</button>
          <button class="safe-haven-new" type="button">Start a new game</button>
        </div>
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);
    TactileEffects.playStageCompleteChime();
    TactileEffects.spawnCelebrationParticles(this.el);

    this.el.querySelector('.safe-haven-close')?.addEventListener('click', () => this.close());
    this.el.querySelector('.safe-haven-new')?.addEventListener('click', () => {
      void startNewGame().finally(() => window.location.reload());
    });
  }

  private close(): void {
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose?.();
  }
}
