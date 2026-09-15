/**
 * M21 — Lighting & Shadow "Juice" Layer (spec §2.4, §7.3).
 *
 * A plain HTML `<canvas>` positioned above the Phaser canvas with
 * `mix-blend-mode: multiply` (set in style.css's `.ambient-light-layer`
 * rule), redrawn each frame with soft warm radial gradients centered on the
 * player and any lit doorway/window. This reuses the exact "separate
 * render layer instead of a second `filter:` rule" precedent M10's
 * frost/rain overlays already established — CSS `filter:` rules on the
 * same element don't compose, so the resilience-tier filter classes and
 * this layer must stay independent, not stacked as two `filter:` rules on
 * `#game-container`.
 *
 * Everywhere the canvas has no gradient painted, its pixels stay fully
 * transparent, so `multiply` has no visible effect there — the warmth only
 * shows up pooled near actual light sources, per the spec.
 */
export class AmbientLightLayer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ambient-light-layer';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /** `lights` are in screen-space pixels (not world coordinates). */
  render(lights: { x: number; y: number; radius: number }[]): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const light of lights) {
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, 'rgba(255,220,150,0.4)');
      gradient.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy(): void {
    this.canvas.remove();
  }
}
