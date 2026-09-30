import { AuthOverlay } from './AuthOverlay';
import { getToken } from '../core/state/persistence';
import { inputManager } from '../world/InputManager';
import { bindEscapeClose } from './modalDismiss';

/** Opens the optional sign-in screen; reloads after a successful sign-in so
 *  the server save and online features load cleanly. */
export function openSignIn(root: HTMLElement): void {
  new AuthOverlay(root, () => {
    if (getToken()) window.location.reload();
  }, 'Not now');
}

/** Shown instead of an online-only feature when the player has no account
 *  (audit §3.5 — these used to open and fail with "Could not reach…"). */
export class SignInPrompt {
  private readonly el: HTMLElement;
  private readonly disposeEscape: () => void;

  constructor(private readonly root: HTMLElement, featureName: string, why: string) {
    this.el = document.createElement('div');
    this.el.className = 'settings-overlay settings-overlay--visible';
    this.el.innerHTML = `
      <div class="settings-panel interactive" role="dialog" aria-modal="true" aria-labelledby="signin-prompt-title">
        <div class="settings-header">
          <span id="signin-prompt-title" class="settings-title">${featureName}</span>
          <button class="settings-close" type="button" aria-label="Close">×</button>
        </div>
        <div class="settings-body">
          <p class="shop-status">${why}</p>
          <p class="shop-status">A free account also backs up your game, so you can continue on another device.</p>
          <div class="shop-confirm-row">
            <button class="shop-buy-btn interactive signin-prompt-go" type="button">Sign in or create account</button>
            <button class="shop-buy-btn interactive signin-prompt-later" type="button">Not now</button>
          </div>
        </div>
      </div>`;
    root.appendChild(this.el);
    inputManager.setLocked(true);
    this.disposeEscape = bindEscapeClose(() => this.close());
    this.el.querySelector('.settings-close')?.addEventListener('click', () => this.close());
    this.el.querySelector('.signin-prompt-later')?.addEventListener('click', () => this.close());
    this.el.querySelector('.signin-prompt-go')?.addEventListener('click', () => {
      this.close();
      openSignIn(this.root);
    });
  }

  private close(): void {
    this.disposeEscape();
    inputManager.setLocked(false);
    this.el.remove();
  }
}
