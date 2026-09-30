// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manifest, createMinigame, SolidarityLineInstance } from './index';
import { SolidarityLineGame } from './SolidarityLineGame';
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
    roundRect: vi.fn(),
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
    textAlign: 'left',
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

function createMockContext(): GameSessionContext {
  return {
    sessionId: 'sess-solidarity',
    sessionToken: 'token-line',
    userId: 'user-arthur',
    archetype: 'arthur',
    activeSkin: 'default',
    day: 4,
    currentStats: {
      cash: 80,
      energy: 70,
      socialTrust: 60,
      stressLevel: 25,
    },
    host: {
      playSFX: vi.fn(),
      grantRewards: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn(),
      closeMinigame: vi.fn(),
    },
  };
}

describe('SolidarityLine Minigame Package', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid minigame manifest', () => {
    expect(manifest.id).toBe('solidarity-line');
    expect(manifest.category).toBe('defense');
    expect(manifest.targetHardware).toBe('canvas');
    expect(manifest.permissions).toContain('wallet:grant');
  });

  it('creates instance via createMinigame()', () => {
    const instance = createMinigame();
    expect(instance).toBeInstanceOf(SolidarityLineInstance);
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
    expect(canvas?.className).toBe('solidarity-line-canvas');

    instance.onResize?.(1024, 768);
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    await instance.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    container.remove();
  });

  it('places shield when solidarity is available and triggers SFX', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new SolidarityLineGame(canvas, sessionContext);
    game.start();

    // Initial solidarity is 100, cost is 40
    (game as any).placeShield(0);
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('shield_up');
    expect((game as any).shields[0].active).toBe(true);
    expect((game as any).solidarity).toBe(60);

    // Place another shield
    (game as any).placeShield(1);
    expect((game as any).solidarity).toBe(20);

    // Not enough solidarity for third shield
    (game as any).placeShield(2);
    expect((game as any).shields[2].active).toBe(false);

    game.stop();
  });

  it('handles game over reward calculation on victory and failure', () => {
    vi.useFakeTimers();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new SolidarityLineGame(canvas, sessionContext);
    (game as any).defeated = 8;
    (game as any).lives = 3; // Line held
    (game as any).score = 450;
    (game as any).onGameOver();

    expect(sessionContext.host.grantRewards).toHaveBeenCalledWith({
      cashDelta: 20, // min(20, 8 * 2 + 4)
      resilienceDelta: 2, // min(2, floor(8 / 4))
    });
    expect(sessionContext.host.notify).toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(sessionContext.host.closeMinigame).toHaveBeenCalledWith({
      score: 450,
      completed: true,
    });
    vi.useRealTimers();
  });
});
