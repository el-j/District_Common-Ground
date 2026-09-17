import { useGameStore } from '../core/state/useGameStore';
import { addTrust, loseTrust, gainCash, spendCash, addStress, reduceStress } from '../core/state/actions';
import { inputManager } from '../world/InputManager';

interface PolicyVote {
  id: string;
  question: string;
  optionA: { label: string; effect: () => void; description: string };
  optionB: { label: string; effect: () => void; description: string };
}

const ASSEMBLY_INTERVAL = 30;

const POLICIES: PolicyVote[] = [
  {
    id: 'rent-control',
    question: 'The district assembly proposes a voluntary rent freeze for one season.',
    optionA: {
      label: 'Support the freeze',
      description: 'Landlords lose short-term income; tenants gain stability. Trust rises.',
      effect: () => { addTrust(15); loseTrust(0); },
    },
    optionB: {
      label: 'Oppose — protect property owners',
      description: 'Rents rise unchecked. Displacement risk increases. Short-term cash bump.',
      effect: () => { gainCash(20); loseTrust(10); },
    },
  },
  {
    id: 'commons-fund',
    question: 'A community fund would tax commercial properties to subsidize commons build nodes.',
    optionA: {
      label: 'Fund the commons',
      description: 'Speeds construction for everyone. Costs some cash but deepens solidarity.',
      effect: () => { spendCash(10); addTrust(10); reduceStress(5); },
    },
    optionB: {
      label: 'Reject the tax',
      description: 'You protect your cash but the commons stall. Stress edges up.',
      effect: () => { gainCash(5); addStress(5); },
    },
  },
  {
    id: 'mutual-aid-mandate',
    question: 'The assembly votes on a voluntary mutual aid pledge — commit 2 hours/week to neighbours.',
    optionA: {
      label: 'Take the pledge',
      description: 'Energy cost, but block cohesion surges. The commons build faster.',
      effect: () => { addTrust(20); addStress(5); },
    },
    optionB: {
      label: 'Decline',
      description: 'You protect your time. Others carry the load. Small trust penalty.',
      effect: () => { loseTrust(5); },
    },
  },
];

export class TownHallAssembly {
  private readonly el: HTMLElement;
  private readonly onClose: () => void;
  private voteIndex = 0;
  private readonly keyHandler: (e: KeyboardEvent) => void;
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
    this.keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') this.close(); };
    window.addEventListener('keydown', this.keyHandler);

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
        <span class="assembly-esc-hint">Esc to dismiss</span>
        <h2 id="assembly-title" class="assembly-title">🏛 Town Hall Assembly — Day ${day}</h2>
        <p class="assembly-progress">Vote ${this.voteIndex + 1} of ${total}</p>
        <p class="assembly-question">${vote.question}</p>
        <div class="assembly-choices">
          <button class="assembly-btn assembly-btn--a interactive" type="button">
            <strong>${vote.optionA.label}</strong>
            <span class="assembly-desc">${vote.optionA.description}</span>
          </button>
          <button class="assembly-btn assembly-btn--b interactive" type="button">
            <strong>${vote.optionB.label}</strong>
            <span class="assembly-desc">${vote.optionB.description}</span>
          </button>
        </div>
      </div>
    `;

    this.el.querySelector<HTMLButtonElement>('.assembly-btn--a')?.addEventListener('click', () => this.onVote(vote, 'a'));
    this.el.querySelector<HTMLButtonElement>('.assembly-btn--b')?.addEventListener('click', () => this.onVote(vote, 'b'));
    this.el.querySelector<HTMLButtonElement>('.assembly-btn--a')?.focus();
  }

  private onVote(vote: PolicyVote, choice: 'a' | 'b'): void {
    const option = choice === 'a' ? vote.optionA : vote.optionB;
    option.effect();

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
    window.removeEventListener('keydown', this.keyHandler);
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose();
  }
}
