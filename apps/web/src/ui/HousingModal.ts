import { useGameStore } from '../core/state/useGameStore';
import { rentFlat, moveOut } from '../core/state/actions';
import type { HousingOption } from '../core/simulation/HousingOptions';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

/**
 * M43 §1 — EPIC-34, absorbing EPIC-32's M36 scope. Modeled on
 * `CrisisWireModal.ts`'s delta-chip rendering (reuses `.delta-chip`/
 * `.crisis-btn-deltas` directly) since a housing choice is the same shape
 * as a crisis choice — pick one option, see its stat tradeoffs up front —
 * just recurring instead of one-time and with more than 2 choices.
 */
export class HousingModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement, private readonly options: HousingOption[], private readonly onClose?: () => void) {
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
    const currentFlatId = useGameStore.getState().housing.currentFlatId;

    this.el.innerHTML = `
      <div class="settings-panel shop-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🏠 Housing</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="shop-grid">${this.options.map(o => this.renderOption(o, o.id === currentFlatId)).join('')}</div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private statChips(c: HousingOption['consequences']): string {
    const chips: string[] = [];
    const chip = (val: number, pos: string, neg: string, label: string) => {
      if (val === 0) return;
      const cls = val > 0 ? 'delta--pos' : 'delta--neg';
      const sign = val > 0 ? `+${val}` : `${val}`;
      chips.push(`<span class="delta-chip ${cls}">${val > 0 ? pos : neg} ${sign} ${label}</span>`);
    };
    chip(c.cashDelta, '💰', '💸', 'Cash/day');
    chip(c.energyDelta, '⚡', '😓', 'Energy/day');
    chip(c.stressDelta, '😌', '😟', 'Stress/day');
    return chips.join('');
  }

  private renderOption(option: HousingOption, isCurrent: boolean): string {
    return `
      <div class="shop-card ${isCurrent ? 'shop-card--owned' : ''}">
        <div class="shop-card-header">
          <span class="shop-item-title">${option.label}</span>
          ${isCurrent ? '<span class="shop-item-owned">✓ Renting</span>' : ''}
        </div>
        <p class="shop-item-desc">${option.description}</p>
        <div class="crisis-btn-deltas">${this.statChips(option.consequences)}</div>
        ${isCurrent
          ? `<button class="auth-btn auth-btn--secondary interactive" data-moveout type="button">Move out</button>`
          : `<button class="shop-buy-btn interactive" data-rent="${option.id}" type="button">Move in</button>`}
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')
      ?.addEventListener('click', () => this.close());

    this.el.querySelectorAll<HTMLButtonElement>('[data-rent]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['rent'];
        if (!id) return;
        playUIClick();
        rentFlat(id);
        playSolidarityChime();
        this.render();
      });
    });

    this.el.querySelector<HTMLButtonElement>('[data-moveout]')?.addEventListener('click', () => {
      playUIClick();
      moveOut();
      this.render();
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
