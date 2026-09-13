import type { MinigameInstance, GameSessionContext } from '@district-cg/shared-types';

export interface MinigameContainerOptions {
  onClose?: (result?: { score: number; completed: boolean }) => void;
  className?: string;
}

export class MinigameContainer {
  private rootElement: HTMLElement;
  private contentElement: HTMLElement;
  private currentInstance: MinigameInstance | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private isMounted = false;

  constructor(options: MinigameContainerOptions = {}) {
    this.rootElement = document.createElement('div');
    this.rootElement.className = `minigame-container-root ${options.className ?? ''}`.trim();
    this.rootElement.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      background: rgba(10, 15, 20, 0.85);
      backdrop-filter: blur(8px);
      touch-action: none;
    `;

    // Header bar with title and close button
    const header = document.createElement('div');
    header.className = 'minigame-container-header';
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: rgba(20, 30, 40, 0.9);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    const titleEl = document.createElement('h2');
    titleEl.className = 'minigame-container-title';
    titleEl.textContent = 'District Action';
    titleEl.style.cssText = `margin: 0; font-size: 1.1rem; font-weight: 600;`;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'minigame-container-close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close Minigame';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 1.4rem;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      transition: background 0.2s;
    `;
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(239, 68, 68, 0.6)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'rgba(255, 255, 255, 0.1)'; };
    closeBtn.onclick = () => {
      if (options.onClose) {
        options.onClose();
      } else {
        void this.unmount();
      }
    };

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    this.rootElement.appendChild(header);

    // Inner game viewport
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'minigame-container-viewport';
    this.contentElement.style.cssText = `
      flex: 1;
      position: relative;
      width: 100%;
      height: calc(100% - 60px);
      overflow: hidden;
    `;
    this.rootElement.appendChild(this.contentElement);
  }

  setTitle(title: string): void {
    const titleEl = this.rootElement.querySelector('.minigame-container-title');
    if (titleEl) {
      titleEl.textContent = title;
    }
  }

  async mount(instance: MinigameInstance, context: GameSessionContext, parent: HTMLElement = document.body): Promise<void> {
    if (this.isMounted) {
      await this.unmount();
    }

    this.currentInstance = instance;
    parent.appendChild(this.rootElement);
    this.isMounted = true;

    await instance.mount(this.contentElement, context);

    if (instance.onResize) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          instance.onResize?.(width, height);
        }
      });
      this.resizeObserver.observe(this.contentElement);
    }
  }

  async unmount(): Promise<void> {
    if (!this.isMounted) return;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.currentInstance) {
      await this.currentInstance.unmount();
      this.currentInstance = null;
    }

    if (this.rootElement.parentElement) {
      this.rootElement.parentElement.removeChild(this.rootElement);
    }

    this.contentElement.innerHTML = '';
    this.isMounted = false;
  }

  getElement(): HTMLElement {
    return this.rootElement;
  }
}
