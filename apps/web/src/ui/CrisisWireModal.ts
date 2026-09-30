import {
  resolveCrisis, getScenario, effectiveConsequences, choiceAvailability, choiceCost, SOLIDARITY_BUILD_BUFF,
} from '../core/simulation/CrisisEngine';
import type { CrisisScenario, CrisisConsequences, CrisisChoice } from '../core/simulation/CrisisEngine';
import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { TactileEffects } from '../builder/TactileEffects';

/** M31 audit note: intentionally non-dismissible (no ×/Escape) — a crisis
 *  demands a real choice, not a shrug via Escape. See EPIC-31/M31 Section 4,
 *  which also names AuthOverlay and CharacterSelect as deliberate exceptions. */
export class CrisisWireModal {
  // el assigned in constructor after guard; '!' tells tsc it's always set before use
  private el!: HTMLElement;
  private readonly onClose: () => void;
  private scenario!: CrisisScenario;

  constructor(root: HTMLElement, scenarioId: string, onClose: () => void) {
    this.onClose = onClose;

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      onClose();
      return;
    }
    this.scenario = scenario;

    this.el = document.createElement('div');
    this.el.className = 'crisis-overlay';
    this.el.innerHTML = this.buildHTML(scenario);
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('crisis-overlay--visible'));

    this.bindEvents();
  }

  private statChips(c: CrisisConsequences): string {
    const chips: string[] = [];
    // `goodWhenUp` — more cash/energy/trust/resilience is good, more stress
    // is bad. (Stress used to be coloured backwards.)
    const chip = (val: number, up: string, down: string, label: string, goodWhenUp = true) => {
      if (val === 0) return;
      const good = goodWhenUp ? val > 0 : val < 0;
      const sign = val > 0 ? `+${val}` : `${val}`;
      chips.push(`<span class="delta-chip ${good ? 'delta--pos' : 'delta--neg'}">${val > 0 ? up : down} ${sign} ${label}</span>`);
    };
    chip(c.cashDelta,       '💰', '💸', 'Cash');
    chip(c.energyDelta,     '⚡', '😓', 'Energy');
    chip(c.trustDelta,      '🤝', '💔', 'Trust');
    chip(c.resilienceDelta, '🛡', '⬇', 'Resilience');
    chip(c.stressDelta,     '😟', '😌', 'Stress', false);
    return chips.join('');
  }

  private choiceButton(key: 'A' | 'B', choice: CrisisChoice, available: boolean, forced: boolean): string {
    const solidarity = choice.type === 'solidarity';
    const cost = choiceCost(choice);
    const need = [cost.cash > 0 ? `$${cost.cash}` : '', cost.energy > 0 ? `⚡${cost.energy}` : ''].filter(Boolean).join(' and ');
    const bonus = solidarity
      ? `<span class="delta-chip delta--pos">🌱 +${Math.round(SOLIDARITY_BUILD_BUFF * 100)}% build speed</span>`
      : '';
    const note = !available
      ? `<span class="crisis-btn-blocked">You can't do this — needs ${need}</span>`
      : forced && need
        ? `<span class="crisis-btn-blocked">You can't fully pay ${need} — what you can't pay becomes stress</span>`
        : '';
    return `
          <button class="crisis-btn crisis-btn--${solidarity ? 'solidarity' : 'scapegoat'} interactive" data-choice="${key}" type="button"${available ? '' : ' disabled aria-disabled="true"'}
            aria-label="${escapeAttr(`${choice.label}: ${choice.description}`)}">
            <span class="crisis-btn-eyebrow">${solidarity ? 'Solidarity path' : 'Authoritarian path'}</span>
            <span class="crisis-btn-label">${choice.label}</span>
            <span class="crisis-btn-desc">${choice.description}</span>
            <span class="crisis-btn-deltas">${this.statChips(effectiveConsequences(choice))}${bonus}</span>
            ${note}
          </button>`;
  }

  private archetypeBadge(archetype: string | undefined): string {
    const map: Record<string, string> = {
      LABOR_TRANSIT:     '🚌 Labour',
      CLIMATE_EXTREME:   '🌡 Climate',
      HOUSING_SPECULATE: '🏠 Housing',
      FOOD_HEALTH:       '🧺 Food',
      CIVIC_DISINFO:     '📡 Disinfo',
      MIGRATION_SANCT:   '🕊 Migration',
      DIVISION_AGITATION: '⚠ Division',
    };
    const label = (archetype && map[archetype]) ?? '⚡ Crisis';
    return `<span class="crisis-archetype-badge">${label}</span>`;
  }

  private buildHTML(s: CrisisScenario): string {
    const avail = choiceAvailability(s, useGameStore.getState().player);
    return `
      <div class="crisis-panel" role="dialog" aria-modal="true" aria-labelledby="crisis-title-label">
        <div class="crisis-header-row">
          ${this.archetypeBadge(s.archetype)}
          <div class="crisis-ticker">⚡ BREAKING</div>
        </div>
        <h2 id="crisis-title-label" class="crisis-title">${s.title}</h2>
        <p class="crisis-context">${s.context}</p>
        <div class="crisis-choices">
          ${this.choiceButton('A', s.choiceA, avail.A, avail.forced)}
          ${this.choiceButton('B', s.choiceB, avail.B, avail.forced)}
        </div>
        <p class="crisis-note">Choose before the day continues — this shapes the district.</p>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const choice = btn.dataset['choice'] as 'A' | 'B';
        const chosen = choice === 'A' ? this.scenario.choiceA : this.scenario.choiceB;
        playUIClick();
        if (!resolveCrisis(choice)) return;
        // M23 §2 — same celebration chime already used for a completed build
        // stage; the authoritarian path stays silent on purpose.
        if (chosen.type === 'solidarity') {
          TactileEffects.playStageCompleteChime();
        }
        this.close();
      });
    });
  }

  private close(): void {
    this.el.classList.remove('crisis-overlay--visible');
    this.el.classList.add('crisis-overlay--out');
    inputManager.setLocked(false);
    setTimeout(() => {
      this.el.remove();
      this.onClose();
    }, 300);
  }
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
