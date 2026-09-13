import { resolveCrisis, getScenario } from '../core/simulation/CrisisEngine';
import type { CrisisScenario, CrisisConsequences } from '../core/simulation/CrisisEngine';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';

export class CrisisWireModal {
  // el assigned in constructor after guard; '!' tells tsc it's always set before use
  private el!: HTMLElement;
  private readonly onClose: () => void;

  constructor(root: HTMLElement, scenarioId: string, onClose: () => void) {
    this.onClose = onClose;

    const scenario = getScenario(scenarioId);
    if (!scenario) {
      onClose();
      return;
    }

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
    const chip = (val: number, pos: string, neg: string, label: string) => {
      if (val === 0) return;
      const cls = val > 0 ? 'delta--pos' : 'delta--neg';
      const sign = val > 0 ? `+${val}` : `${val}`;
      chips.push(`<span class="delta-chip ${cls}">${val > 0 ? pos : neg} ${sign} ${label}</span>`);
    };
    chip(c.cashDelta,       '💰', '💸', 'Cash');
    chip(c.energyDelta,     '⚡', '😓', 'Energy');
    chip(c.trustDelta,      '🤝', '💔', 'Trust');
    chip(c.resilienceDelta, '🛡', '⬇', 'Resilience');
    chip(c.stressDelta,     '😟', '😌', 'Stress');
    return chips.join('');
  }

  private archetypeBadge(archetype: string | undefined): string {
    const map: Record<string, string> = {
      LABOR_TRANSIT:     '🚌 Labour',
      CLIMATE_EXTREME:   '🌡 Climate',
      HOUSING_SPECULATE: '🏠 Housing',
      FOOD_HEALTH:       '🧺 Food',
      CIVIC_DISINFO:     '📡 Disinfo',
      MIGRATION_SANCT:   '🕊 Migration',
      FASCIST_AGITATION: '⚠ Fascism',
    };
    const label = (archetype && map[archetype]) ?? '⚡ Crisis';
    return `<span class="crisis-archetype-badge">${label}</span>`;
  }

  private buildHTML(s: CrisisScenario): string {
    const context = s.context.length > 220 ? s.context.slice(0, 217) + '…' : s.context;
    return `
      <div class="crisis-panel" role="dialog" aria-modal="true" aria-labelledby="crisis-title-label">
        <div class="crisis-header-row">
          ${this.archetypeBadge(s.archetype)}
          <div class="crisis-ticker">⚡ BREAKING</div>
        </div>
        <h2 id="crisis-title-label" class="crisis-title">${s.title}</h2>
        <p class="crisis-context">${context}</p>
        <div class="crisis-choices">
          <button class="crisis-btn crisis-btn--scapegoat interactive" data-choice="A" type="button"
            aria-label="${s.choiceA.label}: ${s.choiceA.description.slice(0, 80)}">
            <span class="crisis-btn-eyebrow">Authoritarian path</span>
            <span class="crisis-btn-label">${s.choiceA.label}</span>
            <span class="crisis-btn-desc">${s.choiceA.description.slice(0, 100)}…</span>
            <span class="crisis-btn-deltas">${this.statChips(s.choiceA.consequences)}</span>
          </button>
          <button class="crisis-btn crisis-btn--solidarity interactive" data-choice="B" type="button"
            aria-label="${s.choiceB.label}: ${s.choiceB.description.slice(0, 80)}">
            <span class="crisis-btn-eyebrow">Solidarity path</span>
            <span class="crisis-btn-label">${s.choiceB.label}</span>
            <span class="crisis-btn-desc">${s.choiceB.description.slice(0, 100)}…</span>
            <span class="crisis-btn-deltas">${this.statChips(s.choiceB.consequences)}</span>
          </button>
        </div>
        <p class="crisis-note">Choose before the day continues — this shapes the district.</p>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = btn.dataset['choice'] as 'A' | 'B';
        playUIClick();
        resolveCrisis(choice);
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
