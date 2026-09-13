import type { MinigameInstance, GameSessionContext, MinigameManifest } from '@district-cg/shared-types';
import { CourierGame } from './CourierGame';

export const manifest: MinigameManifest = {
  id: 'courier-rush',
  version: '1.0.0',
  title: 'Cargo Courier Rush',
  description: 'High-speed bike delivery through bustling cobblestone streets. Pick up warm soup rations and deliver them to isolated neighbors before time runs out!',
  category: 'delivery',
  thumbnailUrl: '/assets/minigames/courier-rush.png',
  entrypointUrl: '@district-cg/minigame-courier-rush',
  targetHardware: 'canvas',
  permissions: ['wallet:grant', 'audio:sfx'],
};

export class CourierRushInstance implements MinigameInstance {
  private canvas: HTMLCanvasElement | null = null;
  private game: CourierGame | null = null;

  async mount(container: HTMLElement, context: GameSessionContext): Promise<void> {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'courier-rush-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background: #0f172a;
    `;

    container.appendChild(this.canvas);
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;

    this.game = new CourierGame(this.canvas, context);
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
  return new CourierRushInstance();
}
