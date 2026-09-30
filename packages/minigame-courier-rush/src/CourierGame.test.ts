// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manifest, createMinigame, CourierRushInstance } from './index';
import { CourierGame } from './CourierGame';
import type { GameSessionContext } from '@district-cg/shared-types';

function createMock2DContext() {
  const gradient = { addColorStop: vi.fn() };
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

function createMockContext(): GameSessionContext {
  return {
    sessionId: 'sess-123',
    sessionToken: 'token-abc',
    userId: 'user-pip',
    archetype: 'pip',
    activeSkin: 'default',
    day: 3,
    currentStats: {
      cash: 100,
      energy: 80,
      socialTrust: 45,
      stressLevel: 20,
    },
    host: {
      playSFX: vi.fn(),
      grantRewards: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn(),
      closeMinigame: vi.fn(),
    },
  };
}

describe('CourierRush Minigame Package', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid minigame manifest', () => {
    expect(manifest.id).toBe('courier-rush');
    expect(manifest.category).toBe('delivery');
    expect(manifest.targetHardware).toBe('canvas');
    expect(manifest.permissions).toContain('wallet:grant');
    expect(manifest.permissions).toContain('audio:sfx');
  });

  it('creates instance via createMinigame()', () => {
    const instance = createMinigame();
    expect(instance).toBeInstanceOf(CourierRushInstance);
  });

  it('mounts, resizes, and unmounts properly', async () => {
    const instance = createMinigame();
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    document.body.appendChild(container);

    const sessionContext = createMockContext();
    await instance.mount(container, sessionContext);

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas?.className).toBe('courier-rush-canvas');

    instance.onResize?.(1024, 768);
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    await instance.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    container.remove();
  });

  it('runs game loop, handles key inputs, and bell ring', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new CourierGame(canvas, sessionContext);
    game.start();

    // Trigger bike acceleration
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('bell');

    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));

    // Stop game
    game.stop();
  });

  it('handles game over reward distribution and callback', () => {
    vi.useFakeTimers();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new CourierGame(canvas, sessionContext);
    // Force game over by calling private onGameOver or setting timeLeft to 0
    (game as any).deliveries = 4;
    (game as any).score = 500;
    (game as any).onGameOver();

    expect(sessionContext.host.grantRewards).toHaveBeenCalledWith({
      cashDelta: 12, // min(20, 4 * 3)
      trustDelta: 2, // min(3, 1 + floor(4 / 3))
    });
    expect(sessionContext.host.notify).toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(sessionContext.host.closeMinigame).toHaveBeenCalledWith({
      score: 500,
      completed: true,
    });
    vi.useRealTimers();
  });
});
