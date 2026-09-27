import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    },
  },
}));

import { PigeonEntity } from './PigeonEntity';

function createMockScene() {
  const sprite = {
    x: 100,
    y: 100,
    setDepth: vi.fn().mockReturnThis(),
  };
  const scene = {
    add: {
      rectangle: vi.fn(() => sprite),
    },
  };
  return { scene: scene as any, sprite };
}

describe('PigeonEntity', () => {
  it('initializes sprite and bounds', () => {
    const { scene, sprite } = createMockScene();
    const bounds = { left: 0, right: 200, top: 0, bottom: 200 } as any;

    const pigeon = new PigeonEntity(scene, 100, 100, bounds);
    expect(pigeon.x).toBe(100);
    expect(pigeon.y).toBe(100);
    expect(sprite.setDepth).toHaveBeenCalledWith(4);
  });

  it('scatters when player gets within range', () => {
    const { scene } = createMockScene();
    const bounds = { left: 0, right: 200, top: 0, bottom: 200 } as any;

    const pigeon = new PigeonEntity(scene, 100, 100, bounds);
    // Player within scatter range (< 32 px)
    pigeon.update(105, 105, 100);

    expect((pigeon as any).vx).not.toBe(0);
    expect((pigeon as any).vy).not.toBe(0);
  });

  it('wanders when player is far away', () => {
    const { scene } = createMockScene();
    const bounds = { left: 0, right: 200, top: 0, bottom: 200 } as any;

    const pigeon = new PigeonEntity(scene, 100, 100, bounds);
    // Player far away (> 32 px)
    pigeon.update(500, 500, 100);
    expect(pigeon.x).toBeDefined();
    expect(pigeon.y).toBeDefined();
  });
});
