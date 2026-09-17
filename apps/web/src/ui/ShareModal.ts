import { useGameStore } from '../core/state/useGameStore';
import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { bindEscapeClose } from './modalDismiss';

const ROLE_NAMES: Record<string, string> = {
  pip: 'Precarious Courier',
  morgan: 'Exhausted Commuter',
  arthur: 'Solitary Landlord',
};

function buildShareText(): string {
  const { player, commons, meta } = useGameStore.getState();
  const role = player.classRole ? (ROLE_NAMES[player.classRole] ?? 'Resident') : 'Resident';
  const res = commons.resilienceScore;
  // Count built nodes from progress thresholds (100% = built)
  const built = [commons.kitchenProgress, commons.solarGridProgress, commons.legalFundProgress]
    .filter(p => p >= 100).length;
  return `Day ${meta.day} in District: Common Ground — playing as ${role}. Resilience: ${res}%. ${built}/3 community nodes built. Can we hold the neighbourhood together? 🏘️`;
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // Legacy fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

export function openShareSheet(root: HTMLElement): void {
  const text = buildShareText();
  const url = location.href.split('?')[0]!;
  const fullText = `${text}\n${url}`;

  // Try Web Share API first (mobile-native sheet)
  if (navigator.share) {
    void navigator.share({ title: 'District: Common Ground', text, url }).catch(() => undefined);
    return;
  }

  // Fallback: modal with copy button + platform links
  const overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  root.appendChild(overlay);

  inputManager.setLocked(true);
  requestAnimationFrame(() => overlay.classList.add('settings-overlay--visible'));

  const encodedText = encodeURIComponent(fullText);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
  const mastodonUrl = `https://mastodon.social/share?text=${encodedText}`;

  overlay.innerHTML = `
    <div class="settings-panel interactive" style="max-width:400px">
      <div class="settings-header">
        <span class="settings-title">📣 Share Progress</span>
        <button class="settings-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="settings-body" style="gap:0.75rem;display:flex;flex-direction:column">
        <p class="quest-subtitle" style="margin:0">Share your district's story:</p>
        <textarea
          id="share-text-area"
          readonly
          style="width:100%;height:5rem;background:#0d1a0c;color:#b8f0c8;border:1px solid #2a4a30;border-radius:6px;padding:0.5rem;font-family:inherit;font-size:0.8rem;resize:none"
        >${fullText}</textarea>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          <button id="share-copy-btn" class="quest-btn interactive" type="button" style="width:100%">📋 Copy to Clipboard</button>
          <a href="${tweetUrl}" target="_blank" rel="noopener" class="quest-btn interactive" style="width:100%;text-align:center;text-decoration:none;display:block;padding:0.5rem 0.75rem">𝕏 Share on X / Twitter</a>
          <a href="${mastodonUrl}" target="_blank" rel="noopener" class="quest-btn interactive" style="width:100%;text-align:center;text-decoration:none;display:block;padding:0.5rem 0.75rem">🐘 Share on Mastodon</a>
        </div>
      </div>
    </div>
  `;

  const close = (): void => {
    overlay.classList.remove('settings-overlay--visible');
    inputManager.setLocked(false);
    disposeEscape();
    setTimeout(() => overlay.remove(), 200);
  };

  const disposeEscape = bindEscapeClose(close);

  overlay.querySelector('.settings-close')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#share-copy-btn')?.addEventListener('click', () => {
    playUIClick();
    void copyToClipboard(fullText).then(() => {
      const btn = overlay.querySelector<HTMLButtonElement>('#share-copy-btn');
      if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => { btn.textContent = '📋 Copy to Clipboard'; }, 2000); }
    });
  });
}
