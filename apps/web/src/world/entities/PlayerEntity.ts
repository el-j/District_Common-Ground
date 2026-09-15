import Phaser from 'phaser';
import { inputManager, type Facing } from '../InputManager';

const PLAYER_SPEED = 80; // pixels per second
const FRAME_SIZE = 16; // px — matches WorldScene's TS

// Idle frame per direction in the 8-frame spritesheet (even indices = step A)
const FACING_FRAME: Record<Facing, number> = {
  down: 0,
  up: 2,
  left: 4,
  right: 6,
};

export class PlayerEntity {
  private readonly sprite: Phaser.Physics.Arcade.Sprite;
  private bobTime = 0;

  constructor(sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite = sprite;
    // Shrink physics body slightly so player fits through 1-tile-wide corridors
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
    this.sprite.setFrame(FACING_FRAME.down);
  }

  update(delta = 16): void {
    const { dx, dy } = inputManager.getDirection();
    const facing = inputManager.getFacing();
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    body.setVelocity(dx * PLAYER_SPEED, dy * PLAYER_SPEED);

    const moving = dx !== 0 || dy !== 0;
    const animKey = `walk_${facing}`;

    if (moving) {
      this.sprite.anims.play(animKey, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(FACING_FRAME[facing]);
    }

    // M21 §6 — ±2px walk bob. Offsets the sprite's vertical origin (a pure
    // render-time transform), never the physics body's x/y, so the AABB
    // collision box used by CollisionSystem.ts stays exactly where the
    // simulation puts it. Only active while actually moving, per spec.
    // Not verified in a live browser this session — visual-only, low-risk,
    // but flag for a manual QA pass per M16/M17's scoping convention.
    if (moving) {
      this.bobTime += delta;
    } else {
      this.bobTime = 0;
    }
    const bobPx = moving ? Math.sin(this.bobTime / 90) * 2 : 0;
    this.sprite.setOrigin(0.5, 0.5 - bobPx / FRAME_SIZE);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  getFacing(): Facing {
    return inputManager.getFacing();
  }

  getSprite(): Phaser.Physics.Arcade.Sprite {
    return this.sprite;
  }
}
