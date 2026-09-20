import { inputManager } from '../world/InputManager';
import { fetchDailyNarrative } from '../api/narrativeGossip';
import { bindEscapeClose } from './modalDismiss';

/**
 * M40 §3 — EPIC-33. The upcycled computer's genuine in-world affordance
 * (not a trophy item with no effect): a simple terminal/BBS reading of the
 * same daily-narrative feed `BroadsheetModal`/`TopHUD` already fetch, framed
 * as a scrolling BBS log instead of a newspaper. Reuses `fetchDailyNarrative()`
 * as-is (already offline-safe — returns an empty scenario list on failure,
 * see narrativeGossip.ts) rather than adding a second network path.
 */
export class TerminalModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;

  constructor(root: HTMLElement, private readonly onClose?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.renderLoading();

    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });

    this.disposeEscape = bindEscapeClose(() => this.close());

    void this.load();
  }

  private renderLoading(): void {
    this.el.innerHTML = `
      <div class="settings-panel terminal-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🖥 BBS TERMINAL v0.9</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body terminal-body">
          <p class="terminal-line">&gt; connecting to district dispatch feed...</p>
        </div>
      </div>
    `;
    this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());
  }

  private async load(): Promise<void> {
    const { scenarios, source } = await fetchDailyNarrative();

    const lines = scenarios.length > 0
      ? scenarios.map(s => `<p class="terminal-line">&gt; [${s.archetype}] ${s.title}</p>`).join('')
      : '<p class="terminal-line">&gt; no signal — dispatch feed unreachable, try again tomorrow</p>';

    this.el.innerHTML = `
      <div class="settings-panel terminal-panel interactive">
        <div class="settings-header">
          <span class="settings-title">🖥 BBS TERMINAL v0.9</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body terminal-body">
          <p class="terminal-line">&gt; connection established (source: ${source})</p>
          <p class="terminal-line">&gt; district dispatch — today's wire:</p>
          ${lines}
          <p class="terminal-line terminal-cursor">&gt; _</p>
        </div>
      </div>
    `;
    this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());
  }

  private close(): void {
    this.el.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    this.disposeEscape();
    setTimeout(() => {
      this.el.remove();
      this.onClose?.();
    }, 200);
  }
}
