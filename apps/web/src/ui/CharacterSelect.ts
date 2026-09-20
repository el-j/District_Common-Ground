import { beginFromFamilyTemplate, setPlayerName, setPlayerGender, setPlayerAppearance, sanitizePlayerName } from '../core/state/actions';
import { playUIClick } from '../core/audio/SoundSynth';
import { FAMILY_TEMPLATES, type FamilyTemplate } from '../core/simulation/FamilyTemplates';
import type { GenderIdentity, AppearanceToken, ClassRole } from '../core/state/useGameStore';

// M48 — EPIC-36 §1. Falls back to the flavor name each family template's
// classRole already carries (the pre-M47 archetype names) if the player
// leaves the name field blank.
const DEFAULT_NAME_BY_ROLE: Record<ClassRole, string> = { pip: 'Pip', morgan: 'Morgan', arthur: 'Arthur' };

// M48 — EPIC-36 §2. Label text only — the gender identity value itself
// carries no gameplay meaning anywhere.
const GENDER_OPTIONS: { value: GenderIdentity; label: string }[] = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'self-describe', label: 'Self-describe' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

// M48 — EPIC-36 §3. Abstract appearance tokens — see useGameStore.ts's
// AppearanceToken doc comment for why no skin resolves these to real
// rendering yet (a recorded, doc-permitted scope decision, not an
// oversight). Swatch colors here are a UI affordance only, chosen for
// visual distinctness — never read by game logic.
const APPEARANCE_OPTIONS: { value: AppearanceToken; swatch: string }[] = [
  { value: 'APPEARANCE_TONE_1', swatch: '#f0c9a0' },
  { value: 'APPEARANCE_TONE_2', swatch: '#c68a5a' },
  { value: 'APPEARANCE_TONE_3', swatch: '#8a5a34' },
  { value: 'APPEARANCE_TONE_4', swatch: '#4a2f1e' },
];

/**
 * M47/M48 — EPIC-36 §2/§3. A 3-step origin flow: family template pick →
 * name/identity → confirm (with each family's members shown). Reuses the
 * existing `.archetype-card`/`.card-*`/`.cs-*` CSS classes throughout (per
 * the doc's own "reusing its existing card-based layout conventions"
 * instruction) — only a handful of new, minimal classes were needed for
 * the identity step's form controls and the confirm step's member list.
 *
 * M31 audit note carried forward unchanged: intentionally non-dismissible
 * (no ×/Escape) — this is the initial origin-choice onboarding gate, not a
 * bug. See EPIC-31/M31 Section 4.
 */
export class CharacterSelect {
  private el: HTMLElement;
  private onComplete: () => void;
  private step: 'family' | 'identity' | 'confirm' = 'family';
  private selectedTemplate: FamilyTemplate | null = null;
  private nameInput = '';
  private genderChoice: GenderIdentity = 'prefer-not-to-say';
  private genderSelfDescribeInput = '';
  private appearanceChoice: AppearanceToken = 'APPEARANCE_TONE_1';

  constructor(root: HTMLElement, onComplete: () => void) {
    this.onComplete = onComplete;
    this.el = document.createElement('div');
    this.el.className = 'character-select';
    root.appendChild(this.el);
    this.render();
  }

  private render(): void {
    if (this.step === 'family') this.el.innerHTML = this.buildFamilyStepHTML();
    else if (this.step === 'identity') this.el.innerHTML = this.buildIdentityStepHTML();
    else this.el.innerHTML = this.buildConfirmStepHTML();
    this.bindEvents();
  }

  private buildFamilyStepHTML(): string {
    const cards = FAMILY_TEMPLATES.map(t => `
      <button class="archetype-card" data-template="${t.id}" type="button">
        <h2 class="card-name">${t.familyName}</h2>
        <p class="card-title">Starting circumstance</p>
        <p class="card-desc">${t.circumstance}</p>
        <dl class="card-stats">
          <dt>Cash</dt><dd>$${t.startingStats.cash}</dd>
          <dt>Energy</dt><dd>${t.startingStats.energy}/100</dd>
          <dt>Trust</dt><dd>${t.startingStats.trust}/100</dd>
          <dt>Stress</dt><dd>${t.startingStats.stress}%</dd>
        </dl>
      </button>
    `).join('');

    return `
      <div class="cs-inner">
        <h1 class="cs-title">District: Common Ground</h1>
        <p class="cs-subtitle">You were born into one of these families. Choose where your story begins.</p>
        <div class="cs-cards">${cards}</div>
      </div>
    `;
  }

