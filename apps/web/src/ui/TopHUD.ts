import { useGameStore, type GameState } from '../core/state/useGameStore';
import { advanceDay } from '../core/state/actions';
import { SettingsModal } from './SettingsModal';
import { openShareSheet } from './ShareModal';

export class TopHUD {
  private el: HTMLElement;
  private statsEl: HTMLElement;
  private zoneEl: HTMLElement;
  private actionButton: HTMLButtonElement | null = null;
  private actionHandler: (() => void) | null = null;
  private endDayBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private shareBtn: HTMLButtonElement;
  private scene?: Phaser.Scene;

  constructor(root: HTMLElement, scene?: Phaser.Scene) {
    this.scene = scene;
    // Main HUD strip (top)
    this.el = document.createElement('div');
    this.el.id = 'top-hud';
    root.appendChild(this.el);

    this.statsEl = document.createElement('div');
    this.statsEl.id = 'hud-stats';
    this.el.appendChild(this.statsEl);

    this.zoneEl = document.createElement('div');
    this.zoneEl.id = 'hud-zone';
    this.el.appendChild(this.zoneEl);

    // End Day button (bottom-left, persistent)
    this.endDayBtn = document.createElement('button');
    this.endDayBtn.type = 'button';
    this.endDayBtn.className = 'end-day-btn interactive';
    this.endDayBtn.textContent = 'End Day';
    this.endDayBtn.hidden = true;
    this.endDayBtn.addEventListener('click', () => advanceDay());
    root.appendChild(this.endDayBtn);

    // Settings / gear button (bottom-right corner)
    this.settingsBtn = document.createElement('button');
    this.settingsBtn.type = 'button';
    this.settingsBtn.className = 'settings-gear-btn interactive';
    this.settingsBtn.textContent = '⚙';
    this.settingsBtn.hidden = true;
    this.settingsBtn.setAttribute('aria-label', 'Settings');
    this.settingsBtn.addEventListener('click', () => {
      new SettingsModal(root, this.scene);
    });
    root.appendChild(this.settingsBtn);

    // Share button (bottom-right, next to settings)
    this.shareBtn = document.createElement('button');
    this.shareBtn.type = 'button';
    this.shareBtn.className = 'share-btn interactive';
    this.shareBtn.textContent = '📣';
    this.shareBtn.hidden = true;
    this.shareBtn.setAttribute('aria-label', 'Share progress');
    this.shareBtn.addEventListener('click', () => openShareSheet(root));
    root.appendChild(this.shareBtn);

    this.render(useGameStore.getState());
    useGameStore.subscribe(s => this.render(s));
  }

  public setAction(label: string, handler: () => void): void {
    if (!this.actionButton) {
      this.actionButton = document.createElement('button');
      this.actionButton.type = 'button';
      this.actionButton.className = 'context-action-button interactive';
      document.getElementById('ui-root')?.appendChild(this.actionButton);
    }
    this.actionHandler = handler;
    this.actionButton.textContent = label;
    this.actionButton.hidden = false;
    this.actionButton.onclick = () => this.actionHandler?.();
  }

  public hideAction(): void {
    if (!this.actionButton) return;
    this.actionButton.hidden = true;
    this.actionHandler = null;
  }

  public setZone(zone: string): void {
    this.zoneEl.textContent = zone;
  }

  private render(state: GameState): void {
    const { meta, player, commons } = state;

    if (meta.phase === 'select') {
      this.el.hidden = true;
      this.endDayBtn.hidden = true;
      this.settingsBtn.hidden = true;
      this.shareBtn.hidden = true;
      return;
    }

    this.el.hidden = false;
    this.endDayBtn.hidden = false;
    this.settingsBtn.hidden = false;
    this.shareBtn.hidden = false;

    const roleLabel = player.classRole
      ? { pip: 'Pip', morgan: 'Morgan', arthur: 'Arthur' }[player.classRole] ?? '?'
      : '?';

    const energyPct = Math.round((player.energy / player.maxEnergy) * 100);
    const stressClass = player.stressLevel > 74 ? ' hud-stat--danger' : player.stressLevel > 49 ? ' hud-stat--warn' : '';

    this.statsEl.innerHTML = `
      <div class="hud-row hud-top">
        <span class="hud-badge">${roleLabel[0]}</span>
        <span class="hud-day">Day ${meta.day}</span>
        <div class="hud-res-bar" title="${commons.resilienceScore}% resilience">
          <div class="hud-res-fill" style="width:${commons.resilienceScore}%"></div>
        </div>
        <span class="hud-res-pct">${commons.resilienceScore}%</span>
      </div>
      <div class="hud-row hud-stats">
        <span class="hud-stat">💰 $${player.cash}</span>
        <span class="hud-stat hud-energy-stat">⚡<span class="hud-ebar"><span class="hud-ebar-fill" style="width:${energyPct}%"></span></span>${player.energy}</span>
        <span class="hud-stat">🤝 ${player.socialTrust}</span>
        <span class="hud-stat${stressClass}">😰 ${player.stressLevel}%</span>
      </div>
    `;
  }
}
