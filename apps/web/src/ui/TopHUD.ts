import { useGameStore, type GameState } from '../core/state/useGameStore';
import { advanceDay } from '../core/state/actions';
import { SettingsModal } from './SettingsModal';
import { QuestModal } from './QuestModal';
import { WorkModal } from './WorkModal';
import { openShareSheet } from './ShareModal';
import { BroadsheetModal } from './BroadsheetModal';
import { RadioWidget } from './RadioWidget';
import { DistrictBuilderModal } from './DistrictBuilderModal';
import { PluginManagerModal } from './PluginManagerModal';
import { ShopModal } from './ShopModal';
import { SocialHubModal } from './SocialHubModal';
import { CivicTickerWidget } from './CivicTickerWidget';
import { CivicDirectoryModal } from './CivicDirectoryModal';
import { CivicJournal } from '../irl/CivicJournal';
import { getWallet } from '../api/endpoints/shop';
import { fetchDailyNarrative } from '../api/narrativeGossip';
import { setBGMMuted, isBGMMuted } from '../core/audio/SoundSynth';
import type { Kernel, HudSink } from '../core/kernel/Kernel';
import type { KernelHudButtonDescriptor } from '@district-cg/shared-types';

interface HudButtonEntry {
  descriptor: KernelHudButtonDescriptor;
  el: HTMLButtonElement;
}

export class TopHUD implements HudSink {
  private el: HTMLElement;
  private statsEl: HTMLElement;
  private zoneEl: HTMLElement;
  private barometerEl: HTMLElement;
  private pulseBadgeEl: HTMLElement;
  private actionButton: HTMLButtonElement | null = null;
  private actionHandler: (() => void) | null = null;
  private endDayBtn: HTMLButtonElement;
  private walletChipEl: HTMLElement;
  private iconToolbarEl!: HTMLElement;
  private broadsheet: BroadsheetModal;
  private radio: RadioWidget;
  private civicTicker: CivicTickerWidget;
  private scene?: Phaser.Scene;

  /** Icon buttons registered via `registerButton()` — TopHUD's own built-ins plus anything a kernel plugin adds later. */
  private buttons: HudButtonEntry[] = [];

  constructor(root: HTMLElement, kernel: Kernel, scene?: Phaser.Scene) {
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

    // M28 — every icon button used to be individually `position: absolute`
    // with a hand-picked `right` offset (see style.css history); several
    // buttons (settings/share/mute/work/builder, plus the mistyped
    // `plugins-open-btn`) never got one at all, and the ones that did had
    // drifted into overlapping at the current 2.75rem touch-target size.
    // Buttons now flow inside this single flex row instead.
    this.iconToolbarEl = document.createElement('div');
    this.iconToolbarEl.id = 'hud-icon-toolbar';
    root.appendChild(this.iconToolbarEl);

    // Broadsheet + radio instances (persistent, opened on demand)
    this.broadsheet = new BroadsheetModal(root);
    this.civicTicker = new CivicTickerWidget(root);
    this.radio = new RadioWidget(root, () => this.civicTicker.getHeadlines());

    // End Day button — shows broadsheet first, then advances day on close
    this.endDayBtn = document.createElement('button');
    this.endDayBtn.type = 'button';
    this.endDayBtn.className = 'end-day-btn interactive';
    this.endDayBtn.textContent = 'End Day';
    this.endDayBtn.setAttribute('aria-label', 'End day and view morning dispatch');
    this.endDayBtn.hidden = true;
    this.endDayBtn.addEventListener('click', () => void this.onEndDay(root));
    root.appendChild(this.endDayBtn);

    // Built-in icon-button toolbar — same icons/labels/behavior as before,
    // now going through the same registerButton() path a kernel plugin uses.
    this.registerButton({
      id: 'settings', icon: '⚙', label: 'Settings',
      onClick: () => { new SettingsModal(root, this.scene); },
    });
    this.registerButton({
      id: 'share', icon: '📣', label: 'Share progress',
      onClick: () => openShareSheet(root),
    });
    this.registerButton({
      id: 'radio', icon: '📻', label: 'Open Radio Free Commons',
      onClick: () => this.radio.show(),
    });
    const muteBtn = this.registerButton({
      id: 'mute', icon: '🔊', label: 'Toggle music',
      onClick: () => {
        const muted = !isBGMMuted();
        setBGMMuted(muted);
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
      },
    });
    this.registerButton({
      id: 'quest', icon: '📋', label: 'Daily Quests',
      onClick: () => new QuestModal(root),
    });
    this.registerButton({
      id: 'work', icon: '💼', label: 'Work — trade energy for cash',
      onClick: () => new WorkModal(root),
    });
    this.registerButton({
      id: 'builder', icon: '🏗️', label: 'Open Living District Builder',
      onClick: () => new DistrictBuilderModal(root),
    });
    this.registerButton({
      id: 'plugins', icon: '🧩', label: 'Open Plugin Library',
      onClick: () => new PluginManagerModal(root),
    });
    this.registerButton({
      id: 'shop', icon: '🏪', label: 'Open the Commons Bazaar',
      onClick: () => new ShopModal(root, () => this.fetchWalletBalance()),
    });
    this.registerButton({
      id: 'social', icon: '🤝', label: 'Open Common Grounds',
      onClick: () => new SocialHubModal(root),
    });
    this.registerButton({
      id: 'civic', icon: '📖', label: 'Open Found a Commons directory',
      onClick: () => new CivicDirectoryModal(root),
    });
    this.registerButton({
      id: 'journal', icon: '📓', label: 'Open Civic Journal — log a real-world deed',
      onClick: () => new CivicJournal(root),
    });

    // Solidarity Token wallet balance chip (only shown once fetched for a signed-in user)
    this.walletChipEl = document.createElement('div');
    this.walletChipEl.className = 'hud-wallet-chip';
    this.walletChipEl.hidden = true;
    root.appendChild(this.walletChipEl);

    // Kernel plugins (geo-weather/mesh-comms/mutual-credit, etc.) register
    // their own HUD buttons through this sink during kernel.boot().
    kernel.attachHudSink(this);

    this.render(useGameStore.getState());
    useGameStore.subscribe(s => this.render(s));

    // Fetch district resilience badge (non-blocking)
    this.fetchPulseBadge();
    this.fetchWalletBalance();
  }

