import Phaser from 'phaser';
import { setBgmPhase } from '../core/audio/SoundSynth';
import { COLS, ROWS } from './MapData';
import { TS } from './DefaultTextureRenderer';

export class DayNightSystem {
  private tintOverlay: Phaser.GameObjects.Rectangle;
  private streetlamps: Phaser.GameObjects.Arc[] = [];
  private lastLampAlpha = -1;
  private lastTintHash = -1;

  constructor(scene: Phaser.Scene) {
    this.spawnStreetlamps(scene);

    const screenW = scene.scale.width;
    const screenH = scene.scale.height;
    // Tint overlay for day/night lighting (depth 90, scrollFactor 0 = fixed to screen)
    this.tintOverlay = scene.add.rectangle(screenW / 2, screenH / 2, screenW * 4, screenH * 4, 0x220044, 0)
      .setScrollFactor(0)
      .setDepth(90);
  }

  private spawnStreetlamps(scene: Phaser.Scene): void {
    // Evenly spaced glowing lamp posts along each road strip; only visible at night.
    const roadRows = [21, 42, 64]; // North / South cross-streets + Solar Quarter border road
    for (const row of roadRows) {
      for (let col = 4; col < COLS - 2; col += 8) {
        this.streetlamps.push(this.createLampGlow(scene, col * TS + TS / 2, row * TS + TS / 2));
      }
    }
    const canalCol = 50; // East Canal access road
    for (let row = 4; row < ROWS - 2; row += 8) {
      this.streetlamps.push(this.createLampGlow(scene, canalCol * TS + TS / 2, row * TS + TS / 2));
    }
  }

  private createLampGlow(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Arc {
    return scene.add.circle(x, y, TS * 1.5, 0xffdd88, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setAlpha(0);
  }

  private updateStreetlamps(nightStrength: number): void {
    if (nightStrength === this.lastLampAlpha) return;
    this.lastLampAlpha = nightStrength;
    for (const lamp of this.streetlamps) lamp.setAlpha(nightStrength * 0.35);
  }

  public update(ticksSinceDay: number): void {
    const cycleDuration = 120_000;
    const phase = (ticksSinceDay % cycleDuration) / cycleDuration;

    // Per-channel lerp helper to avoid raw-integer colour corruption
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

    let color = 0x110022, alpha = 0;
    if (phase < 0.25) {
      const t = phase / 0.25;
      color = rgb(lerp(0xff, 0x44, t), lerp(0xaa, 0x22, t), lerp(0x44, 0x66, t));
      alpha = (1 - t) * 0.16;
    } else if (phase < 0.5) {
      const t = (phase - 0.25) / 0.25;
      color = rgb(lerp(0x44, 0xcc, t), lerp(0x22, 0x66, t), lerp(0x66, 0x22, t));
      alpha = t * 0.12;
    } else if (phase < 0.75) {
      const t = (phase - 0.5) / 0.25;
      color = rgb(lerp(0xcc, 0x11, t), lerp(0x66, 0x00, t), lerp(0x22, 0x22, t));
      alpha = 0.12 + t * 0.14;
    } else {
      const t = (phase - 0.75) / 0.25;
      color = 0x110022;
      alpha = 0.26 * (1 - t);
    }

    const nightStrength = Math.min(1, alpha / 0.26);
    this.updateStreetlamps(nightStrength);
    // M23 §6 — same overlay-darkness signal already driving the streetlamps
    // now also selects the BGM's night progression on its next bar.
    setBgmPhase(nightStrength > 0.5 ? 'night' : 'day');

    // Only call setFillStyle when the value meaningfully changes (prevents 60fps redraws)
    const hash = color * 1000 + Math.round(alpha * 500);
    if (hash === this.lastTintHash) return;
    this.lastTintHash = hash;
    this.tintOverlay.setFillStyle(color, alpha);
  }
}
