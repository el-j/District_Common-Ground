import { getActiveSkinId } from '../skins/ThemeManager';
import { getThemeCatalog, applyTheme, type ThemeCatalogEntry } from '../skins/ThemePluginManager';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { clearSave, saveToDB } from '../core/state/persistence';
import { setRegionCode } from '../core/state/actions';
import { bindEscapeClose } from './modalDismiss';

const REGION_OPTIONS: { code: string; label: string }[] = [
  { code: 'GENERIC', label: 'Generic / Unspecified' },
  { code: 'US-NORTHEAST', label: 'US — Northeast' },
  { code: 'US-MIDWEST', label: 'US — Midwest' },
  { code: 'US-SOUTH', label: 'US — South' },
  { code: 'US-WEST', label: 'US — West' },
  { code: 'EU', label: 'Europe' },
  { code: 'OTHER', label: 'Other' },
];

interface SkinPreview {
  desc: string;
  accent: string;
  bg: string;
}

const KNOWN_PREVIEWS: Record<string, SkinPreview> = {
  solarpunk: { desc: 'Saturated cream, green & gold — glassy and vivid', accent: '#3ee07a', bg: '#10261c' },
  retro_gb: { desc: '4-shade Game Boy monochrome', accent: '#8bac0f', bg: '#0f380f' },
  labor_woodcut: { desc: '1930s protest-poster woodcut', accent: '#d8a13a', bg: '#1c1712' },
  aurora: { desc: 'Jewel-toned indigo, violet & cyan glass', accent: '#22d3ee', bg: '#11123a' },
  sunset_commons: { desc: 'Warm coral, plum & amber golden hour', accent: '#ff8f6b', bg: '#2b1830' },
};
const FALLBACK_PREVIEW: SkinPreview = { desc: 'Community theme', accent: '#8a8a9a', bg: '#1a1a28' };

export class SettingsModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private scene?: Phaser.Scene;
  private confirmNewGame = false;
  private catalog: ThemeCatalogEntry[] = [
    { id: 'solarpunk', title: 'Neon Solarpunk', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/solarpunk/skin.manifest.json' },
    { id: 'retro_gb', title: 'Retro GB', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/retro_gb/skin.manifest.json' },
    { id: 'labor_woodcut', title: '1930s Labor Woodcut', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/labor_woodcut/skin.manifest.json' },
    { id: 'aurora', title: 'Aurora Prime', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/aurora/skin.manifest.json' },
    { id: 'sunset_commons', title: 'Sunset Commons', author: 'District Commons', builtIn: true, entrypoint: 'assets/skins/sunset_commons/skin.manifest.json' },
  ];

  constructor(root: HTMLElement, scene?: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;

    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.render();

    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close(onClose);
    });

    this.disposeEscape = bindEscapeClose(() => this.close(onClose));

    void getThemeCatalog().then(catalog => {
      this.catalog = catalog;
      this.render();
    });
  }

  private render(): void {
    const activeSkin = getActiveSkinId();

    this.el.innerHTML = `
      <div class="settings-panel interactive">
        <div class="settings-header">
          <span class="settings-title">⚙ Settings</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          ${this.renderSkins(activeSkin)}
          ${this.renderRegion()}
          <div class="settings-new-game">
            ${this.confirmNewGame
              ? `<p class="new-game-confirm-text">All progress will be lost. Are you sure?</p>
                 <div class="new-game-confirm-btns">
                   <button class="construction-submit new-game-yes" type="button">Yes, start over</button>
                   <button class="auth-btn auth-btn--secondary new-game-cancel" type="button">Cancel</button>
                 </div>`
              : `<button class="auth-btn auth-btn--secondary new-game-btn" type="button">🔄 New Game</button>`
            }
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSkins(activeSkin: string): string {
    return `
      <div class="skin-grid">
        ${this.catalog.map(theme => {
          const preview = KNOWN_PREVIEWS[theme.id] ?? FALLBACK_PREVIEW;
          return `
          <button
            class="skin-card ${theme.id === activeSkin ? 'skin-card--active' : ''} interactive"
            data-skin="${theme.id}"
            type="button"
            style="--card-accent:${preview.accent};--card-bg:${preview.bg}"
          >
            <div class="skin-preview" style="background:${preview.bg};border-color:${preview.accent}">
              <span style="color:${preview.accent};font-size:1.2rem">▓</span>
              <span style="color:${preview.accent};font-size:0.8rem;opacity:0.6">▒</span>
              <span style="color:${preview.accent};font-size:0.5rem;opacity:0.3">░</span>
            </div>
            <div class="skin-info">
              <span class="skin-name">${theme.title}</span>
              <span class="skin-desc">${theme.builtIn ? preview.desc : `by ${theme.author}`}</span>
              ${theme.id === activeSkin ? '<span class="skin-badge">Active</span>' : ''}
            </div>
          </button>
        `;
        }).join('')}
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

  private renderRegion(): string {
    const current = useGameStore.getState().meta.regionCode ?? 'GENERIC';
    return `
      <div class="settings-region">
        <label class="settings-region-label" for="settings-region-select">Civic Region (coarse — no GPS/location used)</label>
        <select class="settings-region-select" id="settings-region-select">
          ${REGION_OPTIONS.map(opt =>
            `<option value="${opt.code}"${opt.code === current ? ' selected' : ''}>${opt.label}</option>`
          ).join('')}
        </select>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        const skinId = btn.dataset['skin']!;
        const theme = this.catalog.find(entry => entry.id === skinId);
        if (!theme) return;
        void applyTheme(theme, this.scene).then(() => this.render());
      });
    });

    this.el.querySelector<HTMLSelectElement>('.settings-region-select')
      ?.addEventListener('change', e => {
        const code = (e.target as HTMLSelectElement).value;
        setRegionCode(code);
        void saveToDB(useGameStore.getState());
      });

    this.el.querySelector<HTMLButtonElement>('.new-game-btn')
      ?.addEventListener('click', () => {
        playUIClick();
        this.confirmNewGame = true;
        this.render();
      });

    this.el.querySelector<HTMLButtonElement>('.new-game-yes')
      ?.addEventListener('click', () => {
        playUIClick();
        void clearSave().then(() => {
          useGameStore.setState(INITIAL_STATE);
          this.close();
        });
      });

    this.el.querySelector<HTMLButtonElement>('.new-game-cancel')
      ?.addEventListener('click', () => {
        playUIClick();
        this.confirmNewGame = false;
        this.render();
      });
  }

  private close(cb?: () => void): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => {
      this.el.remove();
      cb?.();
    }, 200);
  }
}
