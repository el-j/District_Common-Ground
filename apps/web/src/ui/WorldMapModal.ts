import { useGameStore } from '../core/state/useGameStore';
import { ALL_REGION_IDS, REGIONS, isRegionUnlocked } from '../world/regions/RegionData';
import { WorldScene } from '../world/WorldScene';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

/**
 * M46 — EPIC-35 §1/§2. Shows every region, locked or not, and drives
 * travel via `WorldScene.requestTravel()` (M46's new static handler
 * registry — whichever of WorldScene/RegionScene is currently awake routes
 * the request). Modeled on the same `.settings-panel`/`.shop-grid`/
 * `.shop-card` shell every other modal built this session already uses
 * (a more complete, already-`--ui-*`-token-driven surface than the bare
 * `.ui-panel` class this doc's original wording named) — reusing an
 * existing convention, per the doc's own intent, just the more established
 * one rather than a second parallel modal shell.
 */
export class WorldMapModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private statusMessage = '';

  constructor(root: HTMLElement, private readonly onClose?: () => void) {
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

  private unlockContext() {
    const state = useGameStore.getState();
    return {
      trust: state.player.socialTrust,
      resilienceScore: state.commons.resilienceScore,
      completedQuestIds: state.quests.filter(q => q.completedOnDay !== null).map(q => q.questId),
    };
  }

  private render(): void {
    const currentRegionId = useGameStore.getState().world.currentRegionId;
    const ctx = this.unlockContext();

    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🗺 World Map</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          ${this.statusMessage ? `<p class="shop-status">${this.statusMessage}</p>` : ''}
          <div class="shop-grid">
            ${ALL_REGION_IDS.map(id => this.renderRegion(id, id === currentRegionId, ctx)).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderRegion(id: (typeof ALL_REGION_IDS)[number], isCurrent: boolean, ctx: ReturnType<WorldMapModal['unlockContext']>): string {
    const region = REGIONS[id];
    const unlocked = isRegionUnlocked(region.unlockRule, ctx);

    let action: string;
    if (isCurrent) {
      action = '<span class="shop-item-owned">📍 You are here</span>';
    } else if (unlocked) {
      action = `<button class="shop-buy-btn interactive" data-travel="${id}" type="button">Travel</button>`;
    } else {
      action = '<span class="shop-item-owned" style="color:#c79a4a">🔒 Locked</span>';
    }

    return `
      <div class="shop-card ${isCurrent ? 'shop-card--owned' : ''}">
        <div class="shop-card-header">
          <span class="shop-item-title">${region.label}</span>
        </div>
        <p class="shop-item-desc">${unlocked ? '' : region.unlockCondition}</p>
        ${action}
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-travel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['travel'] as (typeof ALL_REGION_IDS)[number] | undefined;
        if (!id) return;
        playUIClick();
        const ok = WorldScene.requestTravel(id);
        if (ok) {
          playSolidarityChime();
          this.close();
        } else {
          this.statusMessage = 'Could not travel there right now.';
          this.render();
        }
      });
    });
  }

  private close(): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => {
      this.el.remove();
      this.onClose?.();
    }, 200);
  }
}