  private buildIdentityStepHTML(): string {
    const t = this.selectedTemplate;
    if (!t) return '';
    const defaultName = DEFAULT_NAME_BY_ROLE[t.classRole];

    const genderButtons = GENDER_OPTIONS.map(g => `
      <button class="cs-gender-btn ${this.genderChoice === g.value ? 'cs-gender-btn--active' : ''}" data-gender="${g.value}" type="button">
        ${g.label}
      </button>
    `).join('');

    const appearanceSwatches = APPEARANCE_OPTIONS.map(a => `
      <button
        class="cs-appearance-swatch ${this.appearanceChoice === a.value ? 'cs-appearance-swatch--active' : ''}"
        data-appearance="${a.value}" type="button" style="background:${a.swatch}"
        aria-label="Choose this appearance"
      ></button>
    `).join('');

    return `
      <div class="cs-inner">
        <h1 class="cs-title">Who are you?</h1>
        <p class="cs-subtitle">Make this character yours.</p>
        <div class="cs-identity-form">
          <label class="cs-field-label" for="cs-name-input">Name</label>
          <input class="cs-name-input" id="cs-name-input" type="text" maxlength="40" placeholder="${defaultName}" value="${this.nameInput}" />

          <span class="cs-field-label">Gender identity</span>
          <div class="cs-gender-options">${genderButtons}</div>
          ${this.genderChoice === 'self-describe' ? `
            <input class="cs-name-input" id="cs-gender-self-describe" type="text" maxlength="40"
              placeholder="Describe in your own words" value="${this.genderSelfDescribeInput}" />
          ` : ''}

          <span class="cs-field-label">Appearance</span>
          <div class="cs-appearance-options">${appearanceSwatches}</div>
        </div>
        <div class="cs-confirm-actions">
          <button class="cs-geo-preview-link" type="button" data-back>← Choose a different family</button>
          <button class="archetype-card cs-begin-btn" type="button" data-continue>Continue</button>
        </div>
      </div>
    `;
  }

  private buildConfirmStepHTML(): string {
    const t = this.selectedTemplate;
    if (!t) return '';

    const members = t.members.map(m => `
      <div class="cs-family-member">
        <span class="cs-family-member-name">${m.name}</span>
        <span class="cs-family-member-relation">${m.relation}</span>
        <p class="cs-family-member-desc">${m.description}</p>
      </div>
    `).join('');

    const displayName = sanitizePlayerName(this.nameInput) || DEFAULT_NAME_BY_ROLE[t.classRole];

    return `
      <div class="cs-inner">
        <h1 class="cs-title">${displayName}, of ${t.familyName}</h1>
        <p class="cs-subtitle">${t.circumstance}</p>
        <div class="cs-family-members">${members}</div>
        <div class="cs-confirm-actions">
          <button class="cs-geo-preview-link" type="button" data-back-identity>← Edit name & identity</button>
          <button class="archetype-card cs-begin-btn" type="button" data-begin>Begin Your Story</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-template]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset['template'] as FamilyTemplate['id'];
        playUIClick();
        this.selectedTemplate = FAMILY_TEMPLATES.find(t => t.id === id) ?? null;
        this.step = 'identity';
        this.render();
      });
    });

    this.el.querySelector<HTMLButtonElement>('[data-back]')?.addEventListener('click', () => {
      playUIClick();
      this.step = 'family';
      this.selectedTemplate = null;
      this.render();
    });

    this.el.querySelector<HTMLButtonElement>('[data-back-identity]')?.addEventListener('click', () => {
      playUIClick();
      this.step = 'identity';
      this.render();
    });

    this.el.querySelector<HTMLInputElement>('#cs-name-input')?.addEventListener('input', e => {
      this.nameInput = (e.target as HTMLInputElement).value;
    });

    this.el.querySelector<HTMLInputElement>('#cs-gender-self-describe')?.addEventListener('input', e => {
      this.genderSelfDescribeInput = (e.target as HTMLInputElement).value;
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-gender]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        this.genderChoice = btn.dataset['gender'] as GenderIdentity;
        this.render();
      });
    });

    this.el.querySelectorAll<HTMLButtonElement>('[data-appearance]').forEach(btn => {
      btn.addEventListener('click', () => {
        playUIClick();
        this.appearanceChoice = btn.dataset['appearance'] as AppearanceToken;
        this.render();
      });
    });

    this.el.querySelector<HTMLButtonElement>('[data-continue]')?.addEventListener('click', () => {
      playUIClick();
      this.step = 'confirm';
      this.render();
    });

    this.el.querySelector<HTMLButtonElement>('[data-begin]')?.addEventListener('click', () => {
      if (!this.selectedTemplate) return;
      playUIClick();
      const t = this.selectedTemplate;
      beginFromFamilyTemplate(t.id);
      setPlayerName(this.nameInput.trim() ? this.nameInput : DEFAULT_NAME_BY_ROLE[t.classRole]);
      setPlayerGender(this.genderChoice, this.genderSelfDescribeInput);
      setPlayerAppearance(this.appearanceChoice);
      this.dismiss();
      this.onComplete();
    });
  }

  private dismiss(): void {
    this.el.style.opacity = '0';
    this.el.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => this.el.remove(), 250);
  }
}
