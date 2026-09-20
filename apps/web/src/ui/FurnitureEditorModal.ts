import { useGameStore } from '../core/state/useGameStore';
import { placeFurniture, removeFurniture } from '../core/state/actions';
import { ITEM_DEFINITIONS, type ItemToken } from '../core/simulation/Recipes';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

/**
 * M43 §2/§3 — EPIC-34, absorbing EPIC-32's M37 scope with the one real
 * upgrade: the placeable catalog is the player's own crafted/upcycled
 * `furniture`-kind items (M40 §1), not a fixed cosmetic list. Reuses
 * `DistrictGrid.ts`'s select-slot-then-confirm interaction shape
 * (click a slot, see a catalog, confirm) rather than freeform drag, per
 * EPIC-32's original carried-forward decision — `slotCount` fixed points
 * (`InteriorDefinition.furnitureSlots`), not arbitrary pixel placement.
 */
export class FurnitureEditorModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private selectedSlot: number | null = null;

  constructor(root: HTMLElement, private readonly slotCount: number, private readonly onClose?: () => void) {
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

  private furnitureCatalog(): ItemToken[] {
    return (Object.keys(ITEM_DEFINITIONS) as ItemToken[]).filter(t => ITEM_DEFINITIONS[t].kinds.includes('furniture'));
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🪑 Furnish Your Home</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          ${this.selectedSlot === null ? this.renderSlots() : this.renderCatalog(this.selectedSlot)}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderSlots(): string {
    const furniture = useGameStore.getState().housing.furniture;
    const slots = Array.from({ length: this.slotCount }, (_, i) => i);

    return `<div class="shop-grid">${slots.map(i => {
      const placed = furniture.find(f => f.slotIndex === i);
      if (placed) {
        const def = ITEM_DEFINITIONS[placed.item];
        return `
          <div class="shop-card">
            <div class="shop-card-header"><span class="shop-item-title">${def.label}</span></div>
            <p class="shop-item-desc">Slot ${i + 1}</p>
            <button class="auth-btn auth-btn--secondary interactive" data-remove="${placed.instanceId}" type="button">Remove</button>
          </div>
        `;
      }
      return `
        <div class="shop-card">
          <div class="shop-card-header"><span class="shop-item-title">Empty slot ${i + 1}</span></div>
          <p class="shop-item-desc">Nothing placed here yet.</p>
          <button class="shop-buy-btn interactive" data-slot="${i}" type="button">Fill slot</button>
        </div>
      `;
    }).join('')}</div>`;
  }

  private renderCatalog(slot: number): string {
    const held = useGameStore.getState().crafting.craftedItems;
    const catalog = this.furnitureCatalog().filter(t => (held[t] ?? 0) > 0);

    return `
      <p class="shop-status">Choose a crafted piece for slot ${slot + 1}:</p>
      ${catalog.length === 0
        ? '<p class="shop-status">No furniture-kind items in your crafted inventory yet — craft one (Scrap Stool, Planter Box, Wired Lamp, Upcycled Workbench) first.</p>'
        : `<div class="shop-grid">${catalog.map(t => `
            <div class="shop-card">
              <div class="shop-card-header"><span class="shop-item-title">${ITEM_DEFINITIONS[t].label}</span></div>
              <p class="shop-item-desc">Held ${held[t]}×</p>
              <button class="shop-buy-btn interactive" data-place="${t}" type="button">Place here</button>
            </div>
          `).join('')}</div>`}
      <button class="auth-btn auth-btn--secondary interactive" data-cancel type="button" style="margin-top:0.6rem">Back</button>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        this.selectedSlot = Number(btn.dataset['slot']);
        this.render();
      });
    });

    this.el.querySelector<HTMLButtonElement>('[data-cancel]')?.addEventListener('click', () => {
      playUIClick();
      this.selectedSlot = null;
      this.render();
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.dataset['place'] as ItemToken | undefined;
        if (!item || this.selectedSlot === null) return;
        playUIClick();
        const result = placeFurniture(item, this.selectedSlot);
        if (result.ok) playSolidarityChime();
        this.selectedSlot = null;
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const instanceId = btn.dataset['remove'];
        if (!instanceId) return;
        playUIClick();
        removeFurniture(instanceId);
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
