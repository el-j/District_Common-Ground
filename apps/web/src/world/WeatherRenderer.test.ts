import { describe, it, expect, vi } from 'vitest';

const { playRain, stopRain } = vi.hoisted(() => ({ playRain: vi.fn(), stopRain: vi.fn() }));
vi.mock('../core/audio/SoundSynth', () => ({ playRain, stopRain }));

import { WeatherRenderer } from './WeatherRenderer';

function createMockScene(): any {
  const rectangles: any[] = [];
  return {
    scale: { width: 800, height: 600 },
    add: {
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number, alpha: number) => {
        const obj = {
          x, y, w, h, color, alpha,
          setScrollFactor: vi.fn().mockReturnThis(),
          setDepth: vi.fn().mockReturnThis(),
          setAngle: vi.fn().mockReturnThis(),
          setAlpha: vi.fn(function (this: any, a: number) { this.alpha = a; return this; }),
          setFillStyle: vi.fn(function (this: any, c: number, a: number) { this.color = c; this.alpha = a; return this; }),
        };
        rectangles.push(obj);
        return obj;
      }),
    },
    rectangles,
  };
}

describe('WeatherRenderer', () => {
  it('creates the overlay rectangle and a pool of 40 raindrops', () => {
    const scene = createMockScene();
    new WeatherRenderer(scene);
    // 1 overlay + 40 raindrops
    expect(scene.rectangles.length).toBe(41);
  });

  it('update() is a no-op when the tier has not changed', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    const overlay = scene.rectangles[0];
    renderer.update('none');
    expect(overlay.setFillStyle).not.toHaveBeenCalled();
  });

  it('update() tints the overlay and starts rain on the "rain" tier', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    const overlay = scene.rectangles[0];

    renderer.update('rain');
    expect(overlay.setFillStyle).toHaveBeenCalledWith(0xaad4ff, 0);
    expect(playRain).toHaveBeenCalled();
    for (const drop of scene.rectangles.slice(1)) {
      expect(drop.setAlpha).toHaveBeenCalledWith(0.35);
    }
  });

  it('update() tints the overlay on the "frost" tier without starting rain', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    const overlay = scene.rectangles[0];

    renderer.update('frost');
    expect(overlay.setFillStyle).toHaveBeenCalledWith(0xaad4ff, 0.16);
    expect(stopRain).toHaveBeenCalled();
  });

  it('update() back to "none" stops rain and clears the drops alpha', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    renderer.update('rain');
    playRain.mockClear();
    stopRain.mockClear();

    renderer.update('none');
    expect(stopRain).toHaveBeenCalled();
    for (const drop of scene.rectangles.slice(1)) {
      expect(drop.setAlpha).toHaveBeenLastCalledWith(0);
    }
  });

  it('tick() is a no-op outside the "rain" tier', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    const drop = scene.rectangles[1];
    const y0 = drop.y;
    renderer.tick(1000, 800, 600);
    expect(drop.y).toBe(y0);
  });

  it('tick() advances raindrops downward and left each frame', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    renderer.update('rain');
    const drop = scene.rectangles[1];
    drop.y = 100;
    drop.x = 100;

    renderer.tick(10, 800, 600);
    // fallSpeed 0.4px/ms: y += 0.4*10 = 4; x -= 0.4*0.25*10 = 1
    expect(drop.y).toBe(104);
    expect(drop.x).toBe(99);
  });

  it('tick() wraps a drop back to the top once it falls past the bottom', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    renderer.update('rain');
    const drop = scene.rectangles[1];
    drop.y = 599;
    drop.x = 100;

    renderer.tick(10, 800, 600);
    expect(drop.y).toBe(-10);
    expect(drop.x).toBeGreaterThanOrEqual(0);
    expect(drop.x).toBeLessThan(800);
  });

  it('tick() wraps a drop back to the right edge once it drifts past the left', () => {
    const scene = createMockScene();
    const renderer = new WeatherRenderer(scene);
    renderer.update('rain');
    const drop = scene.rectangles[1];
    drop.y = 100;
    drop.x = -15;

    renderer.tick(200, 800, 600);
    expect(drop.x).toBe(810);
  });
});
