import { useGameStore, type GameState } from '../core/state/useGameStore';

export interface TutorialStep {
  id: string;
  text: string;
  /** Advances by itself once this is true (otherwise via Next). */
  isDone?: (s: GameState) => boolean;
}

/** First-day guide (2026-09-29 launch audit §3.3). Short, skippable, saved
 *  per game, and each step moves on by itself once the player does it. */
export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  {
    id: 'welcome',
    text: '👋 Welcome to the neighbourhood! Move with WASD or the arrow keys — on a phone, drag on the left half of the screen. Press E (or the action button) to interact.',
  },
  {
    id: 'goals',
    text: '🎯 Your goal: build the five commons with your neighbours. The Goals button shows what each one does and how far along it is.',
  },
  {
    id: 'home',
    text: '🛏 Sleeping rough costs energy and adds stress. Find an apartment door 🚪 and rent a room.',
    isDone: s => s.housing.currentFlatId !== null,
  },
  {
    id: 'work',
    text: '💼 Everything you do costs ⚡ energy, and energy comes back when you sleep. Work once a day for cash; minigames and crafting pay too.',
    isDone: s => s.player.lastWorkedDay !== null,
  },
  {
    id: 'build',
    text: '🔨 Walk to a build site and give cash or energy. Neighbours add more every night to the build you last helped.',
    isDone: s => s.commons.kitchenProgress + s.commons.solarGridProgress + s.commons.legalFundProgress
      + s.commons.toolLibraryProgress > 0,
  },
  {
    id: 'end-day',
    text: '🌙 Tired? Press End Day. Watch 😰 stress: at 75% you sleep badly, at 100% you break down and lose a day. Feed Scraps 🐱 and choose solidarity to stay well.',
    isDone: s => s.meta.day > 1,
  },
];

export class TutorialCoach {
  private el: HTMLElement | null = null;
  private renderedStep = -1;

  constructor(private readonly root: HTMLElement) {
    this.sync(useGameStore.getState());
    useGameStore.subscribe(s => this.sync(s));
  }

  private sync(state: GameState): void {
    const { tutorial, meta } = state;
    if (tutorial.done || meta.phase !== 'playing') {
      this.remove();
      return;
    }
    const step = TUTORIAL_STEPS[tutorial.step];
    if (!step) {
      useGameStore.setState(s => ({ tutorial: { ...s.tutorial, done: true } }));
      return;
    }
    if (step.isDone?.(state)) {
      this.next();
      return;
    }
    if (this.renderedStep !== tutorial.step || !this.el) this.render(tutorial.step, step);
  }

  private next(): void {
    useGameStore.setState(s => {
      const step = s.tutorial.step + 1;
      return { tutorial: { step, done: step >= TUTORIAL_STEPS.length } };
    });
  }

  private render(index: number, step: TutorialStep): void {
    this.remove();
    const el = document.createElement('div');
    el.className = 'tutorial-card interactive';
    el.setAttribute('role', 'status');
    el.innerHTML = `
      <p class="tutorial-text"></p>
      <div class="tutorial-actions">
        <span class="tutorial-count">${index + 1}/${TUTORIAL_STEPS.length}</span>
        <button class="tutorial-skip" type="button">Skip guide</button>
        <button class="tutorial-next" type="button">${index === TUTORIAL_STEPS.length - 1 ? 'Got it' : 'Next'}</button>
      </div>`;
    el.querySelector('.tutorial-text')!.textContent = step.text;
    el.querySelector('.tutorial-next')!.addEventListener('click', () => this.next());
    el.querySelector('.tutorial-skip')!.addEventListener('click', () => {
      useGameStore.setState(s => ({ tutorial: { ...s.tutorial, done: true } }));
    });
    this.root.appendChild(el);
    this.el = el;
    this.renderedStep = index;
  }

  private remove(): void {
    this.el?.remove();
    this.el = null;
    this.renderedStep = -1;
  }
}
