import { describe, it, expect, vi } from 'vitest';
import { setupTilemapCollision, aabbOverlap } from './CollisionSystem';

describe('CollisionSystem', () => {
  it('setupTilemapCollision adds collider to physics world', () => {
    const mockScene = {
      physics: {
        add: {
          collider: vi.fn(),
        },
      },
    };
    const mockSprite = {} as any;
    const mockLayer = {} as any;

    setupTilemapCollision(mockScene as any, mockSprite, mockLayer);
    expect(mockScene.physics.add.collider).toHaveBeenCalledWith(mockSprite, mockLayer);
  });

  it('aabbOverlap detects intersecting bounding boxes correctly', () => {
    // Intersecting
    expect(aabbOverlap(0, 0, 10, 10, 5, 5, 10, 10)).toBe(true);
    // Non-intersecting (disjoint X)
    expect(aabbOverlap(0, 0, 10, 10, 20, 0, 10, 10)).toBe(false);
    // Non-intersecting (disjoint Y)
    expect(aabbOverlap(0, 0, 10, 10, 0, 20, 10, 10)).toBe(false);
    // Touching edges (not overlapping strictly based on < and >)
    expect(aabbOverlap(0, 0, 10, 10, 10, 0, 10, 10)).toBe(false);
  });
});
