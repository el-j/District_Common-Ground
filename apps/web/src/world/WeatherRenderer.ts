import Phaser from 'phaser';
import { playRain, stopRain } from '../core/audio/SoundSynth';
import type { WeatherTier } from './WeatherSystem';

/**
 * WorldScene De-escalation — extracted the frost/rain overlay-and-raindrop
 * rendering that `WeatherSystem.ts` itself deliberately keeps free of (see
 * that file's own doc comment: pure threshold logic only). This is the
 * Phaser-side counterpart, same "render glue extracted, pure logic stays
 * pure" split `DayNightSystem.ts` already drew for the day/night tint.
 *
 * Frost is a flat tint (depth 91, above the day/night tint at depth 90);
 * rain is a small pool of falling streak rectangles (depth 92), advanced
 * only while `currentTier === 'rain'` — same rectangle-primitive style as
 * `DayNightSystem`'s streetlamps, no new Phaser subsystem for one effect.
 */
export class WeatherRenderer {
  private readonly weatherOverlay: Phaser.GameObjects.Rectangle;
  private readonly rainDrops: Phaser.GameObjects.Rectangle[] = [];
  private currentTier: WeatherTier = 'none';

  constructor(scene: Phaser.Scene) {
    const screenW = scene.scale.width, screenH = scene.scale.height;
    this.weatherOverlay = scene.add.rectangle(screenW / 2, screenH / 2, screenW * 4, screenH * 4, 0xaad4ff, 0)
      .setScrollFactor(0).setDepth(91);
    for (let i = 0; i < 40; i++) {
      const drop = scene.add.rectangle(
        Math.random() * screenW,
        Math.random() * screenH,
        2, 12, 0xcfe8ff, 0,
      ).setScrollFactor(0).setDepth(92).setAngle(12);
      this.rainDrops.push(drop);
    }
  }

  /** Applies a newly-computed weather tier — a no-op if it hasn't changed. */
  update(tier: WeatherTier): void {
    if (tier === this.currentTier) return;
    this.currentTier = tier;

    this.weatherOverlay.setFillStyle(0xaad4ff, tier === 'frost' ? 0.16 : 0);

    const raining = tier === 'rain';
    for (const drop of this.rainDrops) drop.setAlpha(raining ? 0.35 : 0);
    if (raining) {
      playRain();
    } else {
      stopRain();
    }
  }

  /** Advances falling raindrops — a no-op outside the 'rain' tier. */
  tick(delta: number, screenW: number, screenH: number): void {
    if (this.currentTier !== 'rain') return;
    const fallSpeed = 0.4; // px/ms
    for (const drop of this.rainDrops) {
      drop.y += fallSpeed * delta;
      drop.x -= fallSpeed * 0.25 * delta;
      if (drop.y > screenH) {
        drop.y = -10;
        drop.x = Math.random() * screenW;
      }
      if (drop.x < -10) drop.x = screenW + 10;
    }
  }
}
