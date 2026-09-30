import { useGameStore, type BuildNodeKey } from '../core/state/useGameStore';
import { communityContributionPct, isNodeLocked } from '../core/simulation/EconomyRules';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';
import { ownsEffect, facadeMarkers, BUILD_PLAQUES } from '../core/shop/ShopEffects';

/** What each commons build does once finished — matches EconomyMath.ts. */
export const GOALS: { key: BuildNodeKey; icon: string; label: string; benefit: string }[] = [
  { key: 'kitchenProgress', icon: '🍲', label: 'Community Kitchen & Fridge', benefit: 'Free food every day and −3% stress a day.' },
  { key: 'solarGridProgress', icon: '☀️', label: 'Rooftop Solar Co-op', benefit: '−5% stress a day.' },
  { key: 'legalFundProgress', icon: '⚖️', label: 'Legal Defense Fund', benefit: '−4% stress a day.' },
  { key: 'toolLibraryProgress', icon: '🔧', label: 'Community Tool Library', benefit: 'Daily energy upkeep drops from 10 to 8.' },
  { key: 'landTrustProgress', icon: '🌿', label: 'Community Land Trust', benefit: 'Safe Haven — the neighbourhood is secured for good (the ending).' },
];

/** Audit §3.3 / Phase 4 — a new player had no stated goal. This panel shows
 *  the five builds, what each gives, where neighbours are helping, and the
 *  Safe Haven ending. */
export class GoalsModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement) {
    const { commons, economy, player, shop } = useGameStore.getState();
    const plaques = ownsEffect(shop.owned, 'build-plaques');
    const facades = facadeMarkers(shop.owned);
    const nightly = Math.round(communityContributionPct(player.socialTrust, commons.constructionSpeedBuff) * 10) / 10;

    const rows = GOALS.map(g => {
      const pct = Math.round(commons[g.key]);
      const locked = isNodeLocked(g.key, commons);
      const done = pct >= 100;
      const status = done ? '✅ Built' : locked ? '🔒 Opens after the other four' : `${pct}%`;
      const focus = economy.focusNode === g.key ? ` · 🏘 neighbours +${nightly}%/night` : '';
      return `
        <li class="goal-row${done ? ' goal-row--done' : ''}${locked ? ' goal-row--locked' : ''}">
          <span class="goal-icon" aria-hidden="true">${g.icon}</span>
          <div class="goal-text">
            <span class="goal-title">${g.label} <span class="goal-status">${status}${focus}</span></span>
            <span class="goal-benefit">${g.benefit}</span>
            ${facades.filter(f => f.node === g.key).map(f => `<span class="goal-benefit">${f.marker} ${f.label}</span>`).join('')}
            ${plaques && done ? `<span class="goal-plaque">🪧 ${BUILD_PLAQUES[g.key]}</span>` : ''}
            <span class="goal-bar"><span class="goal-bar-fill" style="width:${Math.min(100, pct)}%"></span></span>
          </div>
        </li>`;
    }).join('');

    this.el = document.createElement('div');
    this.el.className = 'settings-overlay settings-overlay--visible';
    this.el.innerHTML = `
      <div class="settings-panel interactive" role="dialog" aria-modal="true" aria-labelledby="goals-title">
        <div class="settings-header">
          <span id="goals-title" class="settings-title">🎯 Goals</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <p class="shop-status">Build the neighbourhood's five commons. Walk to a 🔨 build site to give cash or energy; neighbours add more every night to the build you last helped.</p>
          <ul class="goal-list">${rows}</ul>
          <p class="shop-status">District resilience: ${commons.resilienceScore}% — it rises with every build and with solidarity.</p>
        </div>
      </div>`;
    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.disposeEscape = bindEscapeClose(() => this.close());
    this.el.querySelector('.settings-close')?.addEventListener('click', () => this.close());
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });
  }

  private close(): void {
    this.disposeEscape();
    inputManager.setLocked(false);
    this.el.remove();
  }
}
