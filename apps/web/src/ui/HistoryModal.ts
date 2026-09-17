import { useGameStore, type CrisisLogEntry } from '../core/state/useGameStore';
import { getScenario } from '../core/simulation/CrisisEngine';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';

export class HistoryModal {
  private readonly el: HTMLElement;
  private readonly onClose: () => void;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement, onClose: () => void) {
    this.onClose = onClose;

    const { historyLog } = useGameStore.getState().crisisState;

    this.el = document.createElement('div');
    this.el.className = 'history-overlay';
    this.el.innerHTML = this.buildHTML(historyLog);
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('history-overlay--visible'));

    this.el.querySelector<HTMLButtonElement>('.history-close')
      ?.addEventListener('click', () => this.close());

    this.disposeEscape = bindEscapeClose(() => this.close());
  }

  private buildHTML(log: CrisisLogEntry[]): string {
    const rows = log.length === 0
      ? '<p class="history-empty">No crises have been resolved yet. Advance a few days to encounter events.</p>'
      : log.map(e => this.buildRow(e)).reverse().join('');

    return `
      <div class="history-panel interactive" role="dialog" aria-modal="true" aria-labelledby="history-title-label">
        <div class="history-header">
          <span id="history-title-label" class="history-title">Town Hall — Crisis History</span>
          <button class="history-close" type="button" aria-label="Close crisis history">×</button>
        </div>
        <div class="history-subtitle">A record of every decision made in this district.</div>
        <div class="history-list">${rows}</div>
      </div>
    `;
  }

  private buildRow(entry: CrisisLogEntry): string {
    const scenario = getScenario(entry.id);
    const title = scenario?.title ?? entry.id;
    const isScapegoat = entry.choice === 'scapegoat';
    const choiceLabel = isScapegoat ? '⚡ Scapegoated' : '🤝 Solidarity';
    const choiceClass = isScapegoat ? 'history-choice--bad' : 'history-choice--good';

    return `
      <div class="history-row">
        <div class="history-row-meta">
          <span class="history-day">Day ${entry.day}</span>
          <span class="history-crisis-name">${title}</span>
          <span class="history-choice ${choiceClass}">${choiceLabel}</span>
        </div>
        <p class="history-summary">${entry.summary}</p>
      </div>
    `;
  }

  private close(): void {
    this.el.classList.remove('history-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => {
      this.el.remove();
      this.onClose();
    }, 200);
  }
}
