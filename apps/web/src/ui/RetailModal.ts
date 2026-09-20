import { useGameStore } from '../core/state/useGameStore';
import { buyMaterial } from '../core/state/actions';
import { MATERIAL_TOKENS, MATERIAL_CATEGORY, MATERIAL_PRICES, type MaterialToken, type MaterialCategory } from '../core/simulation/Materials';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

function materialLabel(token: MaterialToken): string {
  return token.replace('MATERIAL_', '').replace(/_/g, ' ').toLowerCase();
}

/**
 * M42 §2 — EPIC-34. Baumarkt/Supermarket buy flow, wired to M38 §3's
 * `MATERIAL_PRICES` data stub. Modeled on `ShopModal.ts`'s card-grid layout
 * exactly (`.settings-panel`/`.shop-grid`/`.shop-card`) — the same reasoning
 * `CraftingModal.ts` already used: a catalog grid, not a binary choice.
 * `category` filters to one half of M38's raw/salvage taxonomy split, so
 * Baumarkt (salvage) and Supermarket (raw) show genuinely different stock
 * from the same underlying data rather than needing two separate catalogs.
 */
export class RetailModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private statusMessage = '';

  constructor(
    root: HTMLElement,
    private readonly category: MaterialCategory,
    private readonly storeLabel: string,
    private readonly onClose?: () => void,
  ) {
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

  private stock(): readonly MaterialToken[] {
    return MATERIAL_TOKENS.filter(t => MATERIAL_CATEGORY[t] === this.category);
  }

  private render(): void {
    const cash = useGameStore.getState().player.cash;

    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🏪 ${this.storeLabel}</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="shop-wallet-row">
          <span class="shop-wallet-chip" title="Cash on hand">💰 $${cash}</span>
        </div>
        <div class="settings-body">
          ${this.statusMessage ? `<p class="shop-status">${this.statusMessage}</p>` : ''}
          <div class="shop-grid">${this.stock().map(t => this.renderMaterial(t, cash)).join('')}</div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderMaterial(token: MaterialToken, cash: number): string {
    const price = MATERIAL_PRICES[token];
    const held = useGameStore.getState().inventory.materials[token] ?? 0;
    const canAfford = cash >= price;

    return `
      <div class="shop-card">
        <div class="shop-card-header">
          <span class="shop-item-title">${materialLabel(token)}</span>
          <span class="shop-item-category">held ${held}</span>
        </div>
        <button class="shop-buy-btn interactive" data-buy="${token}" type="button" ${canAfford ? '' : 'disabled'}>
          Buy 1 — $${price}
        </button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const token = btn.dataset['buy'] as MaterialToken | undefined;
        if (!token) return;
        playUIClick();
        const result = buyMaterial(token, 1);
        this.statusMessage = result.ok ? '' : 'Not enough cash for that.';
        if (result.ok) playSolidarityChime();
        this.render();
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
