import { useGameStore, type GameState } from '../core/state/useGameStore';
import { advanceDay, abandonWorldQuest, setOwnedShopItems } from '../core/state/actions';
import { statusWarnings, describeDayReport } from './hudStatus';
import { SignInPrompt } from './SignInPrompt';
import { GoalsModal } from './GoalsModal';
import { TutorialCoach } from './TutorialCoach';
import { getToken } from '../core/state/persistence';
import { SettingsModal } from './SettingsModal';
import { QuestModal } from './QuestModal';
import { WorkModal } from './WorkModal';
import { openShareSheet } from './ShareModal';
import { BroadsheetModal } from './BroadsheetModal';
import { showMorningLedger } from './MorningLedger';
import { attachStatPops } from './StatPops';
import { attachBuildCelebrations } from './BuildCelebration';
import { RadioWidget } from './RadioWidget';
import { DistrictBuilderModal } from './DistrictBuilderModal';
import { PluginManagerModal } from './PluginManagerModal';
import { ShopModal } from './ShopModal';
import { CraftingModal } from './CraftingModal';
import { WorldMapModal } from './WorldMapModal';
import { SocialHubModal } from './SocialHubModal';
import { CivicTickerWidget } from './CivicTickerWidget';
import { CivicDirectoryModal } from './CivicDirectoryModal';
import { CivicJournal } from '../irl/CivicJournal';
import { ProximityVisitModal } from './ProximityVisitModal';
import { getWorldQuestDefinition } from '../core/simulation/WorldQuests';
import { getWallet, getInventory } from '../api/endpoints/shop';
import { fetchDailyNarrative } from '../api/narrativeGossip';
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
  private objectiveEl: HTMLElement;
  private statusEl: HTMLElement;
  private lastObjectiveId: string | null = null;
  private barometerEl: HTMLElement;
  private pulseBadgeEl: HTMLElement;
  private actionButton: HTMLButtonElement | null = null;
  private actionHandler: (() => void) | null = null;
  private endDayBtn: HTMLButtonElement;
  private walletChipEl: HTMLElement;
  private iconToolbarEl!: HTMLElement;
  private settingsBtnEl!: HTMLButtonElement;
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

    // M35 — EPIC-31 §3. A persistent "current objective" indicator, visible
    // without opening a modal (distinct from QuestModal's daily-buff list),
    // in the same passive-readout spirit as zoneEl/barometerEl above.
    // Degrades to hidden (never an error) when no WorldQuest is active —
    // see render()'s own null-check.
    this.objectiveEl = document.createElement('div');
    this.objectiveEl.id = 'hud-objective';
    this.objectiveEl.hidden = true;
    this.el.appendChild(this.objectiveEl);
    // 2026-09-29 launch audit §1.6 — a quest could lock the only quest slot
    // for hundreds of days. Two-step "drop" so it can't be hit by accident.
    this.objectiveEl.addEventListener('click', e => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.hud-objective-drop');
      if (!btn) return;
      if (btn.dataset['confirm'] === '1') {
        abandonWorldQuest();
      } else {
        btn.dataset['confirm'] = '1';
        btn.textContent = 'Drop quest?';
      }
    });

    // Consequence warnings (stress, starving, sleeping rough) — D2.
    this.statusEl = document.createElement('div');
    this.statusEl.id = 'hud-status';
    this.statusEl.setAttribute('role', 'status');
    this.statusEl.hidden = true;
    this.el.appendChild(this.statusEl);

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
    // buttons (settings/share/work/builder, plus the mistyped
    // `plugins-open-btn`) never got one at all, and the ones that did had
    // drifted into overlapping at the current 2.75rem touch-target size.
    // Buttons now flow inside this single flex row instead.
    //
    // Bugfix (post-M31 revert): M31 had moved every in-game shortcut but
    // Settings/Radio/Quest/Work behind a ☰ drawer, and put Settings in the
    // same row as those gameplay shortcuts — reported as "burger menu has
    // ingame items and settings mixed together; ingame items should be on
    // screen directly, settings hidden in its own menu." Every in-game
    // shortcut now lives directly in this one always-visible, wrapping
    // toolbar; Settings is the one thing pulled out, into its own isolated
    // top-right button below, so it never mixes with gameplay shortcuts.
    this.iconToolbarEl = document.createElement('div');
    this.iconToolbarEl.id = 'hud-icon-toolbar';
    root.appendChild(this.iconToolbarEl);

    // Settings lives alone, in the top-right corner (the old ☰ menu
    // button's real estate) — deliberately separate from every gameplay
    // shortcut above, and the only icon that opens a menu rather than a
    // feature directly.
    this.settingsBtnEl = document.createElement('button');
    this.settingsBtnEl.type = 'button';
    this.settingsBtnEl.id = 'hud-settings-btn';
    this.settingsBtnEl.className = 'hud-settings-btn interactive';
    this.settingsBtnEl.textContent = '⚙';
    this.settingsBtnEl.setAttribute('aria-label', 'Open settings');
    this.settingsBtnEl.hidden = true; // render() unhides once a game is active
    this.settingsBtnEl.addEventListener('click', () => { new SettingsModal(root, this.scene); });
    this.el.appendChild(this.settingsBtnEl);

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
    // now going through the same registerButton() path a kernel plugin
    // uses. Settings is registered separately above as its own isolated
    // button, not through here — every button registered below (plus any
    // kernel plugin's) is a gameplay shortcut and lands directly in the
    // always-visible toolbar. The mute button is gone entirely — folded
    // into SettingsModal (Section 3).
    // Ordered by how often a player needs them: the core loop first, so on
    // a phone (one scrollable row) those are visible without scrolling.
    this.registerButton({
      id: 'goals', icon: '🎯', label: 'Goals — the five commons and the Safe Haven ending',
      onClick: () => new GoalsModal(root),
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
      id: 'craft', icon: '🛠', label: 'Open Crafting',
      onClick: () => new CraftingModal(root),
    });
    this.registerButton({
      id: 'builder', icon: '🏗️', label: 'Open Living District Builder',
      onClick: () => new DistrictBuilderModal(root),
    });
    this.registerButton({
      id: 'worldmap', icon: '🗺', label: 'Open World Map',
      onClick: () => new WorldMapModal(root),
    });
    this.registerButton({
      id: 'social', icon: '🤝', label: 'Open Common Grounds',
      onClick: () => getToken()
        ? new SocialHubModal(root)
        : new SignInPrompt(root, '🤝 Common Grounds', 'Friends, caravans and trades connect you with other players, so they need an account.'),
    });
    this.registerButton({
      id: 'shop', icon: '🏪', label: 'Open the Commons Bazaar',
      onClick: () => new ShopModal(root, () => this.fetchWalletBalance()),
    });
    this.registerButton({
      id: 'journal', icon: '📓', label: 'Open Civic Journal — log a real-world deed',
      onClick: () => getToken()
        ? new CivicJournal(root)
        : new SignInPrompt(root, '📓 Civic Journal', 'Real-world deeds earn Solidarity Tokens that are kept on your account.'),
    });
    this.registerButton({
      id: 'civic', icon: '📖', label: 'Open Found a Commons directory',
      onClick: () => new CivicDirectoryModal(root),
    });
    this.registerButton({
      id: 'radio', icon: '📻', label: 'Open Radio Free Commons',
      onClick: () => this.radio.show(),
    });
    this.registerButton({
      id: 'share', icon: '📣', label: 'Share progress',
      onClick: () => openShareSheet(root),
    });
    this.registerButton({
      id: 'proximity', icon: '🌐', label: 'Nearby Travelers — visit someone over the mesh',
      onClick: () => new ProximityVisitModal(root),
    });
    this.registerButton({
      id: 'plugins', icon: '🧩', label: 'Open Plugin Library',
      onClick: () => new PluginManagerModal(root),
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
    attachStatPops(root);
    attachBuildCelebrations(root);
    new TutorialCoach(root);

    // Fetch district resilience badge (non-blocking)
    this.fetchPulseBadge();
    this.fetchWalletBalance();
  }

  /**
   * HudSink implementation — used both for TopHUD's own built-in gameplay
   * shortcuts above and for kernel plugins registering later. Every button
   * lands directly in the always-visible bottom-right toolbar (it already
   * wraps to fit any screen width) — nothing is hidden behind a menu.
   * Settings is deliberately not registered through here; it's its own
   * isolated top-right button, set up in the constructor.
   */
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
    if (!getToken()) {
      this.walletChipEl.hidden = true;
      return;
    }
    // Owned Bazaar items drive in-game effects (core/shop/ShopEffects.ts).
    getInventory().then(inv => setOwnedShopItems(inv.ownedItemIds)).catch(() => { /* keep last known */ });
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
    }, () => {
      const report = advanceDay();
      showMorningLedger(document.getElementById('ui-root') ?? document.body, report, describeDayReport(report));
    });
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

  /** M28 — lets a clickable world object (the NPC/node "bounce bubble",
   *  InteractionPrompt.ts) fire whatever context action is currently
   *  active, without duplicating handleInteractions()'s proximity/priority
   *  logic. A no-op when no action is currently set (e.g. a modal is open,
   *  or the bubble that was clicked is no longer the nearest interactable). */
  public triggerAction(): void {
    if (this.actionButton?.hidden) return;
    this.actionHandler?.();
  }

  public setZone(zone: string): void {
    this.zoneEl.textContent = zone;
  }

  private render(state: GameState): void {
    const { meta, player, commons, pulseState } = state;
    const isSelect = meta.phase === 'select';

    this.el.hidden = isSelect;
    this.endDayBtn.hidden = isSelect;
    this.settingsBtnEl.hidden = isSelect;
    this.civicTicker.setVisible(!isSelect);
    for (const { el } of this.buttons) {
      el.hidden = isSelect;
    }
    // pulseBadgeEl / walletChipEl visibility controlled by their own fetch responses

    if (isSelect) return;

    // M48 — EPIC-36 §1. The HUD badge now reflects the player's own chosen
    // name (set in the origin flow) instead of the fixed archetype label —
    // falls back to the classRole label only for a save/state that somehow
    // predates M48's defensive merge (should never happen in practice,
    // since CharacterSelect.ts always sets *some* name, custom or default).
    const roleLabel = player.classRole
      ? { pip: 'Pip', morgan: 'Morgan', arthur: 'Arthur' }[player.classRole] ?? '?'
      : '?';
    const displayName = player.name || roleLabel;

    const energyPct = Math.round((player.energy / player.maxEnergy) * 100);
    const stressClass = player.stressLevel > 74 ? ' hud-stat--danger' : player.stressLevel > 49 ? ' hud-stat--warn' : '';
    const stressTitle = 'Stress: at 75%+ you sleep badly (less energy); at 100% you break down and lose a day.';

    this.statsEl.innerHTML = `
      <div class="hud-row hud-top">
        <span class="hud-badge" title="${displayName}">${displayName[0]}</span>
        <span class="hud-day">Day ${meta.day}</span>
        <div class="hud-res-bar" title="${commons.resilienceScore}% resilience">
          <div class="hud-res-fill" style="width:${commons.resilienceScore}%"></div>
        </div>
        <span class="hud-res-pct" data-stat="resilience">${commons.resilienceScore}%</span>
      </div>
      <div class="hud-row hud-stats">
        <span class="hud-stat" data-stat="cash">💰 $${player.cash}</span>
        <span class="hud-stat hud-energy-stat" data-stat="energy">⚡<span class="hud-ebar"><span class="hud-ebar-fill" style="width:${energyPct}%"></span></span>${player.energy}</span>
        <span class="hud-stat" data-stat="trust">🤝 ${player.socialTrust}</span>
        <span class="hud-stat${stressClass}" data-stat="stress" title="${stressTitle}">😰 ${player.stressLevel}%</span>
      </div>
    `;

    // M35 — EPIC-31 §3. Reflects `worldQuests.activeId` directly off the
    // store on every render, same as every other chip here — never a
    // separately-tracked UI-only copy that could drift from real state.
    const activeQuest = state.worldQuests.activeId ? getWorldQuestDefinition(state.worldQuests.activeId) : undefined;
    if (activeQuest) {
      // Re-rendered only when the quest changes, so a pending "Drop
      // quest?" confirmation survives unrelated stat updates.
      if (this.lastObjectiveId !== activeQuest.id) {
        this.objectiveEl.innerHTML = `
          <span class="hud-objective-icon">${activeQuest.icon}</span>
          <span class="hud-objective-title">${activeQuest.title}</span>
          <button class="hud-objective-drop interactive" type="button" title="Drop this quest (you can pick it up again later)">✕</button>
        `;
        this.lastObjectiveId = activeQuest.id;
      }
      this.objectiveEl.hidden = false;
    } else {
      this.lastObjectiveId = null;
      this.objectiveEl.hidden = true;
    }

    const warnings = statusWarnings(state);
    this.statusEl.innerHTML = warnings.map(w => `<p class="hud-status-line">${w}</p>`).join('');
    this.statusEl.hidden = warnings.length === 0;

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
