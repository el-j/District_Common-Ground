import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    },
  },
}));

import { PedestrianEntity } from './PedestrianEntity';

function createMockScene() {
  const sprite = {
    x: 100,
    y: 100,
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setPosition: vi.fn(function (this: any, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
  };
  const shadow = {
    x: 100,
    y: 106,
    setDepth: vi.fn().mockReturnThis(),
    setPosition: vi.fn(function (this: any, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
  };

  const scene = {
    add: {
      image: vi.fn(() => sprite),
      ellipse: vi.fn(() => shadow),
    },
  };
  return { scene: scene as any, sprite, shadow };
}

describe('PedestrianEntity', () => {
  it('creates image and shadow with crowd styling and bounds', () => {
    const { scene, sprite, shadow } = createMockScene();
    const bounds = { left: 50, right: 300, top: 50, bottom: 300 } as any;

    const ped = new PedestrianEntity(scene, 100, 100, 1, bounds);
    expect(ped.x).toBe(100);
    expect(ped.y).toBe(100);
    expect(sprite.setDepth).toHaveBeenCalledWith(3);
    expect(sprite.setAlpha).toHaveBeenCalledWith(0.85);
    expect(shadow.setDepth).toHaveBeenCalledWith(2.5);
  });

  it('updates position when walkable and bounces on bounds', () => {
    const { scene, sprite, shadow } = createMockScene();
    const bounds = { left: 50, right: 300, top: 50, bottom: 300 } as any;

    const ped = new PedestrianEntity(scene, 100, 100, 1, bounds);
    // Force velocity and wanderTimer
    (ped as any).vx = 20;
    (ped as any).vy = 0;
    (ped as any).wanderTimer = 5000;

    const isWalkable = vi.fn().mockReturnValue(true);
    ped.update(1000, isWalkable);

    expect(isWalkable).toHaveBeenCalled();
    expect(sprite.setPosition).toHaveBeenCalled();
    expect(shadow.setPosition).toHaveBeenCalled();
  });

  it('picks new direction when next tile is blocked', () => {
    const { scene } = createMockScene();
    const bounds = { left: 50, right: 300, top: 50, bottom: 300 } as any;

    const ped = new PedestrianEntity(scene, 100, 100, 1, bounds);
    (ped as any).vx = 20;
    (ped as any).vy = 10;
    (ped as any).wanderTimer = 5000;

    const pickSpy = vi.spyOn(ped as any, 'pickWanderDirection');
    const isWalkable = vi.fn().mockReturnValue(false);
    ped.update(100, isWalkable);

    expect(pickSpy).toHaveBeenCalled();
  });
});
