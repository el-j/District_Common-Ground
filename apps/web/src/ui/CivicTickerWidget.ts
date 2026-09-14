import { getCivicTicker } from '../api/endpoints/civic';
import { useGameStore } from '../core/state/useGameStore';
import type { CivicAction } from '@district-cg/shared-types';

const REFRESH_INTERVAL_MS = 120_000;

function formatRelative(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Rolling alert ticker for upcoming civic actions, mounted persistently at the bottom of the HUD. */
export class CivicTickerWidget {
  readonly el: HTMLElement;
  private items: CivicAction[] = [];
  private lastRegion: string | null = null;
  private readonly refreshTimer: ReturnType<typeof setInterval>;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'civic-ticker';
    this.el.setAttribute('role', 'region');
    this.el.setAttribute('aria-label', 'Upcoming civic actions');
    this.el.hidden = true;
    root.appendChild(this.el);

    void this.refresh();
    this.refreshTimer = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    useGameStore.subscribe(s => {
      const region = s.meta.regionCode ?? 'GENERIC';
      if (region !== this.lastRegion) void this.refresh();
    });
  }

  private async refresh(): Promise<void> {
    const region = useGameStore.getState().meta.regionCode ?? 'GENERIC';
    this.lastRegion = region;
    try {
      this.items = await getCivicTicker(region);
    } catch {
      this.items = [];
    }
    this.render();
  }

  private render(): void {
    if (this.items.length === 0) {
      this.el.innerHTML = '';
      return;
    }
    const text = this.items
      .map(a => `📣 ${a.title} — ${a.organizer} · ${formatRelative(a.startTime)} · ${a.locationSummary}`)
      .join('   •••   ');
    this.el.innerHTML = `
      <div class="civic-ticker-track">
        <span class="civic-ticker-content">${text}</span>
        <span class="civic-ticker-content" aria-hidden="true">${text}</span>
      </div>
    `;
  }

  /** Called by TopHUD alongside its own phase-based show/hide of other widgets. */
  setVisible(visible: boolean): void {
    this.el.hidden = !visible || this.items.length === 0;
  }

  /** Condensed headline strings for embedding in the morning broadsheet. */
  getHeadlines(): string[] {
    return this.items.slice(0, 3).map(a => `${a.title} (${a.organizer}) — ${formatRelative(a.startTime)}`);
  }

  destroy(): void {
    clearInterval(this.refreshTimer);
    this.el.remove();
  }
}
