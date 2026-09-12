import { inputManager } from '../world/InputManager';

export interface DialogueChoice {
  label: string;
  next?: string | null;
}

export interface DialogueNode {
  text: string;
  responses: DialogueChoice[];
}

export type DialogueTree = Record<string, DialogueNode>;

export class DialogueOverlay {
  private readonly el: HTMLElement;
  private readonly tree: DialogueTree;
  private readonly onClose?: () => void;
  private currentKey: string;
  private typewriterTimer: number | null = null;

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
        <div class="dialogue-text"></div>
        <div class="dialogue-actions"></div>
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.bindEvents();
    this.renderNode(this.currentKey);
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
    const textEl = this.el.querySelector<HTMLElement>('.dialogue-text');
    const actionsEl = this.el.querySelector<HTMLElement>('.dialogue-actions');
    if (!textEl || !actionsEl) return;

    textEl.textContent = '';
    actionsEl.innerHTML = '';

    this.typewriter(textEl, node.text);

    node.responses.forEach((choice) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialogue-choice';
      button.textContent = choice.label;
      button.addEventListener('click', () => {
        if (choice.next) {
          this.renderNode(choice.next);
          return;
        }
        this.close();
      });
      actionsEl.appendChild(button);
    });
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
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose?.();
  }
}
