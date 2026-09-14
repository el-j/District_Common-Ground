import { setArchetype } from '../core/state/actions';
import { playUIClick } from '../core/audio/SoundSynth';
import { type ClassRole } from '../core/state/useGameStore';
import { GeoPreviewModal } from './GeoPreviewModal';

interface ArchetypeCard {
  role: ClassRole;
  name: string;
  title: string;
  description: string;
  cash: number;
  energy: number;
  trust: number;
  stress: number;
}

const ARCHETYPES: ArchetypeCard[] = [
  {
    role: 'pip',
    name: 'Pip',
    title: 'Precarious Courier',
    description: 'Gig work, no safety net, but rich in community connections.',
    cash: 25, energy: 80, trust: 40, stress: 60,
  },
  {
    role: 'morgan',
    name: 'Morgan',
    title: 'Exhausted Commuter',
    description: 'Long shifts, moderate savings, disconnected from neighbors.',
    cash: 240, energy: 40, trust: 25, stress: 45,
  },
  {
    role: 'arthur',
    name: 'Arthur',
    title: 'Solitary Landlord',
    description: 'Wealthy and insulated, but socially isolated and distrusted.',
    cash: 1200, energy: 65, trust: 10, stress: 30,
  },
];

export class CharacterSelect {
  private el: HTMLElement;
  private onComplete: () => void;

  constructor(root: HTMLElement, onComplete: () => void) {
    this.onComplete = onComplete;
    this.el = document.createElement('div');
    this.el.className = 'character-select';
    this.el.innerHTML = this.buildHTML();
    root.appendChild(this.el);
    this.bindEvents();
  }

  private buildHTML(): string {
    const cards = ARCHETYPES.map(a => `
      <button class="archetype-card" data-role="${a.role}" type="button">
        <h2 class="card-name">${a.name}</h2>
        <p class="card-title">${a.title}</p>
        <p class="card-desc">${a.description}</p>
        <dl class="card-stats">
          <dt>Cash</dt><dd>$${a.cash}</dd>
          <dt>Energy</dt><dd>${a.energy}/100</dd>
          <dt>Trust</dt><dd>${a.trust}/100</dd>
          <dt>Stress</dt><dd>${a.stress}%</dd>
        </dl>
      </button>
    `).join('');

    return `
      <div class="cs-inner">
        <h1 class="cs-title">District: Common Ground</h1>
        <p class="cs-subtitle">Choose your starting position</p>
        <div class="cs-cards">${cards}</div>
        <button class="cs-geo-preview-link" type="button">🗺️ Preview Real-World Neighborhood Mode (PoC)</button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLButtonElement>('[data-role]').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset['role'] as ClassRole;
        playUIClick();
        setArchetype(role);
        this.dismiss();
        this.onComplete();
      });
    });

    this.el.querySelector<HTMLButtonElement>('.cs-geo-preview-link')?.addEventListener('click', () => {
      playUIClick();
      new GeoPreviewModal(this.el.parentElement ?? document.body);
    });
  }

  private dismiss(): void {
    this.el.style.opacity = '0';
    this.el.style.transition = 'opacity 0.2s ease-out';
    setTimeout(() => this.el.remove(), 250);
  }
}
