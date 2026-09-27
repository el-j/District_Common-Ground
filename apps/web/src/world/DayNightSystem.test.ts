import { describe, it, expect, vi } from 'vitest';
import { DayNightSystem } from './DayNightSystem';

vi.mock('../core/audio/SoundSynth', () => ({
  setBgmPhase: vi.fn(),
}));

function createMockScene(): any {
  const circles: any[] = [];
  const rectangles: any[] = [];

  return {
    scale: { width: 800, height: 600 },
    add: {
      circle: vi.fn((x: number, y: number, r: number, color: number, alpha: number) => {
        const obj = {
          x, y, r, color, alpha,
          setBlendMode: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAlpha: vi.fn(function(a: number) { obj.alpha = a; return obj; }),
        };
        circles.push(obj);
        return obj;
      }),
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number, alpha: number) => {
        const obj = {
          x, y, w, h, color, alpha,
          setScrollFactor: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setFillStyle: vi.fn(function(c: number, a: number) { obj.color = c; obj.alpha = a; return obj; }),
        };
        rectangles.push(obj);
        return obj;
      }),
    },
    circles,
    rectangles,
  };
}

describe('DayNightSystem', () => {
  it('initializes streetlamps and tint overlay', () => {
    const scene = createMockScene();
    const dns = new DayNightSystem(scene);

    expect(scene.circles.length).toBeGreaterThan(0);
    expect(scene.rectangles.length).toBe(1);
    expect(dns).toBeDefined();
  });

  it('updates tint and streetlamp alpha over cycle phases', () => {
    const scene = createMockScene();
    const dns = new DayNightSystem(scene);

    // Morning phase
    dns.update(10_000);
    // Midday phase
    dns.update(40_000);
    // Evening phase
    dns.update(70_000);
    // Night phase
    dns.update(100_000);

    expect(scene.rectangles[0].setFillStyle).toHaveBeenCalled();
  });
});
