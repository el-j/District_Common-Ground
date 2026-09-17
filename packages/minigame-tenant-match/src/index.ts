import type { MinigameInstance, GameSessionContext, MinigameManifest } from '@district-cg/shared-types';
import { TenantMatchGame } from './TenantMatchGame';

export const manifest: MinigameManifest = {
  id: 'tenant-match',
  version: '1.0.0',
  title: 'Tenant Rights Match',
  description: 'A memory-match challenge through two rounds of legal paperwork — pair up lease clauses, code citations, and covenants before the clock runs out.',
  category: 'puzzle',
  thumbnailUrl: '/assets/minigames/tenant-match.png',
  entrypointUrl: '@district-cg/minigame-tenant-match',
  targetHardware: 'canvas',
  permissions: ['wallet:grant', 'audio:sfx'],
};

export class TenantMatchInstance implements MinigameInstance {
  private canvas: HTMLCanvasElement | null = null;
  private game: TenantMatchGame | null = null;

  async mount(container: HTMLElement, context: GameSessionContext): Promise<void> {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tenant-match-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background: #241a10;
      touch-action: none;
    `;

    container.appendChild(this.canvas);
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;

    this.game = new TenantMatchGame(this.canvas, context);
    this.game.start();
  }

  async unmount(): Promise<void> {
    if (this.game) {
      this.game.stop();
      this.game = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
      this.canvas = null;
    }
  }

  onResize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }
}

export function createMinigame(): MinigameInstance {
  return new TenantMatchInstance();
}
