import { useGameStore, type GameState } from '../core/state/useGameStore';
import { addTrust, loseTrust, gainCash, spendCash, spendEnergy, addStress, reduceStress, adjustResilience, addBuildBuff } from '../core/state/actions';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';

/** What a vote option does — data, so the card shows exactly what applies. */
export interface PolicyEffects {
  cash?: number;
  energy?: number;
  trust?: number;
  stress?: number;
  resilience?: number;
  /** Added to the construction speed buff (capped with the crisis buff). */
  buildBuff?: number;
}

interface PolicyOption {
  label: string;
  description: string;
  effects: PolicyEffects;
}

interface PolicyVote {
  id: string;
  question: string;
  optionA: PolicyOption;
  optionB: PolicyOption;
}

const ASSEMBLY_INTERVAL = 30;

// 2026-09-29 launch audit §1.7 — descriptions only promise what `effects`
// actually does (they used to mention an energy cost and faster
// construction that never happened).
export const POLICIES: PolicyVote[] = [
  {
    id: 'rent-control',
    question: 'The district assembly proposes a voluntary rent freeze for one season.',
    optionA: {
      label: 'Support the freeze',
      description: 'Tenants gain stability, and neighbours notice who stood with them.',
      effects: { trust: 15, resilience: 3 },
    },
    optionB: {
      label: 'Oppose — protect property owners',
      description: 'Rents keep rising. You pocket a little; neighbours remember.',
      effects: { cash: 20, trust: -10, resilience: -3 },
    },
  },
  {
    id: 'commons-fund',
    question: 'A community fund would tax commercial properties to subsidize commons build nodes.',
    optionA: {
      label: 'Fund the commons',
      description: 'You chip into the levy, and every build goes 10% faster from now on.',
      effects: { cash: -10, trust: 10, stress: -5, buildBuff: 0.1 },
    },
    optionB: {
      label: 'Reject the tax',
      description: 'You keep your money; the worry about the district stays.',
      effects: { cash: 5, stress: 5 },
    },
  },
  {
    id: 'mutual-aid-mandate',
    question: 'The assembly votes on a voluntary mutual aid pledge — commit 2 hours/week to neighbours.',
    optionA: {
      label: 'Take the pledge',
      description: 'It takes energy and adds a little strain, but trust surges.',
      effects: { energy: -10, trust: 20, stress: 5 },
    },
    optionB: {
      label: 'Decline',
      description: 'You protect your time. Others carry the load.',
      effects: { trust: -5 },
    },
  },
];

export function canAffordPolicy(effects: PolicyEffects, player: Pick<GameState['player'], 'cash' | 'energy'>): boolean {
  return player.cash >= Math.max(0, -(effects.cash ?? 0)) && player.energy >= Math.max(0, -(effects.energy ?? 0));
}

export function applyPolicyEffects(e: PolicyEffects): void {
  if (e.cash && e.cash > 0) gainCash(e.cash);
  if (e.cash && e.cash < 0) spendCash(-e.cash);
  if (e.energy && e.energy < 0) spendEnergy(-e.energy);
  if (e.trust && e.trust > 0) addTrust(e.trust);
  if (e.trust && e.trust < 0) loseTrust(-e.trust);
  if (e.stress && e.stress > 0) addStress(e.stress);
  if (e.stress && e.stress < 0) reduceStress(-e.stress);
  if (e.resilience) adjustResilience(e.resilience);
  if (e.buildBuff) addBuildBuff(e.buildBuff);
}

function effectChips(e: PolicyEffects): string {
  const chips: string[] = [];
  const chip = (v: number | undefined, label: string, goodWhenUp = true) => {
    if (!v) return;
    const good = goodWhenUp ? v > 0 : v < 0;
    chips.push(`<span class="delta-chip ${good ? 'delta--pos' : 'delta--neg'}">${v > 0 ? '+' : ''}${v} ${label}</span>`);
  };
  chip(e.cash, 'Cash');
  chip(e.energy, 'Energy');
  chip(e.trust, 'Trust');
  chip(e.resilience, 'Resilience');
  chip(e.stress, 'Stress', false);
  if (e.buildBuff) chips.push(`<span class="delta-chip delta--pos">🌱 +${Math.round(e.buildBuff * 100)}% build speed</span>`);
  return chips.join('');
}

