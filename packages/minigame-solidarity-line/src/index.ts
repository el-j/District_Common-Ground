import type { MinigameInstance, GameSessionContext, MinigameManifest } from '@district-cg/shared-types';
import { SolidarityLineGame } from './SolidarityLineGame';

export const manifest: MinigameManifest = {
  id: 'solidarity-line',
  version: '1.0.0',
  title: 'Solidarity Line',
  description: 'Displacement pressure is closing in on three fronts. Place mutual-aid shields along the line to turn eviction notices back before they reach the Land Trust.',
  category: 'defense',
  thumbnailUrl: '/assets/minigames/solidarity-line.png',
  entrypointUrl: '/plugins/solidarity-line/index.js',
  targetHardware: 'canvas',
  permissions: ['wallet:grant', 'audio:sfx'],
};

export class SolidarityLineInstance implements MinigameInstance {
  private canvas: HTMLCanvasElement | null = null;
  private game: SolidarityLineGame | null = null;

  async mount(container: HTMLElement, context: GameSessionContext): Promise<void> {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'solidarity-line-canvas';
    this.canvas.style.cssText = `
      width: 100%;
      height: 100%;
      display: block;
      background: #081310;
      touch-action: none;
    `;

    container.appendChild(this.canvas);
    this.canvas.width = container.clientWidth || 800;
    this.canvas.height = container.clientHeight || 600;

    this.game = new SolidarityLineGame(this.canvas, context);
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
  return new SolidarityLineInstance();
}
