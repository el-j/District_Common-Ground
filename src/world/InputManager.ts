import Phaser from 'phaser';

export interface Direction {
  dx: number;
  dy: number;
}

export type Facing = 'down' | 'up' | 'left' | 'right';

const THUMBSTICK_MAX_RADIUS = 40;

class InputManager {
  private direction: Direction = { dx: 0, dy: 0 };
  private _facing: Facing = 'down';

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key> | null = null;

  private touchId: number | null = null;
  private thumbstickOrigin: { x: number; y: number } | null = null;
  private thumbstickDelta: { x: number; y: number } = { x: 0, y: 0 };

  init(scene: Phaser.Scene): void {
    const keyboard = scene.input.keyboard;
    if (keyboard) {
      this.cursors = keyboard.createCursorKeys();
      this.wasd = {
        up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    scene.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        if (this.touchId !== null) return;
        const halfScreen = scene.scale.width / 2;
        if (pointer.x < halfScreen) {
          this.touchId = pointer.id;
          this.thumbstickOrigin = { x: pointer.x, y: pointer.y };
          this.thumbstickDelta = { x: 0, y: 0 };
        }
      },
    );

    scene.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        if (pointer.id !== this.touchId || !this.thumbstickOrigin) return;
        const dx = pointer.x - this.thumbstickOrigin.x;
        const dy = pointer.y - this.thumbstickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = Math.min(dist, THUMBSTICK_MAX_RADIUS) / THUMBSTICK_MAX_RADIUS;
        const angle = Math.atan2(dy, dx);
        this.thumbstickDelta = {
          x: Math.cos(angle) * ratio,
          y: Math.sin(angle) * ratio,
        };
      },
    );

    const clearTouch = (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.touchId) {
        this.touchId = null;
        this.thumbstickOrigin = null;
        this.thumbstickDelta = { x: 0, y: 0 };
      }
    };

    scene.input.on(Phaser.Input.Events.POINTER_UP, clearTouch);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, clearTouch);
  }

  update(): void {
    if (this.touchId !== null) {
      this.direction = { dx: this.thumbstickDelta.x, dy: this.thumbstickDelta.y };
    } else {
      this.direction = this.readKeyboard();
    }

    // Track facing from non-zero direction
    const { dx, dy } = this.direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this._facing = 'left';
      else if (dx > 0) this._facing = 'right';
    } else {
      if (dy < 0) this._facing = 'up';
      else if (dy > 0) this._facing = 'down';
    }
  }

  private readKeyboard(): Direction {
    if (!this.cursors || !this.wasd) return { dx: 0, dy: 0 };
    let dx = 0;
    let dy = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) dx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) dx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) dy -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) dy += 1;
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx /= Math.SQRT2;
      dy /= Math.SQRT2;
    }
    return { dx, dy };
  }

  getDirection(): Direction {
    return this.direction;
  }

  getFacing(): Facing {
    return this._facing;
  }

  getThumbstickOrigin(): { x: number; y: number } | null {
    return this.thumbstickOrigin;
  }

  getThumbstickDelta(): { x: number; y: number } {
    return this.thumbstickDelta;
  }

  isUsingTouch(): boolean {
    return this.touchId !== null;
  }
}

export const inputManager = new InputManager();
