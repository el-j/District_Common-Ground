import { getWorkForToday, performWork, type WorkStatus } from '../core/simulation/WorkSystem';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { TactileEffects } from '../builder/TactileEffects';
import { bindEscapeClose } from './modalDismiss';

export class WorkModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.render();

    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });

    this.disposeEscape = bindEscapeClose(() => this.close());
  }

  private render(): void {
    const work = getWorkForToday();
    this.el.innerHTML = `
      <div class="settings-panel interactive">
        <div class="settings-header">
          <span class="settings-title">💼 Work</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="quest-list">
            <p class="quest-subtitle">Trade energy for cash. Once per day.</p>
            ${work ? this.renderWork(work) : ''}
          </div>
        </div>
      </div>
    `;

    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    const workBtn = this.el.querySelector<HTMLButtonElement>('[data-work]');
    workBtn?.addEventListener('click', () => {
      if (workBtn.disabled) return;
      const result = performWork();
      if (result.success) {
        playUIClick();
        TactileEffects.playStageCompleteChime();
      }
      this.render();
    });
  }

  private renderWork(work: WorkStatus): string {
    const { definition, available, reason } = work;
    const label = reason === 'already-worked' ? '✓ Done for Today'
      : reason === 'too-tired' ? '😴 Too Tired'
      : 'Do It ✓';
    return `
      <div class="quest-row ${available ? '' : 'quest-row--done'}">
        <span class="quest-icon">${definition.icon}</span>
        <div class="quest-text">
          <span class="quest-title">${definition.label}</span>
          <span class="quest-desc">Cost: -${definition.energyCost} Energy</span>
          <span class="quest-reward">Reward: +$${definition.cashReward}</span>
        </div>
        <button
          class="quest-btn interactive ${available ? '' : 'quest-btn--done'}"
          data-work
          type="button"
          ${available ? '' : 'disabled'}
        >
          ${label}
        </button>
      </div>
    `;
  }

  private close(): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => this.el.remove(), 200);
  }
}
