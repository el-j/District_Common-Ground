/**
 * The static #boot-screen in index.html (audit §3.16): a loading state
 * while the game boots, and a readable error with Retry if boot fails —
 * a failure used to leave a blank page.
 */
function screen(): HTMLElement | null {
  return typeof document === 'undefined' ? null : document.getElementById('boot-screen');
}

export function setBootStatus(text: string): void {
  const el = screen();
  if (!el) return;
  el.hidden = false;
  const status = el.querySelector('.boot-status');
  if (status) status.textContent = text;
}

export function hideBootScreen(): void {
  const el = screen();
  if (el) el.hidden = true;
}

export function showBootError(err: unknown, retry: () => void = () => window.location.reload()): void {
  const el = screen();
  if (!el) return;
  el.hidden = false;
  el.setAttribute('role', 'alert');
  const detail = err instanceof Error ? err.message : String(err);
  el.innerHTML = `
    <p class="boot-title">Something went wrong while loading</p>
    <p class="boot-status">Your saved game is safe. Please try again.</p>
    <p class="boot-status boot-detail"></p>
    <button class="boot-retry" type="button">Retry</button>
  `;
  // textContent, not innerHTML — the message may contain anything
  const detailEl = el.querySelector('.boot-detail');
  if (detailEl) detailEl.textContent = detail;
  el.querySelector('.boot-retry')?.addEventListener('click', retry);
}
