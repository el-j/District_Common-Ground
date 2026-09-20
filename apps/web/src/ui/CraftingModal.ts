import { useGameStore } from '../core/state/useGameStore';
import { craftRecipe, sellItem } from '../core/state/actions';
import {
  RECIPES, RECIPE_IDS, ITEM_DEFINITIONS, sellValueFor, stationSupportsRecipe,
  type Recipe, type ItemToken, type CraftFailureReason, type CraftingStation,
} from '../core/simulation/Recipes';
import type { MaterialToken } from '../core/simulation/Materials';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';
import { TerminalModal } from './TerminalModal';

const FAILURE_LABEL: Record<CraftFailureReason, string> = {
  'unknown-recipe': 'Not yet learned',
  'insufficient-mastery': 'Needs more mastery',
  'missing-materials': 'Missing materials',
  'missing-item-inputs': 'Missing a crafted component',
  'requires-crafting-station': 'Needs a real crafting station (coming soon)',
};

function materialLabel(token: MaterialToken): string {
  return token.replace('MATERIAL_', '').replace(/_/g, ' ').toLowerCase();
}

/**
 * M39 §3 / M40 §1-§2 — EPIC-33. Modeled directly on `ShopModal.ts`'s
 * card-grid layout and CSS classes (`.settings-panel`/`.shop-grid`/
 * `.shop-card`) — crafting is a local-only catalog (no API round-trip,
 * unlike the Bazaar), so `load()`/`loading` don't apply here, but
 * everything else follows the same shape deliberately rather than inventing
 * a second modal pattern. Two tabs: known recipes (craft) and held crafted
 * items (sell, or use — the computer's terminal affordance).
 */
