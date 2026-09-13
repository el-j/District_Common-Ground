import { spendCash, spendEnergy, updateCommonsProgress } from '../core/state/actions';
import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';

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

    this.el = document.createElement('div');
    this.el.className = 'construction-modal';
    this.el.innerHTML = `
      <div class="construction-panel interactive" role="dialog" aria-modal="true" aria-labelledby="build-title-label">
        <div class="construction-header">
          <span id="build-title-label" class="construction-title">${this.getLabel()}</span>
          <button class="construction-close" type="button" aria-label="Close build panel">×</button>
        </div>
        <div class="construction-progress-wrap">
          <div class="construction-progress-label">Progress ${Math.round(current)}%</div>
          <div class="construction-progress-bar">
            <div class="construction-progress-fill" style="width:${current}%"></div>
          </div>
        </div>
        <form class="construction-form">
          <label>
            <span>Cash</span>
            <input type="number" min="0" step="5" value="0" name="cash" />
          </label>
          <label>
            <span>Energy</span>
            <input type="number" min="0" step="5" value="0" name="energy" />
          </label>
          <button type="submit" class="construction-submit">Confirm</button>
        </form>
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
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const cashField = form.elements.namedItem('cash') as HTMLInputElement | null;
      const energyField = form.elements.namedItem('energy') as HTMLInputElement | null;

      const cash = Number(cashField?.value ?? '0');
      const energy = Number(energyField?.value ?? '0');
      const safeCash = Number.isFinite(cash) ? Math.max(0, cash) : 0;
      const safeEnergy = Number.isFinite(energy) ? Math.max(0, energy) : 0;

      if (safeCash <= 0 && safeEnergy <= 0) {
        this.close();
        return;
      }

      const state = useGameStore.getState();
      const current = state.commons[this.progressKey];
      const totalProgress = (safeCash / 25) + (safeEnergy / 20);
      const nextProgress = Math.min(100, current + totalProgress);

      spendCash(safeCash);
      spendEnergy(safeEnergy);
      updateCommonsProgress(this.progressKey, nextProgress - current);
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