  /** HudSink implementation — used both for TopHUD's own built-ins above and for kernel plugins registering later. */
  registerButton(descriptor: KernelHudButtonDescriptor): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${descriptor.className ?? `${descriptor.id}-open-btn`} interactive`;
    btn.textContent = descriptor.icon;
    btn.setAttribute('aria-label', descriptor.label);
    btn.hidden = useGameStore.getState().meta.phase === 'select';
    btn.addEventListener('click', () => descriptor.onClick());
    this.iconToolbarEl.appendChild(btn);
    this.buttons.push({ descriptor, el: btn });
    return btn;
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

  private async onEndDay(_root: HTMLElement): Promise<void> {
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

    // M9 follow-up (2026-09-15): try the real AI narrative pipeline first —
    // this is the Broadsheet's actual showcase surface for it, not just the
    // NPC gossip mill. Falls back to the hardcoded index-threshold templates
    // (unchanged) when the pipeline is offline/empty, with no citation pill.
    const narrative = await fetchDailyNarrative();
    const topScenario = narrative.scenarios[0];

    let headline: string;
    let subheadline: string;
    let source: string | undefined;
    if (topScenario) {
      headline = topScenario.title;
      subheadline = topScenario.context;
      source = narrative.source;
    } else {
      headline = 'District Holds Steady Amid Economic Pressure';
      if (foodIdx > 1.2) headline = 'Food Prices Surge: Kitchen Coalition Responds';
      else if (energyIdx > 1.2) headline = 'Energy Costs Spike — Solar Co-op Sees New Members';
      else if (foodIdx < 0.95) headline = 'Seasonal Abundance: Community Fridge Overflows';
      subheadline = 'Neighbours, we weather this together. Every act of solidarity counts.';
    }

    this.broadsheet.open({
      headline,
      subheadline,
      source,
      npcQuote,
      npcName: { pip: 'Mira', morgan: 'Leo', arthur: 'Elena' }[classRole] ?? 'Mira',
      foodIndex: foodIdx,
      energyIndex: energyIdx,
      dayNumber: day,
      civicHeadlines: this.civicTicker.getHeadlines(),
    }, () => advanceDay());
  }

  /** M28 — every context action is triggered by the same [E] key
   *  (`WorldScene`'s `actionKey`/`spaceKey`), but call sites used to embed
   *  "[E]" in their label string inconsistently (some did, most didn't).
   *  The keybind badge is now built here once, so every action gets one
   *  automatically with zero per-call-site duplication. */
  public setAction(label: string, handler: () => void): void {
    if (!this.actionButton) {
      this.actionButton = document.createElement('button');
      this.actionButton.type = 'button';
      this.actionButton.className = 'context-action-button interactive';
      document.getElementById('ui-root')?.appendChild(this.actionButton);
    }
    this.actionHandler = handler;
    this.actionButton.innerHTML = '';
    const labelEl = document.createElement('span');
    labelEl.className = 'action-label';
    labelEl.textContent = label;
    const keyHint = document.createElement('kbd');
    keyHint.className = 'key-hint';
    keyHint.textContent = 'E';
    this.actionButton.append(labelEl, keyHint);
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
    const isSelect = meta.phase === 'select';

    this.el.hidden = isSelect;
    this.endDayBtn.hidden = isSelect;
    this.civicTicker.setVisible(!isSelect);
    for (const { el } of this.buttons) {
      el.hidden = isSelect;
    }
    // pulseBadgeEl / walletChipEl visibility controlled by their own fetch responses

    if (isSelect) return;

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
