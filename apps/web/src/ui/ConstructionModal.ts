import { spendCash, spendEnergy, updateCommonsProgress } from '../core/state/actions';
import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { TactileEffects } from '../builder/TactileEffects';

export type BuildProgressKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress' | 'toolLibraryProgress' | 'landTrustProgress';

export interface ConstructionNodeData {
  id: string;
  label: string;
  position: { x: number; y: number };
  progressKey: BuildProgressKey;
}

export class ConstructionModal {
  private readonly el: HTMLElement;
  private readonly progressKey: BuildProgressKey;
  private readonly onClose?: () => void;

  constructor(root: HTMLElement, progressKey: BuildProgressKey, onClose?: () => void) {
    this.progressKey = progressKey;
    this.onClose = onClose;

    const state = useGameStore.getState();
    const current = state.commons[progressKey];

    const { cash: playerCash, energy: playerEnergy } = state.player;
    const completed = current >= 100;

    this.el = document.createElement('div');
    this.el.className = 'construction-modal';
    this.el.innerHTML = `
      <div class="construction-panel interactive" role="dialog" aria-modal="true" aria-labelledby="build-title-label">
        <div class="construction-header">
          <span id="build-title-label" class="construction-title">${this.getLabel()}</span>
          <button class="construction-close" type="button" aria-label="Close build panel">×</button>
        </div>
        <div class="construction-progress-wrap">
          <div class="construction-progress-label">${completed ? '✅ Complete!' : `Progress ${Math.round(current)}%`}</div>
          <div class="construction-progress-bar">
            <div class="construction-progress-fill" style="width:${current}%${completed ? ';background:#44cc88' : ''}"></div>
          </div>
        </div>
        ${completed
          ? `<p class="build-complete-msg">This building is fully funded. The community benefits every day.</p>`
          : `<p class="build-resources-hint">You have: 💰 $${playerCash} &nbsp; ⚡ ${playerEnergy}</p>
             <form class="construction-form">
               <label>
                 <span>Contribute Cash ($${playerCash} available)</span>
                 <input type="number" min="0" max="${playerCash}" step="5" value="0" name="cash" />
               </label>
               <label>
                 <span>Contribute Energy (${playerEnergy} available)</span>
                 <input type="number" min="0" max="${playerEnergy}" step="5" value="0" name="energy" />
               </label>
               <p class="build-error" hidden></p>
               <button type="submit" class="construction-submit"${playerCash <= 0 && playerEnergy <= 0 ? ' disabled' : ''}>Contribute</button>
             </form>`
        }
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.bindEvents();
  }

  private bindEvents(): void {
    const closeButton = this.el.querySelector<HTMLButtonElement>('.construction-close');
    closeButton?.addEventListener('click', () => this.close());

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { this.close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    const form = this.el.querySelector<HTMLFormElement>('.construction-form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const cashField = form.elements.namedItem('cash') as HTMLInputElement | null;
      const energyField = form.elements.namedItem('energy') as HTMLInputElement | null;
      const errorEl = form.querySelector<HTMLElement>('.build-error');

      const cash = Number(cashField?.value ?? '0');
      const energy = Number(energyField?.value ?? '0');
      const safeCash = Number.isFinite(cash) ? Math.max(0, cash) : 0;
      const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;

      if (safeCash <= 0 && safeEnergy <= 0) {
        this.close();
        return;
      }

      const state = useGameStore.getState();
      const { cash: playerCash, energy: playerEnergy } = state.player;

      if (safeCash > playerCash || safeEnergy > playerEnergy) {
        if (errorEl) {
          errorEl.textContent = "You don't have enough resources.";
          errorEl.hidden = false;
        }
        return;
      }

      const current = state.commons[this.progressKey];
      const totalProgress = (safeCash / 25) + (safeEnergy / 20);
      const nextProgress = Math.min(100, current + totalProgress);

      spendCash(safeCash);
      spendEnergy(safeEnergy);
      const { nodeJustCompleted } = updateCommonsProgress(this.progressKey, nextProgress - current);
      // M23 §2 — reuses the exact celebration calls DistrictGrid.ts already
      // fires on a parcel stage completion; a partial contribution stays silent.
      if (nodeJustCompleted) {
        TactileEffects.playStageCompleteChime();
        TactileEffects.spawnCelebrationParticles(this.el);
      }
      this.close();
    });
  }

  private getLabel(): string {
    const labels: Record<BuildProgressKey, string> = {
      kitchenProgress:    'Community Kitchen & Fridge',
      solarGridProgress:  'Rooftop Solar Cooperative',
      legalFundProgress:  'Legal Defense Fund',
      toolLibraryProgress: 'Community Tool Library',
      landTrustProgress:  'Community Land Trust',
    };
    return labels[this.progressKey];
  }

  private close(): void {
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose?.();
  }
}
