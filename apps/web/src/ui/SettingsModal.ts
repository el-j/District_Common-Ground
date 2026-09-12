import { switchSkin, getActiveSkinId } from '../skins/ThemeManager';
import { getQuestsForToday, completeQuest, type QuestDefinition } from '../core/simulation/IrlQuestSystem';
import { type QuestId } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';

const SKINS = [
  {
    id: 'solarpunk',
    label: 'Solarpunk',
    desc: 'Lush, green, community-forward',
    accent: '#66dd88',
    bg: '#1a2c18',
  },
  {
    id: 'retro_gb',
    label: 'Retro GB',
    desc: '4-shade Game Boy monochrome',
    accent: '#8bac0f',
    bg: '#0f380f',
  },
];

export class SettingsModal {
  private readonly el: HTMLElement;
  private tab: 'skins' | 'quests' = 'skins';
  private scene?: Phaser.Scene;

  constructor(root: HTMLElement, scene?: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;

    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.render();

    // Close on backdrop click
    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close(onClose);
    });
  }

  private render(): void {
    const quests = getQuestsForToday();
    const activeSkin = getActiveSkinId();

    this.el.innerHTML = `
      <div class="settings-panel interactive">
        <div class="settings-header">
          <span class="settings-title">⚙ Settings</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>

        <div class="settings-tabs">
          <button class="settings-tab ${this.tab === 'skins' ? 'settings-tab--active' : ''}" data-tab="skins" type="button">
            🎨 Skins
          </button>
          <button class="settings-tab ${this.tab === 'quests' ? 'settings-tab--active' : ''}" data-tab="quests" type="button">
            📋 Daily Quests
          </button>
        </div>

        <div class="settings-body">
          ${this.tab === 'skins' ? this.renderSkins(activeSkin) : this.renderQuests(quests)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSkins(activeSkin: string): string {
    return `
      <div class="skin-grid">
        ${SKINS.map(s => `
          <button
            class="skin-card ${s.id === activeSkin ? 'skin-card--active' : ''} interactive"
            data-skin="${s.id}"
            type="button"
            style="--card-accent:${s.accent};--card-bg:${s.bg}"
          >
            <div class="skin-preview" style="background:${s.bg};border-color:${s.accent}">
              <span style="color:${s.accent};font-size:1.2rem">▓</span>
              <span style="color:${s.accent};font-size:0.8rem;opacity:0.6">▒</span>
              <span style="color:${s.accent};font-size:0.5rem;opacity:0.3">░</span>
            </div>
            <div class="skin-info">
              <span class="skin-name">${s.label}</span>
              <span class="skin-desc">${s.desc}</span>
              ${s.id === activeSkin ? '<span class="skin-badge">Active</span>' : ''}
            </div>
          </button>
        `).join('')}
        <div class="skin-card skin-card--locked">
          <div class="skin-preview" style="background:#1a1a28">
            <span style="color:#444;font-size:1.4rem">🔒</span>
          </div>
          <div class="skin-info">
            <span class="skin-name">Cozy Vector</span>
            <span class="skin-desc">Coming in a future update</span>
          </div>
        </div>
      </div>
    `;
  }

  private renderQuests(quests: (QuestDefinition & { available: boolean })[]): string {
    return `
      <div class="quest-list">
        <p class="quest-subtitle">Complete real-world actions for in-game buffs. Resets each morning.</p>
        ${quests.map(q => `
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
        `).join('')}
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        this.tab = btn.dataset['tab'] as 'skins' | 'quests';
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        const skinId = btn.dataset['skin']!;
        void switchSkin(skinId, this.scene).then(() => this.render());
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-quest]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        playUIClick();
        completeQuest(btn.dataset['quest'] as QuestId);
        this.render();
      });
    });
  }

  private close(cb?: () => void): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    setTimeout(() => {
      this.el.remove();
      cb?.();
    }, 200);
  }
}
