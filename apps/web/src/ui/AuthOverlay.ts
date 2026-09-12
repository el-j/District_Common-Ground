import { register, login } from '../api/endpoints/auth';
import { setToken } from '../core/state/persistence';
import { ApiError } from '../api/client';

export class AuthOverlay {
  private el: HTMLElement;
  private onDone: () => void;

  constructor(root: HTMLElement, onDone: () => void) {
    this.onDone = onDone;
    this.el = document.createElement('div');
    this.el.className = 'auth-overlay';
    this.el.innerHTML = `
      <div class="auth-panel">
        <h1 class="auth-title">District: Common Ground</h1>
        <p class="auth-subtitle">Sign in to save your progress across devices.</p>
        <form class="auth-form" autocomplete="on">
          <input class="auth-input" type="email" name="email" placeholder="Email" required />
          <input class="auth-input" type="password" name="password" placeholder="Password (8+ chars)" minlength="8" required />
          <p class="auth-error" hidden></p>
          <button class="auth-btn auth-btn--primary" type="submit" data-action="login">Sign In</button>
          <button class="auth-btn auth-btn--secondary" type="button" data-action="register">Create Account</button>
        </form>
        <button class="auth-offline" type="button">Play offline (no account)</button>
      </div>
    `;
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

      try {
        const fn = action === 'login' ? login : register;
        const { token } = await fn(email, password);
        setToken(token);
        this.dismiss();
      } catch (err) {
        if (err instanceof ApiError) {
          showError(err.status === 409 ? 'Email already registered.' :
                    err.status === 401 ? 'Wrong email or password.' :
                    `Error ${err.status} — try again.`);
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
      .addEventListener('click', () => this.dismiss());
  }

  private dismiss(): void {
    this.el.remove();
    this.onDone();
  }
}
