import { getLocalChapters, getCivicTicker } from '../api/endpoints/civic';
import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { buildSimplePdf, downloadPdf } from '../core/util/PdfGenerator';
import type { LocalChapter, CivicAction, LocalChapterType } from '@district-cg/shared-types';
import { bindEscapeClose } from './modalDismiss';

const TYPE_LABELS: Record<LocalChapterType, string> = {
  tool_library: '🛠️ Tool Library',
  community_fridge: '🥫 Community Fridge',
  land_trust: '🌱 Land Trust',
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Searchable directory of nearby mutual-aid chapters, plus an in-browser PDF starter kit generator. */
export class CivicDirectoryModal {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;
  private chapters: LocalChapter[] = [];
  private actions: CivicAction[] = [];
  private query = '';
  private loading = true;
  private statusMessage = '';

  constructor(root: HTMLElement, private readonly onClose?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'civic-directory-title');
    root.appendChild(this.el);

    inputManager.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.render();
    this.el.addEventListener('click', e => {
      if (e.target === this.el) this.close();
    });

    this.disposeEscape = bindEscapeClose(() => this.close());

    void this.load();
  }

  private async load(): Promise<void> {
    const region = useGameStore.getState().meta.regionCode ?? 'GENERIC';
    try {
      const [chapters, actions] = await Promise.all([getLocalChapters(region), getCivicTicker(region)]);
      this.chapters = chapters;
      this.actions = actions;
    } catch {
      this.statusMessage = 'Could not load the directory right now. Try again later.';
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private matches(c: LocalChapter): boolean {
    if (!this.query) return true;
    const q = this.query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      TYPE_LABELS[c.type].toLowerCase().includes(q)
    );
  }

  private render(): void {
    const filtered = this.chapters.filter(c => this.matches(c));
    this.el.innerHTML = `
      <div class="settings-panel civic-directory-panel interactive">
        <div class="settings-header">
          <span class="settings-title" id="civic-directory-title">📖 Found a Commons — Local Chapter Directory</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <input class="civic-search-input" type="text" placeholder="Search by name, address, or type..."
            value="${escapeHtml(this.query)}" aria-label="Search chapters" />
          ${this.loading ? '<p class="civic-directory-status">Loading nearby chapters...</p>' : ''}
          ${this.statusMessage ? `<p class="civic-directory-status">${escapeHtml(this.statusMessage)}</p>` : ''}
          <div class="civic-chapter-list">
            ${filtered
              .map(
                c => `
              <div class="civic-chapter-row">
                <div class="civic-chapter-info">
                  <span class="civic-chapter-name">${TYPE_LABELS[c.type]} — ${escapeHtml(c.name)}</span>
                  <span class="civic-chapter-meta">${escapeHtml(c.address)} · ${c.distanceKm.toFixed(1)} km away</span>
                </div>
                <a class="civic-visit-btn" href="${escapeHtml(c.websiteUrl)}" target="_blank" rel="noopener noreferrer">Directions / Info ↗</a>
              </div>
            `,
              )
              .join('') || (this.loading ? '' : '<p class="civic-directory-status">No chapters match your search.</p>')}
          </div>
          <button class="social-copy-btn civic-starter-kit-btn" type="button">📄 Download "Found a Commons" Starter Kit (PDF)</button>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());

    const input = this.el.querySelector<HTMLInputElement>('.civic-search-input');
    input?.addEventListener('input', e => {
      this.query = (e.target as HTMLInputElement).value;
      const caret = (e.target as HTMLInputElement).selectionStart;
      this.render();
      const next = this.el.querySelector<HTMLInputElement>('.civic-search-input');
      next?.focus();
      if (caret !== null) next?.setSelectionRange(caret, caret);
    });

    this.el.querySelector<HTMLButtonElement>('.civic-starter-kit-btn')?.addEventListener('click', () => {
      playUIClick();
      this.downloadStarterKit();
      playSolidarityChime();
    });
  }

  private downloadStarterKit(): void {
    const paragraphs: string[] = [
      'Found a Commons -- Organizing Starter Kit',
      '',
      'A short guide to getting a mutual-aid project going in your own neighborhood, ' +
        'inspired by the commons you have been building in District: Common Ground.',
      '',
      'Getting Started',
      '1. Find two or three neighbors who share a concern (food access, tools, housing, transit).',
      '2. Pick one small, concrete first project -- a shared tool shed, a community fridge, a tenant phone tree.',
      '3. Meet regularly, in person if you can. Keep notes. Rotate who leads.',
      '4. Ask an existing local group for advice before reinventing a wheel they already built.',
      '5. Celebrate small wins publicly -- momentum comes from visible progress, not perfection.',
      '',
      'Nearby Chapters Loaded In This Directory',
      ...this.chapters.map(c => `- ${TYPE_LABELS[c.type]}: ${c.name}, ${c.address} (${c.distanceKm.toFixed(1)} km)`),
      '',
      'Upcoming Civic Actions',
      ...this.actions.map(a => `- ${a.title} -- organized by ${a.organizer}, ${a.locationSummary}`),
      '',
      'This kit was generated by District: Common Ground. Directory entries in this build are ' +
        'illustrative placeholders, not verified real-world listings -- always confirm details directly ' +
        'with a group before showing up.',
    ];
    downloadPdf('found-a-commons-starter-kit.pdf', buildSimplePdf(paragraphs));
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
