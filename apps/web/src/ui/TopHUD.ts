import { useGameStore, type GameState } from '../core/state/useGameStore';
import { advanceDay } from '../core/state/actions';
import { SettingsModal } from './SettingsModal';
import { QuestModal } from './QuestModal';
import { openShareSheet } from './ShareModal';
import { BroadsheetModal } from './BroadsheetModal';
import { RadioWidget } from './RadioWidget';
import { DistrictBuilderModal } from './DistrictBuilderModal';
import { PluginManagerModal } from './PluginManagerModal';
import { ShopModal } from './ShopModal';
import { SocialHubModal } from './SocialHubModal';
import { getWallet } from '../api/endpoints/shop';
import { setBGMMuted, isBGMMuted } from '../core/audio/SoundSynth';

export class TopHUD {
  private el: HTMLElement;
  private statsEl: HTMLElement;
  private zoneEl: HTMLElement;
  private barometerEl: HTMLElement;
  private pulseBadgeEl: HTMLElement;
  private actionButton: HTMLButtonElement | null = null;
  private actionHandler: (() => void) | null = null;
  private endDayBtn: HTMLButtonElement;
  private settingsBtn: HTMLButtonElement;
  private shareBtn: HTMLButtonElement;
  private radioBtn: HTMLButtonElement;
  private muteBtn: HTMLButtonElement;
  private questBtn: HTMLButtonElement;
  private builderBtn: HTMLButtonElement;
  private pluginsBtn: HTMLButtonElement;
  private shopBtn: HTMLButtonElement;
  private socialBtn: HTMLButtonElement;
  private walletChipEl: HTMLElement;
  private broadsheet: BroadsheetModal;
  private radio: RadioWidget;
  private scene?: Phaser.Scene;

