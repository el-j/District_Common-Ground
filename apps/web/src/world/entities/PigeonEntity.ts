import Phaser from 'phaser';

const SCATTER_RANGE = 32; // 2 tiles — flee radius in px
const SCATTER_SPEED = 80; // px/s while fleeing
const WANDER_SPEED = 18;  // px/s while idle

export class PigeonEntity {
  private readonly sprite: Phaser.GameObjects.Rectangle;
  private vx = 0;
  private vy = 0;
  private wanderTimer = 0;
  private readonly bounds: Phaser.Geom.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    bounds: Phaser.Geom.Rectangle,
  ) {
    this.bounds = bounds;
    this.sprite = scene.add.rectangle(x, y, 8, 6, 0xaaaacc).setDepth(4);
    this.pickWanderDirection();
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  update(playerX: number, playerY: number, delta: number): void {
    const dt = delta / 1000;
    const dx = this.sprite.x - playerX;
    const dy = this.sprite.y - playerY;
    const dist = Math.hypot(dx, dy);

    if (dist < SCATTER_RANGE) {
      // Flee directly away from player
      const len = dist || 1;
      this.vx = (dx / len) * SCATTER_SPEED;
      this.vy = (dy / len) * SCATTER_SPEED;
      this.wanderTimer = 0;
    } else {
      // Wander with periodic direction changes
      this.wanderTimer -= delta;
      if (this.wanderTimer <= 0) {
        this.pickWanderDirection();
      }
    }

    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + this.vx * dt, this.bounds.left, this.bounds.right);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + this.vy * dt, this.bounds.top, this.bounds.bottom);

    // Bounce off bounds
    if (this.sprite.x <= this.bounds.left || this.sprite.x >= this.bounds.right)  this.vx *= -1;
    if (this.sprite.y <= this.bounds.top  || this.sprite.y >= this.bounds.bottom) this.vy *= -1;
  }

  private pickWanderDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * WANDER_SPEED;
    this.vy = Math.sin(angle) * WANDER_SPEED;
    // Pause occasionally
    if (Math.random() < 0.35) { this.vx = 0; this.vy = 0; }
    this.wanderTimer = 1500 + Math.random() * 2500;
  }
}
