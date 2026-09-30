import { contributeToNode } from '../core/state/actions';
import { useGameStore } from '../core/state/useGameStore';
import {
  planContribution, communityContributionPct, CASH_PER_PCT, ENERGY_PER_PCT, DAILY_PLAYER_CONTRIBUTION_CAP_PCT, isNodeLocked,
} from '../core/simulation/EconomyRules';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';

export type BuildProgressKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress' | 'toolLibraryProgress' | 'landTrustProgress';

export interface ConstructionNodeData {
  id: string;
  label: string;
  position: { x: number; y: number };
  progressKey: BuildProgressKey;
}

const LABELS: Record<BuildProgressKey, string> = {
  kitchenProgress:    'Community Kitchen & Fridge',
  solarGridProgress:  'Rooftop Solar Cooperative',
  legalFundProgress:  'Legal Defense Fund',
  toolLibraryProgress: 'Community Tool Library',
  landTrustProgress:  'Community Land Trust',
};

function fmtPct(v: number): string {
  return `${Math.round(v * 10) / 10}%`;
}

export class ConstructionModal {
  private readonly el: HTMLElement;
  private readonly progressKey: BuildProgressKey;
  private readonly onClose?: () => void;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement, progressKey: BuildProgressKey, onClose?: () => void) {
    this.progressKey = progressKey;
    this.onClose = onClose;

    const state = useGameStore.getState();
    const current = state.commons[progressKey];

    const { cash: playerCash, energy: playerEnergy, socialTrust } = state.player;
    const completed = current >= 100;
    const locked = isNodeLocked(progressKey, state.commons);
    const buff = state.commons.constructionSpeedBuff;
    const todayPct = this.contributedTodayPct();
    const capReached = todayPct >= DAILY_PLAYER_CONTRIBUTION_CAP_PCT - 1e-9;
    const focus = state.economy.focusNode;
    const neighbourPct = communityContributionPct(socialTrust, buff);
    const neighbourLine = focus === progressKey || focus === null
      ? `🏘 Neighbours add ~${fmtPct(neighbourPct)} here every night while this is your focus build.`
      : `🏘 Neighbours are helping on the ${LABELS[focus]} — contribute here to switch their focus.`;

    this.el = document.createElement('div');
    this.el.className = 'construction-modal';
    this.el.innerHTML = `
      <div class="construction-panel interactive" role="dialog" aria-modal="true" aria-labelledby="build-title-label">
        <div class="construction-header">
          <span id="build-title-label" class="construction-title">${this.getLabel()}</span>
          <button class="construction-close" type="button" aria-label="Close build panel">×</button>
        </div>
        <div class="construction-progress-wrap">
          <div class="construction-progress-label">${completed ? '✅ Complete!' : `Progress ${fmtPct(current)}`}</div>
          <div class="construction-progress-bar">
            <div class="construction-progress-fill" style="width:${current}%${completed ? ';background:#44cc88' : ''}"></div>
          </div>
        </div>
        ${locked
          ? `<p class="build-complete-msg">🔒 The Land Trust is the district's final step. It opens once the Community Kitchen, Solar Co-op, Legal Defense Fund and Tool Library are all built.</p>`
          : completed
          ? `<p class="build-complete-msg">This building is fully funded. The community benefits every day.</p>`
          : `<p class="build-resources-hint">💰 $${CASH_PER_PCT} = 1% · ⚡${ENERGY_PER_PCT} = 1%${buff > 0 ? ` · 🌱 solidarity bonus +${Math.round(buff * 100)}%` : ''}</p>
             <p class="build-resources-hint">${neighbourLine}</p>
             ${capReached
               ? `<p class="build-complete-msg">You've given all a build crew can take from one person today (${DAILY_PLAYER_CONTRIBUTION_CAP_PCT}%) — come back tomorrow.</p>`
               : `<p class="build-resources-hint">You have 💰 $${playerCash} · ⚡${playerEnergy} — up to ${fmtPct(DAILY_PLAYER_CONTRIBUTION_CAP_PCT - todayPct)} more from you today.</p>
             <form class="construction-form">
               <label>
                 <span>Contribute Cash</span>
                 <input type="number" inputmode="numeric" min="0" max="${playerCash}" step="1" value="0" name="cash" />
               </label>
               <label>
                 <span>Volunteer Energy</span>
                 <input type="number" inputmode="numeric" min="0" max="${playerEnergy}" step="1" value="0" name="energy" />
               </label>
               <p class="build-preview" aria-live="polite">Enter an amount to see what it adds.</p>
               <p class="build-error" hidden></p>
               <button type="submit" class="construction-submit"${playerCash <= 0 && playerEnergy <= 0 ? ' disabled' : ''}>Contribute</button>
             </form>`}`
        }
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.disposeEscape = bindEscapeClose(() => this.close());
    this.bindEvents();
  }

  private bindEvents(): void {
    const closeButton = this.el.querySelector<HTMLButtonElement>('.construction-close');
    closeButton?.addEventListener('click', () => this.close());

    const form = this.el.querySelector<HTMLFormElement>('.construction-form');
    if (!form) return;

    const cashField = form.elements.namedItem('cash') as HTMLInputElement | null;
    const energyField = form.elements.namedItem('energy') as HTMLInputElement | null;
    const preview = form.querySelector<HTMLElement>('.build-preview');
    const errorEl = form.querySelector<HTMLElement>('.build-error');
    const request = () => ({ cash: Number(cashField?.value ?? '0'), energy: Number(energyField?.value ?? '0') });

    const updatePreview = () => {
      if (!preview) return;
      const state = useGameStore.getState();
      const plan = planContribution({
        currentPct: state.commons[this.progressKey],
        cash: state.player.cash,
        energy: state.player.energy,
        contributedTodayPct: this.contributedTodayPct(),
        speedBuff: state.commons.constructionSpeedBuff,
      }, request());
      if (plan.progressPct <= 0) {
        preview.textContent = 'Enter an amount to see what it adds.';
        return;
      }
      const parts = [plan.cashSpent > 0 ? `$${plan.cashSpent}` : '', plan.energySpent > 0 ? `⚡${plan.energySpent}` : ''].filter(Boolean);
      const note = plan.cappedByCompletion ? ' (only what the build still needs)'
        : plan.cappedByDailyLimit ? ' (today\'s limit)' : '';
      preview.textContent = `+${fmtPct(plan.progressPct)} for ${parts.join(' + ')}${note}`;
    };
    cashField?.addEventListener('input', updatePreview);
    energyField?.addEventListener('input', updatePreview);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const req = request();
      if (!(req.cash > 0) && !(req.energy > 0)) {
        this.close();
        return;
      }
      const result = contributeToNode(this.progressKey, req);
      if (!result.ok) {
        if (errorEl) {
          errorEl.textContent = 'That doesn\'t add anything — check the amounts.';
          errorEl.hidden = false;
        }
        return;
      }
      // A finished build is celebrated globally by BuildCelebration.ts (it
      // used to spawn particles into this modal just as it closed, so
      // nobody ever saw them).
      this.close();
    });
  }

  private contributedTodayPct(): number {
    const { economy, meta } = useGameStore.getState();
    return economy.contributionsToday.day === meta.day ? economy.contributionsToday.byNode[this.progressKey] ?? 0 : 0;
  }

  private getLabel(): string {
    return LABELS[this.progressKey];
  }

  private close(): void {
    inputManager.setLocked(false);
    this.disposeEscape();
    this.el.remove();
    this.onClose?.();
  }
}
