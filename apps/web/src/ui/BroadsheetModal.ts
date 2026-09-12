import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';

export interface BroadsheetData {
  headline: string;
  subheadline: string;
  npcQuote: string;
  npcName: string;
  foodIndex: number;
  energyIndex: number;
  dayNumber: number;
}

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
    const foodPct = ((data.foodIndex - 1) * 100).toFixed(0);
    const energyPct = ((data.energyIndex - 1) * 100).toFixed(0);
    const foodSign = data.foodIndex >= 1 ? '+' : '';
    const energySign = data.energyIndex >= 1 ? '+' : '';
    const foodClass = data.foodIndex > 1.1 ? 'index-high' : data.foodIndex < 0.95 ? 'index-low' : 'index-ok';
    const energyClass = data.energyIndex > 1.1 ? 'index-high' : data.energyIndex < 0.95 ? 'index-low' : 'index-ok';

    return `
      <div class="broadsheet-masthead">
        <h1 id="broadsheet-title" class="broadsheet-name">The Daily District Ground</h1>
        <div class="broadsheet-dateline">Day ${data.dayNumber} — Your Neighbourhood Matters</div>
      </div>
      <div class="broadsheet-columns">
        <div class="broadsheet-col broadsheet-main">
          <h2 class="broadsheet-headline">${data.headline}</h2>
          <p class="broadsheet-sub">${data.subheadline}</p>
          <blockquote class="broadsheet-quote">
            "${data.npcQuote}"
            <cite>— ${data.npcName}</cite>
          </blockquote>
        </div>
        <div class="broadsheet-col broadsheet-sidebar">
          <div class="broadsheet-barometer">
            <h3>District Barometer</h3>
            <div class="barometer-row">
              <span>🧺 Food</span>
              <span class="${foodClass}">${foodSign}${foodPct}%</span>
            </div>
            <div class="barometer-row">
              <span>⚡ Energy</span>
              <span class="${energyClass}">${energySign}${energyPct}%</span>
            </div>
          </div>
          <div class="broadsheet-crossword">
            <h3>Commons Clue (+5 Energy)</h3>
            <p class="crossword-clue">Across: Mutual support between neighbors (9)</p>
            <input class="crossword-input" type="text" maxlength="9" placeholder="_________"
              aria-label="Crossword answer" autocomplete="off" spellcheck="false" />
            <div class="crossword-feedback" aria-live="polite"></div>
          </div>
        </div>
      </div>
      <button class="broadsheet-close" type="button">Begin the Day →</button>
    `;
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
