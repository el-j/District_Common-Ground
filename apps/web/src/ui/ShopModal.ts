import { getCatalog, getWallet, getInventory, purchaseItem } from '../api/endpoints/shop';
import { ApiError } from '../api/client';
import type { ShopItem, ShopItemCategory } from '@district-cg/shared-types';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

const TAB_LABELS: Record<'all' | ShopItemCategory, string> = {
  all: 'All',
  facade: 'Facades',
  cosmetic: 'Cosmetics',
  blueprint: 'Blueprints',
};

export class ShopModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private catalog: ShopItem[] = [];
  private owned = new Set<string>();
  private balanceST = 0;
  private signedIn = true;
  private activeTab: 'all' | ShopItemCategory = 'all';
  private confirmingId: string | null = null;
  private statusMessage = '';
  private loading = true;

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

    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.catalog = await getCatalog();
    } catch {
      this.statusMessage = 'Could not reach the Commons Bazaar. Try again later.';
    }

    try {
      const [wallet, inventory] = await Promise.all([getWallet(), getInventory()]);
      this.balanceST = wallet.solidarityTokens;
      this.owned = new Set(inventory.ownedItemIds);
      this.signedIn = true;
    } catch (err) {
      this.signedIn = !(err instanceof ApiError && err.status === 401);
    }

    this.loading = false;
    this.render();
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🏪 The Commons Bazaar</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="shop-wallet-row">
          <span class="shop-wallet-chip" title="Solidarity Tokens">🪙 ${this.balanceST} ST</span>
          ${!this.signedIn ? '<span class="shop-guest-note">Sign in to earn and spend Solidarity Tokens</span>' : ''}
        </div>
        <div class="settings-tabs">
          ${(Object.keys(TAB_LABELS) as (keyof typeof TAB_LABELS)[]).map(tab => `
            <button class="settings-tab ${tab === this.activeTab ? 'settings-tab--active' : ''}" data-tab="${tab}" type="button">
              ${TAB_LABELS[tab]}
            </button>
          `).join('')}
        </div>
        <div class="settings-body">
          ${this.statusMessage ? `<p class="shop-status">${this.statusMessage}</p>` : ''}
          ${this.loading ? '<p class="shop-status">Loading the bazaar...</p>' : `<div class="shop-grid">${this.visibleItems().map(item => this.renderItem(item)).join('')}</div>`}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private visibleItems(): ShopItem[] {
    if (this.activeTab === 'all') return this.catalog;
    return this.catalog.filter(item => item.category === this.activeTab);
  }

  private renderItem(item: ShopItem): string {
    const isOwned = this.owned.has(item.id);
    const isConfirming = this.confirmingId === item.id;
    const canAfford = this.balanceST >= item.priceST;

    let action: string;
    if (isOwned) {
      action = `<span class="shop-item-owned">✓ Owned</span>`;
    } else if (isConfirming) {
      action = `
        <div class="shop-confirm-row">
          <button class="construction-submit shop-confirm-yes interactive" data-item="${item.id}" type="button">Confirm</button>
          <button class="auth-btn auth-btn--secondary shop-confirm-cancel interactive" type="button">Cancel</button>
        </div>
      `;
    } else {
      action = `
        <button class="shop-buy-btn interactive" data-buy="${item.id}" type="button" ${this.signedIn && canAfford ? '' : 'disabled'}>
          Buy — ${item.priceST} ST
        </button>
      `;
    }

    return `
      <div class="shop-card ${isOwned ? 'shop-card--owned' : ''}">
        <div class="shop-card-header">
          <span class="shop-item-title">${item.title}</span>
          <span class="shop-item-category">${item.category}</span>
        </div>
        <p class="shop-item-desc">${item.description}</p>
        ${action}
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        this.activeTab = btn.dataset['tab'] as typeof this.activeTab;
        this.confirmingId = null;
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        playUIClick();
        this.confirmingId = btn.dataset['buy'] ?? null;
        this.render();
      });
    });

    this.el.querySelector<HTMLButtonElement>('.shop-confirm-cancel')
      ?.addEventListener('click', () => {
        playUIClick();
        this.confirmingId = null;
        this.render();
      });

    this.el.querySelector<HTMLButtonElement>('.shop-confirm-yes')
      ?.addEventListener('click', () => {
        const itemId = this.confirmingId;
        if (itemId) void this.buy(itemId);
      });
  }

  private async buy(itemId: string): Promise<void> {
    this.statusMessage = '';
    try {
      const result = await purchaseItem(itemId);
      this.balanceST = result.wallet.solidarityTokens;
      this.owned = new Set(result.inventory.ownedItemIds);
      this.confirmingId = null;
      playSolidarityChime();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        this.statusMessage = err.message.includes('owned')
          ? 'You already own that item.'
          : 'Not enough Solidarity Tokens for that purchase.';
      } else {
        this.statusMessage = 'Purchase failed. Try again later.';
      }
      this.confirmingId = null;
    }
    this.render();
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
