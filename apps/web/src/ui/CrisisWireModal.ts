import { resolveCrisis, getScenario } from '../core/simulation/CrisisEngine';
import type { CrisisScenario } from '../core/simulation/CrisisEngine';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';

export class CrisisWireModal {
  // el assigned in constructor after guard; '!' tells tsc it's always set before use
  private el!: HTMLElement;
  private readonly onClose: () => void;

  constructor(root: HTMLElement, scenarioId: string, onClose: () => void) {
    this.onClose = onClose;

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      onClose();
      return;
    }

    this.el = document.createElement('div');
    this.el.className = 'crisis-overlay';
    this.el.innerHTML = this.buildHTML(scenario);
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('crisis-overlay--visible'));

    this.bindEvents();
  }

  private buildHTML(s: CrisisScenario): string {
    return `
      <div class="crisis-panel">
        <div class="crisis-ticker">⚡ BREAKING — DISTRICT UPDATE ⚡</div>
        <h2 class="crisis-title">${s.title}</h2>
        <p class="crisis-context">${s.context}</p>
        <div class="crisis-choices">
          <button class="crisis-btn crisis-btn--scapegoat interactive" data-choice="A" type="button">
            <span class="crisis-btn-label">${s.choiceA.label}</span>
            <span class="crisis-btn-desc">${s.choiceA.description.slice(0, 80)}…</span>
          </button>
          <button class="crisis-btn crisis-btn--solidarity interactive" data-choice="B" type="button">
            <span class="crisis-btn-label">${s.choiceB.label}</span>
            <span class="crisis-btn-desc">${s.choiceB.description.slice(0, 80)}…</span>
          </button>
        </div>
        <p class="crisis-note">A decision must be made before the day can continue.</p>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset['choice'] as 'A' | 'B';
        playUIClick();
        resolveCrisis(choice);
        this.close();
      });
    });
  }

  private close(): void {
    this.el.classList.remove('crisis-overlay--visible');
    this.el.classList.add('crisis-overlay--out');
    inputManager.setLocked(false);
    setTimeout(() => {
      this.el.remove();
      this.onClose();
    }, 300);
  }
}