  constructor(root: HTMLElement, scene?: Phaser.Scene) {
    this.scene = scene;
    // Main HUD strip (top)
    this.el = document.createElement('div');
    this.el.id = 'top-hud';
    root.appendChild(this.el);

    this.statsEl = document.createElement('div');
    this.statsEl.id = 'hud-stats';
    this.statsEl.setAttribute('aria-live', 'polite');
    this.el.appendChild(this.statsEl);

    this.zoneEl = document.createElement('div');
    this.zoneEl.id = 'hud-zone';
    this.el.appendChild(this.zoneEl);

    this.barometerEl = document.createElement('div');
    this.barometerEl.id = 'hud-barometer';
    this.el.appendChild(this.barometerEl);

    this.pulseBadgeEl = document.createElement('div');
    this.pulseBadgeEl.id = 'hud-pulse-badge';
    this.pulseBadgeEl.setAttribute('title', 'District Solidarity Index');
    this.pulseBadgeEl.hidden = true;
    this.el.appendChild(this.pulseBadgeEl);

    // Broadsheet + radio instances (persistent, opened on demand)
    this.broadsheet = new BroadsheetModal(root);
    this.radio = new RadioWidget(root);

    // End Day button — shows broadsheet first, then advances day on close
    this.endDayBtn = document.createElement('button');
    this.endDayBtn.type = 'button';
    this.endDayBtn.className = 'end-day-btn interactive';
    this.endDayBtn.textContent = 'End Day';
    this.endDayBtn.setAttribute('aria-label', 'End day and view morning dispatch');
    this.endDayBtn.hidden = true;
    this.endDayBtn.addEventListener('click', () => this.onEndDay(root));
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

    // Radio button
    this.radioBtn = document.createElement('button');
    this.radioBtn.type = 'button';
    this.radioBtn.className = 'radio-open-btn interactive';
    this.radioBtn.textContent = '📻';
    this.radioBtn.hidden = true;
    this.radioBtn.setAttribute('aria-label', 'Open Radio Free Commons');
    this.radioBtn.addEventListener('click', () => this.radio.show());
    root.appendChild(this.radioBtn);

    // Music mute toggle
    this.muteBtn = document.createElement('button');
    this.muteBtn.type = 'button';
    this.muteBtn.className = 'mute-btn interactive';
    this.muteBtn.textContent = '🔊';
    this.muteBtn.hidden = true;
    this.muteBtn.setAttribute('aria-label', 'Toggle music');
    this.muteBtn.addEventListener('click', () => {
      const muted = !isBGMMuted();
      setBGMMuted(muted);
      this.muteBtn.textContent = muted ? '🔇' : '🔊';
      this.muteBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    });
    root.appendChild(this.muteBtn);

    // Daily quests button
    this.questBtn = document.createElement('button');
    this.questBtn.type = 'button';
    this.questBtn.className = 'quest-open-btn interactive';
    this.questBtn.textContent = '📋';
    this.questBtn.hidden = true;
    this.questBtn.setAttribute('aria-label', 'Daily Quests');
    this.questBtn.addEventListener('click', () => new QuestModal(root));
    root.appendChild(this.questBtn);

    // Living District Builder button
    this.builderBtn = document.createElement('button');
    this.builderBtn.type = 'button';
    this.builderBtn.className = 'builder-open-btn interactive';
    this.builderBtn.textContent = '🏗️';
    this.builderBtn.hidden = true;
    this.builderBtn.setAttribute('aria-label', 'Open Living District Builder');
    this.builderBtn.addEventListener('click', () => new DistrictBuilderModal(root));
    root.appendChild(this.builderBtn);

    this.pluginsBtn = document.createElement('button');
    this.pluginsBtn.type = 'button';
    this.pluginsBtn.className = 'plugin-open-btn interactive';
    this.pluginsBtn.textContent = '🧩';
    this.pluginsBtn.hidden = true;
    this.pluginsBtn.setAttribute('aria-label', 'Open Plugin Library');
    this.pluginsBtn.addEventListener('click', () => new PluginManagerModal(root));
    root.appendChild(this.pluginsBtn);

    // Commons Bazaar (shop) button
    this.shopBtn = document.createElement('button');
    this.shopBtn.type = 'button';
    this.shopBtn.className = 'shop-open-btn interactive';
    this.shopBtn.textContent = '🏪';
    this.shopBtn.hidden = true;
    this.shopBtn.setAttribute('aria-label', 'Open the Commons Bazaar');
    this.shopBtn.addEventListener('click', () => new ShopModal(root, () => this.fetchWalletBalance()));
    root.appendChild(this.shopBtn);

    // Common Grounds (social hub) button
    this.socialBtn = document.createElement('button');
    this.socialBtn.type = 'button';
    this.socialBtn.className = 'social-open-btn interactive';
    this.socialBtn.textContent = '🤝';
    this.socialBtn.hidden = true;
    this.socialBtn.setAttribute('aria-label', 'Open Common Grounds');
    this.socialBtn.addEventListener('click', () => new SocialHubModal(root));
    root.appendChild(this.socialBtn);

    // Solidarity Token wallet balance chip (only shown once fetched for a signed-in user)
    this.walletChipEl = document.createElement('div');
    this.walletChipEl.className = 'hud-wallet-chip';
    this.walletChipEl.hidden = true;
    root.appendChild(this.walletChipEl);

    this.render(useGameStore.getState());
    useGameStore.subscribe(s => this.render(s));

    // Fetch district resilience badge (non-blocking)
    this.fetchPulseBadge();
    this.fetchWalletBalance();
  }

  private fetchWalletBalance(): void {
    getWallet()
      .then(wallet => {
        this.walletChipEl.textContent = `🪙 ${wallet.solidarityTokens} ST`;
        this.walletChipEl.hidden = false;
      })
      .catch(() => {
        // Not signed in or server unreachable — keep the chip hidden.
        this.walletChipEl.hidden = true;
      });
  }

  private fetchPulseBadge(): void {
    fetch('/api/v1/district/resilience')
      .then(r => r.ok ? r.json() : null)
      .then((data: { globalIndex?: number; message?: string } | null) => {
        if (!data || data.globalIndex === undefined) return;
        const idx = data.globalIndex;
        const dot = idx >= 70 ? '🟢' : idx >= 50 ? '🟡' : '🔴';
        const tier = idx >= 70 ? 'high' : idx >= 50 ? 'mid' : 'low';
        this.pulseBadgeEl.innerHTML = `
          <span class="pulse-dot">${dot}</span>
          <span class="pulse-label">District Pulse</span>
        `;
        this.pulseBadgeEl.dataset['tier'] = tier;
        this.pulseBadgeEl.hidden = false;
        this.pulseBadgeEl.setAttribute('title', `District Solidarity: ${Math.round(idx)}% — ${data.message ?? ''}`);
      })
      .catch(() => { /* silently skip if API unreachable */ });
  }

