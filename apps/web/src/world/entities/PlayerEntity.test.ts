import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Input: {
      Keyboard: {
        KeyCodes: { W: 'W', S: 'S', A: 'A', D: 'D' },
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

import { PlayerEntity } from './PlayerEntity';
import { inputManager } from '../InputManager';

function createMockSprite() {
  const body = {
    setSize: vi.fn(),
    setVelocity: vi.fn(),
  };
  const anims = {
    play: vi.fn(),
    stop: vi.fn(),
  };
  return {
    body,
    anims,
    setFrame: vi.fn(),
    setOrigin: vi.fn(),
    x: 100,
    y: 150,
  } as any;
}

describe('PlayerEntity', () => {
  beforeEach(() => {
    while (inputManager.isLocked()) {
      inputManager.setLocked(false);
    }
  });

  it('initializes physics body size and default frame', () => {
    const mockSprite = createMockSprite();
    const player = new PlayerEntity(mockSprite);

    expect(mockSprite.body.setSize).toHaveBeenCalledWith(12, 12);
    expect(mockSprite.setFrame).toHaveBeenCalledWith(0); // FACING_FRAME.down
    expect(player.x).toBe(100);
    expect(player.y).toBe(150);
    expect(player.getSprite()).toBe(mockSprite);
  });

  it('updates idle state when no input is active', () => {
    const mockSprite = createMockSprite();
    const player = new PlayerEntity(mockSprite);

    vi.spyOn(inputManager, 'getDirection').mockReturnValue({ dx: 0, dy: 0 });
    vi.spyOn(inputManager, 'getFacing').mockReturnValue('down');

    player.update(16);

    expect(mockSprite.body.setVelocity).toHaveBeenCalledWith(0, 0);
    expect(mockSprite.anims.stop).toHaveBeenCalled();
    expect(mockSprite.setFrame).toHaveBeenCalledWith(0);
    expect(mockSprite.setOrigin).toHaveBeenCalledWith(0.5, 0.5);
  });

  it('plays walk animation and applies walk bob when moving', () => {
    const mockSprite = createMockSprite();
    const player = new PlayerEntity(mockSprite);

    vi.spyOn(inputManager, 'getDirection').mockReturnValue({ dx: 1, dy: 0 });
    vi.spyOn(inputManager, 'getFacing').mockReturnValue('right');

    player.update(32);

    expect(mockSprite.body.setVelocity).toHaveBeenCalledWith(80, 0);
    expect(mockSprite.anims.play).toHaveBeenCalledWith('walk_right', true);
    expect(mockSprite.setOrigin).toHaveBeenCalled();
    expect(player.getFacing()).toBe('right');
  });
});
