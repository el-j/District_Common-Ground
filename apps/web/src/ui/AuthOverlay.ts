import { register, login } from '../api/endpoints/auth';
import { setToken, rememberOfflineChoice, clearOfflineChoice } from '../core/state/persistence';
import { ApiError } from '../api/client';

/** Deterministic pseudo-random numbers, so the skyline is the same every launch. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Dusk sky, stars and a neighbourhood skyline whose windows light up one by
 *  one — pure CSS, no assets, so the first screen is alive instantly. */
function titleBackdrop(): string {
  const rand = seeded(7);
  const stars = Array.from({ length: 40 }, (_, i) =>
    `<span class="title-star" style="left:${(rand() * 100).toFixed(1)}%;top:${(rand() * 55).toFixed(1)}%;--d:${(rand() * 4).toFixed(2)}s;--s:${i % 5 === 0 ? 3 : 2}px"></span>`).join('');
  let x = 0;
  const buildings: string[] = [];
  while (x < 100) {
    const w = 3 + Math.round(rand() * 4);
    const h = 30 + Math.round(rand() * 65);
    const windows = Array.from({ length: 4 + Math.round(rand() * 6) }, () =>
      `<span class="title-window" style="left:${(12 + rand() * 62).toFixed(0)}%;top:${(6 + rand() * 80).toFixed(0)}%;--d:${(0.3 + rand() * 3).toFixed(2)}s"></span>`).join('');
    const roof = rand() > 0.7 ? ' title-building--solar' : rand() > 0.6 ? ' title-building--garden' : '';
    buildings.push(`<div class="title-building${roof}" style="left:${x}%;width:${w}%;height:${h}%">${windows}</div>`);
    x += w - 0.5;
  }
  return `
    <div class="title-sky" aria-hidden="true">
      <div class="title-sun"></div>
      ${stars}
      <div class="title-skyline">${buildings.join('')}</div>
      <div class="title-street"></div>
    </div>`;
}

/** M31 audit note: intentionally non-dismissible (no ×/Escape) — sign-in/
 *  register blocks boot until resolved by design. See EPIC-31/M31 Section 4,
 *  which also names CrisisWireModal and CharacterSelect as deliberate
 *  exceptions. */
export class AuthOverlay {
  private el: HTMLElement;
  private onDone: () => void;

  /** Without `offlineLabel` this is the boot title screen: Play comes first
   *  and signing in (only needed for cloud saves) is tucked behind a toggle.
   *  With it, a later optional sign-in (Settings, a feature's sign-in
   *  prompt) shows the form directly and says e.g. "Not now". */
  constructor(root: HTMLElement, onDone: () => void, offlineLabel?: string) {
    this.onDone = onDone;
    const form = `
        <form class="auth-form" autocomplete="on">
          <input class="auth-input" type="email" name="email" placeholder="Email" autocomplete="email" required />
          <input class="auth-input" type="password" name="password" placeholder="Password (8+ chars)" autocomplete="current-password" minlength="8" required />
          <p class="auth-error" hidden></p>
          <button class="auth-btn auth-btn--primary" type="submit" data-action="login">Sign In</button>
          <button class="auth-btn auth-btn--secondary" type="button" data-action="register">Create Account</button>
        </form>`;
    const legal = `<p class="auth-legal"><a href="/privacy.html" target="_blank" rel="noopener">Privacy policy</a> · <a href="/imprint.html" target="_blank" rel="noopener">Imprint</a></p>`;
    this.el = document.createElement('div');
    if (offlineLabel === undefined) {
      this.el.className = 'auth-overlay auth-overlay--title';
      this.el.innerHTML = `
        ${titleBackdrop()}
        <div class="auth-panel title-panel">
          <p class="title-kicker">A game about holding a neighbourhood together</p>
          <h1 class="auth-title title-logo">District<span>Common Ground</span></h1>
          <p class="title-pitch">Work the gig shifts. Make rent. Build the commons with your neighbours.
            And when the crisis comes — blame them, or stand with them?</p>
          <button class="auth-offline auth-play" type="button"><span aria-hidden="true">▶ </span>Play</button>
          <p class="title-note">No account needed — your game saves on this device.</p>
          <details class="auth-signin">
            <summary>☁️ Sign in to sync across devices</summary>
            ${form}
          </details>
          ${legal}
        </div>
      `;
    } else {
      this.el.className = 'auth-overlay';
      this.el.innerHTML = `
        <div class="auth-panel">
          <h1 class="auth-title">District: Common Ground</h1>
          <p class="auth-subtitle">Sign in to save your progress across devices.</p>
          ${form}
          <button class="auth-offline" type="button">${offlineLabel}</button>
          ${legal}
        </div>
      `;
    }
    root.appendChild(this.el);
    this.bind();
  }

  private bind(): void {
    const form = this.el.querySelector<HTMLFormElement>('.auth-form')!;
    const errorEl = this.el.querySelector<HTMLElement>('.auth-error')!;

    const showError = (msg: string) => {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    };

    const clearError = () => {
      errorEl.hidden = true;
      errorEl.textContent = '';
    };

    const handleSubmit = async (action: 'login' | 'register') => {
      clearError();
      const email = (form.querySelector<HTMLInputElement>('[name=email]')!).value.trim();
      const password = (form.querySelector<HTMLInputElement>('[name=password]')!).value;

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
      }
      if (password.length < 8) {
        showError('Password must be at least 8 characters.');
        return;
      }

      try {
        const fn = action === 'login' ? login : register;
        const { token } = await fn(email, password);
        setToken(token);
        clearOfflineChoice();
        this.dismiss();
      } catch (err) {
        if (err instanceof ApiError) {
          showError(err.status === 409 ? 'Email already registered. Try signing in.' :
                    err.status === 401 ? 'Wrong email or password.' :
                    err.status === 400 ? 'Invalid email or password too short (8+ chars).' :
                    `Server error — try again.`);
        } else {
          showError('Network error — check your connection.');
        }
      }
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      void handleSubmit('login');
    });

    form.querySelector<HTMLButtonElement>('[data-action=register]')!
      .addEventListener('click', () => void handleSubmit('register'));

    this.el.querySelector<HTMLButtonElement>('.auth-offline')!
      .addEventListener('click', () => {
        rememberOfflineChoice();
        this.dismiss();
      });
  }

  private dismiss(): void {
    this.el.remove();
    this.onDone();
  }
}
