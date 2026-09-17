import { getQuestsForToday, completeQuest, type QuestDefinition } from '../core/simulation/IrlQuestSystem';
import { type QuestId } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

export class QuestModal {
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
    const quests = getQuestsForToday();
    this.el.innerHTML = `
      <div class="settings-panel interactive">
        <div class="settings-header">
          <span class="settings-title">📋 Daily Quests</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="quest-list">
            <p class="quest-subtitle">Complete real-world actions for in-game buffs. Resets each morning.</p>
            ${quests.map(q => this.renderQuest(q)).join('')}
          </div>
        </div>
      </div>
    `;

    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-quest]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        playUIClick();
        completeQuest(btn.dataset['quest'] as QuestId);
        this.render();
      });
    });
  }

  private renderQuest(q: QuestDefinition & { available: boolean }): string {
    return `
      <div class="quest-row ${q.available ? '' : 'quest-row--done'}">
        <span class="quest-icon">${q.icon}</span>
        <div class="quest-text">
          <span class="quest-title">${q.title}</span>
          <span class="quest-desc">${q.description}</span>
          <span class="quest-reward">Reward: ${q.reward}</span>
        </div>
        <button
          class="quest-btn interactive ${q.available ? '' : 'quest-btn--done'}"
          data-quest="${q.questId}"
          type="button"
          ${q.available ? '' : 'disabled'}
        >
          ${q.available ? 'Done! ✓' : '✓ Claimed'}
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
