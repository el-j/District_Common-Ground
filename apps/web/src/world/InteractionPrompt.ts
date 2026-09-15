import Phaser from 'phaser';

/**
 * M21 — Interactable Bounce-Bubble Indicators (spec §6.1, §7.5).
 *
 * A small reusable bobbing icon-bubble, replacing the plain filled-circle
 * `drawNodeMarker()` used for construction nodes and adding the same
 * treatment to NPCs and the Courier Rush bike portal, which today have no
 * floating indicator at all — a player has to already be inside the
 * proximity radius before any visual cue appears.
 */
export class InteractionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bubble: Phaser.GameObjects.Arc;
  private readonly icon: Phaser.GameObjects.Text;
  private tween: Phaser.Tweens.Tween | null = null;
  private visible = false;

  constructor(scene: Phaser.Scene, x: number, y: number, icon: string) {
    this.bubble = scene.add.circle(0, -18, 8, 0x0f1420, 0.72);
    this.icon = scene.add
      .text(0, -18, icon, { fontSize: '10px' })
      .setOrigin(0.5, 0.5);

    this.container = scene.add.container(x, y, [this.bubble, this.icon]);
    this.container.setDepth(6);
    this.container.setAlpha(0);
    this.container.setScale(0.6);
  }

  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.container.setAlpha(1);
    this.tween?.stop();
    this.tween = this.container.scene.tweens.add({
      targets: this.container,
      scale: 1,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => this.startBob(),
    });
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.tween?.stop();
    this.container.setAlpha(0);
    this.container.setScale(0.6);
    this.bubble.y = -18;
    this.icon.y = -18;
  }

  private startBob(): void {
    this.tween?.stop();
    this.tween = this.container.scene.tweens.add({
      targets: [this.bubble, this.icon],
      y: -22,
      duration: 550,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  destroy(): void {
    this.tween?.stop();
    this.container.destroy();
  }
}
