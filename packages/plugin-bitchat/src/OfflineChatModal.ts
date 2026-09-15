// M19 — Tactile retro walkie-talkie terminal for bitchat.free. Follows the
// exact settings-overlay/settings-panel modal chrome and escapeHtml pattern
// already established by plugin-mesh-comms's MeshChatModal.ts. Click/squelch
// sound effects reuse the two SFX Kernel already exposes (playUIClick,
// playSolidarityChime) rather than growing the audio contract for this one
// modal — a dedicated squelch synth voice is a documented follow-up, not a
// silently-faked feature.
import type { KernelContext, MeshChatEvent, MeshTransportBadge } from '@district-cg/shared-types';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const CHANNELS = ['broadsheet', 'mutual-aid', 'civic-defense', 'whisper'] as const;
export type ChatChannel = (typeof CHANNELS)[number];

const CHANNEL_LABELS: Record<ChatChannel, string> = {
  broadsheet: '#broadsheet',
  'mutual-aid': '#mutual-aid',
  'civic-defense': '#civic-defense',
  whisper: '#whisper',
};

interface LogEntry {
  channel: ChatChannel;
  senderAlias: string;
  text: string;
}

export class OfflineChatModal {
  private readonly el: HTMLElement;
  private channel: ChatChannel = 'broadsheet';
  private message = '';
  private readonly log: LogEntry[] = [];
  private readonly unsubscribe: () => void;

  constructor(private readonly ctx: KernelContext, private readonly onClose?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'settings-overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'bitchat-title');
    ctx.uiRoot.appendChild(this.el);

    ctx.input.setLocked(true);
    requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

    this.unsubscribe = ctx.mesh.onChatMessage((event) => this.onChatMessage(event));

    this.render();
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  private onChatMessage(event: MeshChatEvent): void {
    if (!(CHANNELS as readonly string[]).includes(event.channel)) return;
    this.log.unshift({ channel: event.channel as ChatChannel, senderAlias: event.senderAlias, text: event.text });
    this.ctx.audio.playSolidarityChime();
    this.render();
  }

  private switchChannel(channel: ChatChannel): void {
    if (channel === this.channel) return;
    this.channel = channel;
    this.ctx.audio.playUIClick();
    this.render();
  }

  private async send(): Promise<void> {
    const text = this.message.trim();
    if (!text) return;
    this.message = '';
    await this.ctx.mesh.sendChatMessage(this.channel, text);
    this.log.unshift({ channel: this.channel, senderAlias: 'You', text });
    this.render();
  }

  private renderKnob(): string {
    return `
      <div class="bitchat-knob" role="radiogroup" aria-label="Channel selector">
        ${CHANNELS.map((c) => `
          <button type="button" class="bitchat-knob-tick ${c === this.channel ? 'bitchat-knob-tick--active' : ''}" data-channel="${c}" role="radio" aria-checked="${c === this.channel}">
            ${escapeHtml(CHANNEL_LABELS[c])}
          </button>
        `).join('')}
      </div>
    `;
  }

  private renderStatus(): string {
    const peerCount = this.ctx.mesh.getActivePeerCount();
    const badges: MeshTransportBadge[] = this.ctx.mesh.getTransportBadges();
    const badgeText = badges.length > 0
      ? badges.map((b) => `[${escapeHtml(b.transportId)}: ${b.peerCount} peers]`).join(' ')
      : '[no active transports]';
    return `<p class="civic-directory-status">${peerCount} peer${peerCount === 1 ? '' : 's'} in range · ${badgeText}</p>`;
  }

  private renderLog(): string {
    const entries = this.log.filter((e) => e.channel === this.channel).slice(0, 50);
    if (entries.length === 0) {
      return `<p class="bitchat-log-empty">Silence on ${escapeHtml(CHANNEL_LABELS[this.channel])}. Key up to say something.</p>`;
    }
    return `<ul class="bitchat-log">${entries.map((e) => `<li><strong>${escapeHtml(e.senderAlias)}:</strong> ${escapeHtml(e.text)}</li>`).join('')}</ul>`;
  }

  private render(): void {
    this.el.innerHTML = `
      <div class="settings-panel bitchat-panel interactive">
        <div class="settings-header">
          <span class="settings-title" id="bitchat-title">📡 Off-Grid Walkie-Talkie</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          ${this.renderKnob()}
          ${this.renderStatus()}
          ${this.renderLog()}
          <div class="bitchat-composer">
            <input type="text" class="bitchat-input" placeholder="Key up on ${escapeHtml(CHANNEL_LABELS[this.channel])}..." value="${escapeHtml(this.message)}" />
            <button type="button" class="bitchat-send interactive">Send</button>
          </div>
        </div>
      </div>
    `;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelector('.settings-close')?.addEventListener('click', () => this.close());
    this.el.querySelectorAll<HTMLButtonElement>('.bitchat-knob-tick').forEach((btn) => {
      btn.addEventListener('click', () => this.switchChannel(btn.dataset.channel as ChatChannel));
    });
    const input = this.el.querySelector<HTMLInputElement>('.bitchat-input');
    input?.addEventListener('input', () => {
      this.message = input.value;
    });
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void this.send();
    });
    this.el.querySelector('.bitchat-send')?.addEventListener('click', () => void this.send());
  }

  close(): void {
    this.unsubscribe();
    this.ctx.input.setLocked(false);
    this.el.classList.remove('settings-overlay--visible');
    setTimeout(() => this.el.remove(), 200);
    this.onClose?.();
  }
}
