// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AmbientLightLayer } from './AmbientLightLayer';

function createMock2DContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(),
    createRadialGradient: vi.fn(() => gradient),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D;
}

describe('AmbientLightLayer', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  it('mounts canvas element with ambient-light-layer class', () => {
    const container = document.createElement('div');
    const layer = new AmbientLightLayer(container);

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe('ambient-light-layer');

    layer.destroy();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('resizes canvas dimensions', () => {
    const container = document.createElement('div');
    const layer = new AmbientLightLayer(container);
    const canvas = container.querySelector('canvas')!;

    layer.resize(800, 600);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it('renders radial gradients for active light sources', () => {
    const container = document.createElement('div');
    const layer = new AmbientLightLayer(container);

    layer.render([
      { x: 100, y: 150, radius: 40 },
      { x: 300, y: 400, radius: 60 },
    ]);

    expect(mockCtx.clearRect).toHaveBeenCalled();
    expect(mockCtx.createRadialGradient).toHaveBeenCalledTimes(2);
    expect(mockCtx.arc).toHaveBeenCalledTimes(2);
    expect(mockCtx.fill).toHaveBeenCalledTimes(2);
  });
});