export class CraftingModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private activeTab: 'recipes' | 'inventory' = 'recipes';

  /** M42 §1 — `station` is set when opened from inside a workshop
   *  InteriorScene (see InteriorScene.ts) so `atStation` is computed for
   *  real instead of always defaulting to false, closing M39 §3's
   *  crafting-station forward dependency. `undefined` (the HUD-button entry
   *  point, no fixed location) behaves exactly as it did before this
   *  milestone — every 'advanced' recipe stays blocked. */
  constructor(root: HTMLElement, private readonly onClose?: () => void, private readonly station?: CraftingStation) {
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
    const state = useGameStore.getState();
    const known = RECIPE_IDS.filter(id => state.crafting.knownRecipes.includes(id));
    const held = (Object.entries(state.crafting.craftedItems) as [ItemToken, number][])
      .filter(([, count]) => count > 0);

    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🛠 Crafting</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="shop-wallet-row">
          <span class="shop-wallet-chip" title="Recipes known">📖 ${known.length}/${RECIPE_IDS.length} recipes known</span>
          ${this.station ? `<span class="shop-wallet-chip" title="Crafting station">🛠 At ${this.station.discipline} station (${this.station.requiredTier})</span>` : ''}
        </div>
        <div class="settings-tabs">
          <button class="settings-tab ${this.activeTab === 'recipes' ? 'settings-tab--active' : ''}" data-tab="recipes" type="button">Recipes</button>
          <button class="settings-tab ${this.activeTab === 'inventory' ? 'settings-tab--active' : ''}" data-tab="inventory" type="button">Crafted Items (${held.length})</button>
        </div>
        <div class="settings-body">
          ${this.activeTab === 'recipes' ? this.renderRecipesTab(known) : this.renderInventoryTab(held)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderRecipesTab(known: readonly (keyof typeof RECIPES)[]): string {
    if (known.length === 0) {
      return '<p class="shop-status">No recipes known yet. Find a cookbook or earn one from a neighbor\'s trust.</p>';
    }
    return `<div class="shop-grid">${known.map(id => this.renderRecipe(RECIPES[id])).join('')}</div>`;
  }

  private renderInventoryTab(held: [ItemToken, number][]): string {
    if (held.length === 0) {
      return '<p class="shop-status">Nothing crafted yet — craft something from the Recipes tab first.</p>';
    }
    return `<div class="shop-grid">${held.map(([token, count]) => this.renderHeldItem(token, count)).join('')}</div>`;
  }

  private renderHeldItem(token: ItemToken, count: number): string {
    const state = useGameStore.getState();
    const def = ITEM_DEFINITIONS[token];
    const mastery = state.crafting.mastery[def.discipline] ?? 0;
    const sellable = def.kinds.includes('sellable');
    const usable = def.kinds.includes('usable');
    const value = sellable ? sellValueFor(token, mastery) : 0;

    return `
      <div class="shop-card">
        <div class="shop-card-header">
          <span class="shop-item-title">${def.label}</span>
          <span class="shop-item-category">${def.kinds.join(', ')}</span>
        </div>
        <p class="shop-item-desc">Held ${count}×</p>
        <div class="shop-confirm-row">
          ${usable ? `<button class="shop-buy-btn interactive" data-use="${token}" type="button">Use</button>` : ''}
          ${sellable ? `<button class="shop-buy-btn interactive" data-sell="${token}" type="button">Sell — $${value}</button>` : ''}
        </div>
      </div>
    `;
  }

  private renderRecipe(recipe: Recipe): string {
    const state = useGameStore.getState();
    const materials = state.inventory.materials;
    const craftedItems = state.crafting.craftedItems;
    const mastery = state.crafting.mastery[recipe.discipline] ?? 0;
    const craftedCount = craftedItems[recipe.output] ?? 0;

    const materialChips = (Object.entries(recipe.inputs) as [MaterialToken, number][])
      .map(([token, amount]) => {
        const held = materials[token] ?? 0;
        const ok = held >= amount;
        return `<span class="delta-chip ${ok ? 'delta--pos' : 'delta--neg'}">${materialLabel(token)} ${held}/${amount}</span>`;
      })
      .join('');
    const itemChips = recipe.itemInputs
      ? (Object.entries(recipe.itemInputs) as [ItemToken, number][])
        .map(([token, amount]) => {
          const held = craftedItems[token] ?? 0;
          const ok = held >= amount;
          return `<span class="delta-chip ${ok ? 'delta--pos' : 'delta--neg'}">${ITEM_DEFINITIONS[token].label} ${held}/${amount}</span>`;
        })
        .join('')
      : '';

    // Dry-run the same eligibility check craftRecipe() will run, purely for
    // display — no store mutation happens from rendering.
    const missingMaterials = (Object.entries(recipe.inputs) as [MaterialToken, number][])
      .some(([token, amount]) => (materials[token] ?? 0) < amount);
    const missingItems = recipe.itemInputs
      ? (Object.entries(recipe.itemInputs) as [ItemToken, number][]).some(([token, amount]) => (craftedItems[token] ?? 0) < amount)
      : false;
    const masteryOk = mastery >= recipe.minMastery;
    const atStation = !!this.station && stationSupportsRecipe(this.station, recipe);
    const stationOk = recipe.tier === 'basic' || atStation;
    const canCraft = !missingMaterials && !missingItems && masteryOk && stationOk;

    let blockedReason = '';
    if (!masteryOk) blockedReason = FAILURE_LABEL['insufficient-mastery'];
    else if (!stationOk) blockedReason = FAILURE_LABEL['requires-crafting-station'];
    else if (missingItems) blockedReason = FAILURE_LABEL['missing-item-inputs'];
    else if (missingMaterials) blockedReason = FAILURE_LABEL['missing-materials'];

    return `
      <div class="shop-card">
        <div class="shop-card-header">
          <span class="shop-item-title">${recipe.label}</span>
          <span class="shop-item-category">${recipe.discipline}${recipe.tier === 'advanced' ? ' · advanced' : ''}</span>
        </div>
        <p class="shop-item-desc">Mastery ${mastery}/10${recipe.minMastery > 0 ? ` (needs ${recipe.minMastery})` : ''} · crafted ${craftedCount}×</p>
        <div class="crisis-btn-deltas">${materialChips}${itemChips}</div>
        ${canCraft
          ? `<button class="shop-buy-btn interactive" data-craft="${recipe.id}" type="button">Craft</button>`
          : `<span class="shop-item-owned" style="color:#c79a4a">${blockedReason}</span>`}
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
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-craft]').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeId = btn.dataset['craft'] as keyof typeof RECIPES | undefined;
        if (!recipeId) return;
        playUIClick();
        const atStation = !!this.station && stationSupportsRecipe(this.station, RECIPES[recipeId]);
        const result = craftRecipe(recipeId, atStation);
        if (result.ok) playSolidarityChime();
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset['sell'] as ItemToken | undefined;
        if (!item) return;
        playUIClick();
        const result = sellItem(item);
        if (result.ok) playSolidarityChime();
        this.render();
      });
    });

    // Only one 'usable' item exists in the catalog today (the computer) —
    // a single hardcoded branch here is honest about that, not a stand-in
    // for a generic "use handler registry" this scope doesn't need yet.
    this.el.querySelectorAll<HTMLButtonElement>('[data-use]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset['use'] as ItemToken | undefined;
        if (item !== 'ITEM_UPCYCLED_COMPUTER') return;
        playUIClick();
        const uiRoot = document.getElementById('ui-root');
        if (uiRoot) new TerminalModal(uiRoot);
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