  private onEndDay(_root: HTMLElement): void {
    const state = useGameStore.getState();
    const pulse = state.pulseState;
    const day = state.meta.day;
    const classRole = state.player.classRole ?? 'pip';

    const NPC_QUOTES: Record<string, string[]> = {
      pip:    ["Another day grinding the gig economy. At least the kitchen's still open.", "Courier pay dropped again. Solidarity or bust.", "My bike needs fixing. Community tool library would help."],
      morgan: ["Commute took two hours again. This city grinds people down.", "Fell asleep on the train. Again. The Solar Co-op is the only good news.", "Somebody organized a carpool. Small things matter."],
      arthur: ["The tenants asked about a rent freeze again. I should listen.", "Vacancy is up on the block. Something needs to change.", "Ran into old neighbours. More community here than I thought."],
    };
    const quotes = NPC_QUOTES[classRole];
    const npcQuote = quotes[day % quotes.length];

    const foodIdx = pulse?.multipliers.food ?? 1.0;
    const energyIdx = pulse?.multipliers.energy ?? 1.0;

    let headline = 'District Holds Steady Amid Economic Pressure';
    if (foodIdx > 1.2) headline = 'Food Prices Surge: Kitchen Coalition Responds';
    else if (energyIdx > 1.2) headline = 'Energy Costs Spike — Solar Co-op Sees New Members';
    else if (foodIdx < 0.95) headline = 'Seasonal Abundance: Community Fridge Overflows';

    this.broadsheet.open({
      headline,
      subheadline: 'Neighbours, we weather this together. Every act of solidarity counts.',
      npcQuote,
      npcName: { pip: 'Mira', morgan: 'Leo', arthur: 'Elena' }[classRole] ?? 'Mira',
      foodIndex: foodIdx,
      energyIndex: energyIdx,
      dayNumber: day,
    }, () => advanceDay());
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
    const { meta, player, commons, pulseState } = state;

    if (meta.phase === 'select') {
      this.el.hidden = true;
      this.endDayBtn.hidden = true;
      this.settingsBtn.hidden = true;
      this.shareBtn.hidden = true;
      this.radioBtn.hidden = true;
      this.muteBtn.hidden = true;
      this.questBtn.hidden = true;
      this.builderBtn.hidden = true;
      this.pluginsBtn.hidden = true;
      this.shopBtn.hidden = true;
      this.socialBtn.hidden = true;
      return;
    }

    this.el.hidden = false;
    this.endDayBtn.hidden = false;
    this.settingsBtn.hidden = false;
    this.shareBtn.hidden = false;
    this.radioBtn.hidden = false;
    this.muteBtn.hidden = false;
    this.questBtn.hidden = false;
    this.builderBtn.hidden = false;
    this.pluginsBtn.hidden = false;
    this.shopBtn.hidden = false;
    this.socialBtn.hidden = false;
    // pulseBadgeEl / walletChipEl visibility controlled by their own fetch responses

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

    // Economic barometer chip
    if (pulseState) {
      const f = pulseState.multipliers.food;
      const e = pulseState.multipliers.energy;
      const fClass = f > 1.15 ? 'baro--high' : f < 0.95 ? 'baro--low' : 'baro--ok';
      const eClass = e > 1.15 ? 'baro--high' : e < 0.95 ? 'baro--low' : 'baro--ok';
      const fSign = f >= 1 ? '+' : '';
      const eSign = e >= 1 ? '+' : '';
      this.barometerEl.innerHTML = `
        <span class="baro-chip ${fClass}" title="Food price index">🧺 ${fSign}${Math.round((f - 1) * 100)}%</span>
        <span class="baro-chip ${eClass}" title="Energy price index">⚡ ${eSign}${Math.round((e - 1) * 100)}%</span>
      `;
      this.barometerEl.hidden = false;
    } else {
      this.barometerEl.hidden = true;
    }
  }
}
