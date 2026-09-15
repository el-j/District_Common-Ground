import { inputManager } from '../world/InputManager';

export interface DialogueChoice {
  label: string;
  next?: string | null;
}

/** M21 §8 — abstract mood token, resolved to a portrait emoji/frame here in
 * the UI layer (never a hardcoded sprite path baked into simulation state,
 * same EntityToken-style indirection the rest of the game uses). */
export type DialogueMood = 'happy' | 'tired' | 'determined';

export interface DialogueNode {
  text: string;
  responses: DialogueChoice[];
  mood?: DialogueMood;
}

export type DialogueTree = Record<string, DialogueNode>;

const MOOD_PORTRAIT: Record<DialogueMood, { emoji: string; bg: string }> = {
  happy: { emoji: '🙂', bg: '#22381f' },
  tired: { emoji: '😪', bg: '#2a2a3a' },
  determined: { emoji: '😤', bg: '#3a2420' },
};

export class DialogueOverlay {
  private readonly el: HTMLElement;
  private readonly tree: DialogueTree;
  private readonly onClose?: () => void;
  private currentKey: string;
  private typewriterTimer: number | null = null;
  private focusedChoice = 0;
  private readonly keyHandler: (e: KeyboardEvent) => void;

  constructor(root: HTMLElement, tree: DialogueTree, startKey: string, title = 'Town Talk', onClose?: () => void) {
    this.tree = tree;
    this.currentKey = startKey;
    this.onClose = onClose;

    this.el = document.createElement('div');
    this.el.className = 'dialogue-overlay';
    this.el.innerHTML = `
      <div class="dialogue-panel">
        <div class="dialogue-header">
          <span class="dialogue-title">${title}</span>
          <button class="dialogue-close" type="button" aria-label="Close dialogue">×</button>
        </div>
        <div class="dialogue-body">
          <div class="dialogue-portrait" aria-hidden="true"><span class="dialogue-portrait-emoji"></span></div>
          <div class="dialogue-content">
            <div class="dialogue-text"></div>
            <div class="dialogue-actions"></div>
          </div>
        </div>
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);

    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
    window.addEventListener('keydown', this.keyHandler);

    this.bindEvents();
    this.renderNode(this.currentKey);
  }

  private onKey(e: KeyboardEvent): void {
    const buttons = Array.from(this.el.querySelectorAll<HTMLButtonElement>('.dialogue-choice'));
    if (buttons.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.focusedChoice = (this.focusedChoice + 1) % buttons.length;
      buttons[this.focusedChoice]?.focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      this.focusedChoice = (this.focusedChoice - 1 + buttons.length) % buttons.length;
      buttons[this.focusedChoice]?.focus();
    } else if (e.key === 'Escape') {
      this.close();
    }
  }

  private bindEvents(): void {
    const closeBtn = this.el.querySelector<HTMLButtonElement>('.dialogue-close');
    closeBtn?.addEventListener('click', () => this.close());

    this.el.addEventListener('click', (event) => {
      const textEl = this.el.querySelector<HTMLElement>('.dialogue-text');
      if (event.target === textEl) {
        this.skipTypewriter();
      }
    });
  }

  private renderNode(key: string): void {
    const node = this.tree[key];
    if (!node) {
      this.close();
      return;
    }

    this.currentKey = key;
    this.focusedChoice = 0;
    const textEl = this.el.querySelector<HTMLElement>('.dialogue-text');
    const actionsEl = this.el.querySelector<HTMLElement>('.dialogue-actions');
    if (!textEl || !actionsEl) return;

    this.renderPortrait(node.mood ?? 'happy');

    textEl.textContent = '';
    actionsEl.innerHTML = '';

    this.typewriter(textEl, node.text);

    node.responses.forEach((choice, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialogue-choice';
      button.textContent = choice.label;
      if (i === 0) button.autofocus = true;
      button.addEventListener('click', () => {
        if (choice.next) {
          this.renderNode(choice.next);
          return;
        }
        this.close();
      });
      actionsEl.appendChild(button);
    });

    // Focus first choice after render
    const first = actionsEl.querySelector<HTMLButtonElement>('.dialogue-choice');
    first?.focus();
  }

  private renderPortrait(mood: DialogueMood): void {
    const portrait = this.el.querySelector<HTMLElement>('.dialogue-portrait');
    const emojiEl = this.el.querySelector<HTMLElement>('.dialogue-portrait-emoji');
    if (!portrait || !emojiEl) return;
    const visual = MOOD_PORTRAIT[mood];
    portrait.dataset['mood'] = mood;
    portrait.style.background = visual.bg;
    emojiEl.textContent = visual.emoji;
  }

  /** Test-only accessor (Test 21.5) — the currently rendered mood, read back from the DOM. */
  getCurrentMood(): string | undefined {
    return this.el.querySelector<HTMLElement>('.dialogue-portrait')?.dataset['mood'];
  }

  private typewriter(target: HTMLElement, text: string): void {
    if (this.typewriterTimer) {
      window.clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }

    target.textContent = '';
    let index = 0;
    const tick = () => {
      target.textContent = text.slice(0, index);
      index += 1;
      if (index <= text.length) {
        this.typewriterTimer = window.setTimeout(tick, 18);
      }
    };
    tick();
  }

  private skipTypewriter(): void {
    const textEl = this.el.querySelector<HTMLElement>('.dialogue-text');
    const node = this.tree[this.currentKey];
    if (!textEl || !node) return;

    if (this.typewriterTimer) {
      window.clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    textEl.textContent = node.text;
  }

  private close(): void {
    if (this.typewriterTimer) {
      window.clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
    window.removeEventListener('keydown', this.keyHandler);
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose?.();
  }
}
