import { useGameStore, type BuildNodeKey } from '../core/state/useGameStore';
import { communityContributionPct, isNodeLocked } from '../core/simulation/EconomyRules';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';
import { ownsEffect, facadeMarkers, BUILD_PLAQUES } from '../core/shop/ShopEffects';
import { MILESTONE_DEFINITIONS } from '../core/simulation/Milestones';
import { checkMilestones } from '../core/state/actions';

/** What each commons build does once finished — matches EconomyMath.ts. */
export const GOALS: { key: BuildNodeKey; icon: string; label: string; benefit: string }[] = [
  { key: 'kitchenProgress', icon: '🍲', label: 'Community Kitchen & Fridge', benefit: 'Free food every day and −3% stress a day.' },
  { key: 'solarGridProgress', icon: '☀️', label: 'Rooftop Solar Co-op', benefit: '−5% stress a day.' },
  { key: 'legalFundProgress', icon: '⚖️', label: 'Legal Defense Fund', benefit: '−4% stress a day.' },
  { key: 'toolLibraryProgress', icon: '🔧', label: 'Community Tool Library', benefit: 'Daily energy upkeep drops from 10 to 8.' },
  { key: 'landTrustProgress', icon: '🌿', label: 'Community Land Trust', benefit: 'Safe Haven — the neighbourhood is secured for good (the ending).' },
];

/** Audit §3.3 / Phase 4 & Milestones — shows both the five commons builds
 *  and civic milestones/achievements with their rewards. */
export class GoalsModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private activeTab: 'commons' | 'milestones' = 'commons';

  constructor(root: HTMLElement) {
    checkMilestones();
    const { commons, economy, player, shop, milestones } = useGameStore.getState();
    const plaques = ownsEffect(shop.owned, 'build-plaques');
    const facades = facadeMarkers(shop.owned);
    const nightly = Math.round(communityContributionPct(player.socialTrust, commons.constructionSpeedBuff) * 10) / 10;

    const completedCommonsCount = GOALS.filter(g => commons[g.key] >= 100).length;
    const unlockedMilestonesCount = milestones?.unlockedIds?.length ?? 0;

    const commonsRows = GOALS.map(g => {
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

    const milestoneRows = MILESTONE_DEFINITIONS.map(m => {
      const isUnlocked = milestones?.unlockedIds?.includes(m.id) ?? false;
      const rewardParts: string[] = [];
      if (m.reward?.cashDelta) rewardParts.push(`+$${m.reward.cashDelta}`);
      if (m.reward?.trustDelta) rewardParts.push(`+${m.reward.trustDelta}% Trust`);
      if (m.reward?.energyDelta) rewardParts.push(`+${m.reward.energyDelta}⚡`);
      const rewardStr = rewardParts.length > 0 ? rewardParts.join(', ') : 'Honorary Badge';

      return `
        <li class="milestone-row${isUnlocked ? ' milestone-row--done' : ' milestone-row--locked'}">
          <span class="milestone-icon" aria-hidden="true">${m.icon}</span>
          <div class="milestone-text">
            <div class="milestone-header">
              <span class="milestone-title">${m.title}</span>
              <span class="milestone-category">${m.category}</span>
            </div>
            <span class="milestone-desc">${m.description}</span>
            <div class="milestone-footer">
              <span class="milestone-reward">🎁 ${rewardStr}</span>
              <span class="milestone-status">${isUnlocked ? '✅ Completed' : '🔒 Locked'}</span>
            </div>
          </div>
        </li>`;
    }).join('');

    this.el = document.createElement('div');
    this.el.className = 'settings-overlay settings-overlay--visible';
    this.el.innerHTML = `
      <div class="settings-panel interactive" role="dialog" aria-modal="true" aria-labelledby="goals-title">
        <div class="settings-header">
          <span id="goals-title" class="settings-title">🎯 Goals & Milestones</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <div class="goals-tabs" role="tablist">
            <button type="button" class="goals-tab-btn goals-tab-btn--active" role="tab" aria-selected="true" data-tab="commons">
              🎯 Commons (${completedCommonsCount}/${GOALS.length})
            </button>
            <button type="button" class="goals-tab-btn" role="tab" aria-selected="false" data-tab="milestones">
              🏆 Milestones (${unlockedMilestonesCount}/${MILESTONE_DEFINITIONS.length})
            </button>
          </div>
          <div class="goals-tab-content goals-tab-content--commons">
            <p class="shop-status">Build the neighbourhood's five commons. Walk to a 🔨 build site to give cash or energy; neighbours add more every night to the build you last helped.</p>
            <ul class="goal-list">${commonsRows}</ul>
            <p class="shop-status">District resilience: ${commons.resilienceScore}% — it rises with every build and with solidarity.</p>
          </div>
          <div class="goals-tab-content goals-tab-content--milestones" hidden>
            <p class="shop-status">Civic achievements earned through solidarity, survival, and community action. Milestones grant permanent stat bonuses upon completion.</p>
            <ul class="milestone-list">${milestoneRows}</ul>
          </div>
        </div>
      </div>`;
    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.disposeEscape = bindEscapeClose(() => this.close());
    this.el.querySelector('.settings-close')?.addEventListener('click', () => this.close());
    this.el.addEventListener('click', e => { if (e.target === this.el) this.close(); });

    this.setupTabs();
  }

  private setupTabs(): void {
    const tabs = this.el.querySelectorAll<HTMLButtonElement>('.goals-tab-btn');
    const commonsView = this.el.querySelector<HTMLElement>('.goals-tab-content--commons');
    const milestonesView = this.el.querySelector<HTMLElement>('.goals-tab-content--milestones');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset['tab'] as 'commons' | 'milestones';
        if (target === this.activeTab) return;
        this.activeTab = target;

        tabs.forEach(t => {
          const isActive = t === tab;
          t.classList.toggle('goals-tab-btn--active', isActive);
          t.setAttribute('aria-selected', String(isActive));
        });

        if (commonsView && milestonesView) {
          commonsView.hidden = this.activeTab !== 'commons';
          milestonesView.hidden = this.activeTab !== 'milestones';
        }
      });
    });
  }

  private close(): void {
    this.disposeEscape();
    inputManager.setLocked(false);
    this.el.remove();
  }
}
