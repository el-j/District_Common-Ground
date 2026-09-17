import type { MinigameInstance, GameSessionContext, MinigameManifest } from '@district-cg/shared-types';
import { ToolWorkshopGame } from './ToolWorkshopGame';

export const manifest: MinigameManifest = {
  id: 'tool-workshop',
  version: '1.0.0',
  title: 'Tool Library Workshop',
  description: "Marcus's belt is backed up. Sort mechanical, electrical, and bike parts into the right bin — and send anything truly broken to scrap — before the line jams.",
  category: 'assembly',
  thumbnailUrl: '/assets/minigames/tool-workshop.png',
  entrypointUrl: '/plugins/tool-workshop/index.js',
  targetHardware: 'canvas',
  permissions: ['wallet:grant', 'audio:sfx'],
};

export class ToolWorkshopInstance implements MinigameInstance {
  private canvas: HTMLCanvasElement | null = null;
  private game: ToolWorkshopGame | null = null;

  async mount(container: HTMLElement, context: GameSessionContext): Promise<void> {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'tool-workshop-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background: #141414;
      touch-action: none;
    `;

    container.appendChild(this.canvas);
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;

    this.game = new ToolWorkshopGame(this.canvas, context);
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
  return new ToolWorkshopInstance();
}