export class TownHallAssembly {
  private readonly el: HTMLElement;
  private readonly onClose: () => void;
  private voteIndex = 0;
  private readonly disposeEscape: () => void;
  private readonly votes: PolicyVote[];

  constructor(root: HTMLElement, onClose: () => void) {
    this.onClose = onClose;
    this.votes = [...POLICIES].sort(() => Math.random() - 0.5).slice(0, 3);

    this.el = document.createElement('div');
    this.el.className = 'town-hall-overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'assembly-title');
    root.appendChild(this.el);

    inputManager.setLocked(true);
    // M31 — was a bespoke window keydown listener (same shape as the bug
    // bindEscapeClose was built to fix elsewhere); switched to the shared
    // helper as part of also giving this modal a visible × (see renderVote()).
    this.disposeEscape = bindEscapeClose(() => this.close());

    this.renderVote();
  }

  /** Check if assembly should open today. Call from advanceDay. */
  static shouldOpen(): boolean {
    const { meta } = useGameStore.getState();
    const last = (meta as Record<string, unknown>)['lastAssemblyDay'] as number ?? 0;
    return meta.phase === 'playing' && (meta.day - last) >= ASSEMBLY_INTERVAL;
  }

  private renderVote(): void {
    const vote = this.votes[this.voteIndex];
    if (!vote) { this.close(); return; }

    const state = useGameStore.getState();
    const day = state.meta.day;
    const total = this.votes.length;

    this.el.innerHTML = `
      <div class="assembly-panel">
        <button class="assembly-close" type="button" aria-label="Close">×</button>
        <h2 id="assembly-title" class="assembly-title">🏛 Town Hall Assembly — Day ${day}</h2>
        <p class="assembly-progress">Vote ${this.voteIndex + 1} of ${total}</p>
        <p class="assembly-question">${vote.question}</p>
        <div class="assembly-choices">
          ${this.optionButton('a', vote.optionA, state.player)}
          ${this.optionButton('b', vote.optionB, state.player)}
        </div>
      </div>
    `;

    this.el.querySelector<HTMLButtonElement>('.assembly-btn--a')?.addEventListener('click', () => this.onVote(vote, 'a'));
    this.el.querySelector<HTMLButtonElement>('.assembly-btn--b')?.addEventListener('click', () => this.onVote(vote, 'b'));
    this.el.querySelector<HTMLButtonElement>('.assembly-close')?.addEventListener('click', () => this.close());
    this.el.querySelector<HTMLButtonElement>('.assembly-btn--a')?.focus();
  }

  private optionButton(key: 'a' | 'b', option: PolicyOption, player: GameState['player']): string {
    const affordable = canAffordPolicy(option.effects, player);
    return `
          <button class="assembly-btn assembly-btn--${key} interactive" type="button"${affordable ? '' : ' disabled'}>
            <strong>${option.label}</strong>
            <span class="assembly-desc">${option.description}</span>
            <span class="crisis-btn-deltas">${effectChips(option.effects)}</span>
            ${affordable ? '' : '<span class="crisis-btn-blocked">You can\'t afford this right now</span>'}
          </button>`;
  }

  private onVote(vote: PolicyVote, choice: 'a' | 'b'): void {
    const option = choice === 'a' ? vote.optionA : vote.optionB;
    if (!canAffordPolicy(option.effects, useGameStore.getState().player)) return;
    applyPolicyEffects(option.effects);

    // Log to historyLog
    const day = useGameStore.getState().meta.day;
    useGameStore.setState(s => ({
      crisisState: {
        ...s.crisisState,
        historyLog: [...s.crisisState.historyLog, {
          id: `assembly-${vote.id}`,
          day,
          choice: choice === 'a' ? 'solidarity' : 'scapegoat',
          summary: `Assembly: ${vote.question.slice(0, 60)} → ${option.label}`,
        }],
      },
    }));

    this.voteIndex++;
    if (this.voteIndex >= this.votes.length) {
      this.close();
    } else {
      this.renderVote();
    }
  }

  private close(): void {
    // Record assembly day
    useGameStore.setState(s => ({
      meta: { ...s.meta, lastAssemblyDay: s.meta.day } as typeof s.meta,
    }));
    this.disposeEscape();
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose();
  }
}
