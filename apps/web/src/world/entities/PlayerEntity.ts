import Phaser from 'phaser';
import { inputManager, type Facing } from '../InputManager';

const PLAYER_SPEED = 80; // pixels per second

// Idle frame per direction in the 8-frame spritesheet (even indices = step A)
const FACING_FRAME: Record<Facing, number> = {
  down: 0,
  up: 2,
  left: 4,
  right: 6,
};

export class PlayerEntity {
  private readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(sprite: Phaser.Physics.Arcade.Sprite) {
    this.sprite = sprite;
    // Shrink physics body slightly so player fits through 1-tile-wide corridors
    (this.sprite.body as Phaser.Physics.Arcade.Body).setSize(12, 12);
    this.sprite.setFrame(FACING_FRAME.down);
  }

  update(): void {
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
