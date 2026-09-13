import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { buildBroadsheetHTML, type BroadsheetData } from './broadsheetHTML';

export { buildBroadsheetHTML, type BroadsheetData } from './broadsheetHTML';

export class BroadsheetModal {
  private readonly overlay: HTMLElement;
  private readonly paper: HTMLElement;
  private onClose: (() => void) | null = null;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(root: HTMLElement) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'broadsheet-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'broadsheet-title');
    this.overlay.hidden = true;

    this.paper = document.createElement('div');
    this.paper.className = 'broadsheet-paper';
    this.overlay.appendChild(this.paper);
    root.appendChild(this.overlay);

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.overlay.hidden) this.close();
    };
    document.addEventListener('keydown', this.keyHandler);
  }

  open(data: BroadsheetData, onClose?: () => void): void {
    this.onClose = onClose ?? null;
    this.paper.innerHTML = this.buildHTML(data);
    this.overlay.hidden = false;
    inputManager.setLocked(true);

    this.paper.style.transform = 'rotateX(90deg)';
    requestAnimationFrame(() => {
      this.paper.style.transition = 'transform 400ms ease-out';
      this.paper.style.transform = 'rotateX(0deg)';
    });

    this.paper.querySelector('.broadsheet-close')?.addEventListener('click', () => this.close());
    this.wireCrossword();
  }

  private buildHTML(data: BroadsheetData): string {
    return buildBroadsheetHTML(data);
  }

  private wireCrossword(): void {
    const input = this.paper.querySelector<HTMLInputElement>('.crossword-input');
    const feedback = this.paper.querySelector<HTMLElement>('.crossword-feedback');
    if (!input || !feedback) return;

    input.addEventListener('input', () => {
      if (input.value.toLowerCase() === 'solidarity') {
        feedback.textContent = '✓ Correct! +5 Energy';
        feedback.style.color = '#66dd88';
        useGameStore.setState(state => ({
          player: { ...state.player, energy: Math.min(state.player.maxEnergy, state.player.energy + 5) },
        }));
        input.disabled = true;
      }
    });
  }

  private close(): void {
    this.overlay.hidden = true;
    this.paper.style.transition = '';
    this.paper.style.transform = '';
    inputManager.setLocked(false);
    this.onClose?.();
  }

  destroy(): void {
    document.removeEventListener('keydown', this.keyHandler);
    this.overlay.remove();
  }
}

