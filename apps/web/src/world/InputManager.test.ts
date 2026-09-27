import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: {
          W: 'W',
          S: 'S',
          A: 'A',
          D: 'D',
        },
      },
      Events: {
        POINTER_DOWN: 'pointerdown',
        POINTER_MOVE: 'pointermove',
        POINTER_UP: 'pointerup',
        POINTER_UP_OUTSIDE: 'pointerupoutside',
      },
    },
  },
}));

import { inputManager } from './InputManager';

describe('InputManager', () => {
  beforeEach(() => {
    // Reset locks
    while (inputManager.isLocked()) {
      inputManager.setLocked(false);
    }
  });

  it('tracks lock count correctly through setLocked', () => {
    expect(inputManager.isLocked()).toBe(false);

    inputManager.setLocked(true);
    expect(inputManager.isLocked()).toBe(true);

    // Stacking lock
    inputManager.setLocked(true);
    expect(inputManager.isLocked()).toBe(true);

    // First unlock: still locked because refcount = 1
    inputManager.setLocked(false);
    expect(inputManager.isLocked()).toBe(true);

    // Second unlock: now unlocked
    inputManager.setLocked(false);
    expect(inputManager.isLocked()).toBe(false);

    // Excess unlock does not drop below 0
    inputManager.setLocked(false);
    expect(inputManager.isLocked()).toBe(false);
  });

  it('resets direction when locked during update', () => {
    inputManager.setLocked(true);
    inputManager.update();
    expect(inputManager.getDirection()).toEqual({ dx: 0, dy: 0 });
  });

  it('initializes keyboard and pointer listeners on scene', () => {
    const listeners: Record<string, Function> = {};
    const mockKeyboard = {
      createCursorKeys: vi.fn(() => ({
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
      })),
      addKey: vi.fn(() => ({ isDown: false })),
    };

    const mockScene = {
      input: {
        keyboard: mockKeyboard,
        on: vi.fn((event: string, callback: Function) => {
          listeners[event] = callback;
        }),
      },
      scale: { width: 800 },
    };

    inputManager.init(mockScene as any);

    expect(mockKeyboard.createCursorKeys).toHaveBeenCalled();
    expect(mockKeyboard.addKey).toHaveBeenCalledTimes(4);
    expect(listeners['pointerdown']).toBeDefined();
    expect(listeners['pointermove']).toBeDefined();
    expect(listeners['pointerup']).toBeDefined();

    // Test pointer events
    // Touch on left half of screen initiates thumbstick
    listeners['pointerdown']({ id: 1, x: 200, y: 300 });
    expect(inputManager.isUsingTouch()).toBe(true);
    expect(inputManager.getThumbstickOrigin()).toEqual({ x: 200, y: 300 });

    // Pointer move updates delta
    listeners['pointermove']({ id: 1, x: 230, y: 300 });
    expect(inputManager.getThumbstickDelta().x).toBeGreaterThan(0);

    inputManager.update();
    expect(inputManager.getFacing()).toBe('right');

    // Pointer up clears touch
    listeners['pointerup']({ id: 1 });
    expect(inputManager.isUsingTouch()).toBe(false);
    expect(inputManager.getThumbstickOrigin()).toBeNull();
  });

  it('reads keyboard input when not using touch', () => {
    const cursorKeys = {
      left: { isDown: true },
      right: { isDown: false },
      up: { isDown: true },
      down: { isDown: false },
    };
    const wasdKeys = {
      up: { isDown: false },
      down: { isDown: false },
      left: { isDown: false },
      right: { isDown: false },
    };

    (inputManager as any).cursors = cursorKeys;
    (inputManager as any).wasd = wasdKeys;
    (inputManager as any).touchId = null;

    inputManager.update();
    const dir = inputManager.getDirection();
    // Diagonal normalization: -1 / sqrt(2) ≈ -0.7071
    expect(dir.dx).toBeCloseTo(-Math.SQRT1_2);
    expect(dir.dy).toBeCloseTo(-Math.SQRT1_2);
    expect(['left', 'up']).toContain(inputManager.getFacing());
  });
});
