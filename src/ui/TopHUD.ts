import { useGameStore, type GameState } from '../core/state/useGameStore';

export class TopHUD {
  private el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'top-hud';
    root.appendChild(this.el);
    this.render(useGameStore.getState());
    useGameStore.subscribe(state => this.render(state));
  }

  private render(state: GameState): void {
    const { meta, player, commons } = state;

    if (meta.phase === 'select') {
      this.el.hidden = true;
      return;
    }

    this.el.hidden = false;
    const roleLabel = player.classRole ? player.classRole[0].toUpperCase() : '?';

    this.el.innerHTML = `
      <div class="hud-top-bar">
        <span class="hud-avatar">[${roleLabel}]</span>
        <span class="hud-day">Day ${meta.day}</span>
        <div class="hud-resilience-bar">
          <div class="hud-resilience-fill" style="width:${commons.resilienceScore}%"></div>
        </div>
        <span class="hud-resilience-label">${commons.resilienceScore}%</span>
      </div>
      <div class="hud-resources">
        <span class="hud-resource">$${player.cash}</span>
        <span class="hud-resource">E:${player.energy}</span>
        <span class="hud-resource">T:${player.socialTrust}</span>
        <span class="hud-resource">S:${player.stressLevel}%</span>
      </div>
    `;
  }
}
