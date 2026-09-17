import type { MinigameInstance, GameSessionContext, MinigameManifest } from '@district-cg/shared-types';
import { KitchenRushGame } from './KitchenRushGame';

export const manifest: MinigameManifest = {
  id: 'kitchen-rush',
  version: '1.0.0',
  title: 'Community Kitchen Rush',
  description: "Work the Community Kitchen's stove: click ingredients in the right order to fulfill each ticket before hungry neighbors give up waiting.",
  category: 'cooking',
  thumbnailUrl: '/assets/minigames/kitchen-rush.png',
  entrypointUrl: '@district-cg/minigame-kitchen-rush',
  targetHardware: 'canvas',
  permissions: ['wallet:grant', 'audio:sfx'],
};

export class KitchenRushInstance implements MinigameInstance {
  private canvas: HTMLCanvasElement | null = null;
  private game: KitchenRushGame | null = null;

  async mount(container: HTMLElement, context: GameSessionContext): Promise<void> {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'kitchen-rush-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background: #1a1108;
      touch-action: none;
    `;

    container.appendChild(this.canvas);
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;

    this.game = new KitchenRushGame(this.canvas, context);
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
  return new KitchenRushInstance();
}
