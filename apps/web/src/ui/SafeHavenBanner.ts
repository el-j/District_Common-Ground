import { inputManager } from '../world/InputManager';
import { TactileEffects } from '../builder/TactileEffects';

/**
 * One-time celebratory ending banner shown the moment the Community Land
 * Trust (node E) reaches 100% — see EPIC-11 Test 11.2 "Safe Haven" ending.
 */
export class SafeHavenBanner {
  private readonly el: HTMLElement;
  private readonly onClose?: () => void;

  constructor(root: HTMLElement, onClose?: () => void) {
    this.onClose = onClose;

    this.el = document.createElement('div');
    this.el.className = 'safe-haven-banner';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-labelledby', 'safe-haven-title');
    this.el.innerHTML = `
      <div class="safe-haven-panel interactive">
        <div class="safe-haven-icon">🌿</div>
        <h2 id="safe-haven-title" class="safe-haven-title">Safe Haven Achieved</h2>
        <p class="safe-haven-body">
          The Community Land Trust is fully funded. No investor can ever buy these buildings
          out from under this neighbourhood again — this ground belongs to the people who
          live on it, for good.
        </p>
        <button class="safe-haven-close" type="button">Continue</button>
      </div>
    `;

    root.appendChild(this.el);
    inputManager.setLocked(true);
    TactileEffects.playStageCompleteChime();
    TactileEffects.spawnCelebrationParticles(this.el);

    this.el.querySelector('.safe-haven-close')?.addEventListener('click', () => this.close());
  }

  private close(): void {
    inputManager.setLocked(false);
    this.el.remove();
    this.onClose?.();
  }
}
