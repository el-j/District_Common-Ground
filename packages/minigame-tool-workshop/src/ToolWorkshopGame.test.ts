// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manifest, createMinigame, ToolWorkshopInstance } from './index';
import { ToolWorkshopGame } from './ToolWorkshopGame';
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
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
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
    sessionId: 'sess-tool',
    sessionToken: 'token-workshop',
    userId: 'user-pip',
    archetype: 'pip',
    activeSkin: 'default',
    day: 6,
    currentStats: {
      cash: 60,
      energy: 85,
      socialTrust: 40,
      stressLevel: 12,
    },
    host: {
      playSFX: vi.fn(),
      grantRewards: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn(),
      closeMinigame: vi.fn(),
    },
  };
}

describe('ToolWorkshop Minigame Package', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid minigame manifest', () => {
    expect(manifest.id).toBe('tool-workshop');
    expect(manifest.category).toBe('assembly');
    expect(manifest.targetHardware).toBe('canvas');
    expect(manifest.permissions).toContain('wallet:grant');
  });

  it('creates instance via createMinigame()', () => {
    const instance = createMinigame();
    expect(instance).toBeInstanceOf(ToolWorkshopInstance);
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
    expect(canvas?.className).toBe('tool-workshop-canvas');

    instance.onResize?.(1024, 768);
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    await instance.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    container.remove();
  });

  it('handles bin clicks, correct sorting, and mistakes', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new ToolWorkshopGame(canvas, sessionContext);
    game.start();

    // Clicking when no part is in zone triggers mistake
    (game as any).handleBinClick('mechanical');
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('buzzer');
    expect((game as any).mistakes).toBe(1);

    // Place a part in the zone
    const belt = (game as any).beltRange();
    const midX = belt.x0 + (belt.x1 - belt.x0) * 0.5;
    (game as any).parts.push({
      id: 99,
      category: 'electrical',
      broken: false,
      x: midX,
      resolved: false,
    });

    // Correct bin click
    (game as any).handleBinClick('electrical');
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('clank_sort');
    expect((game as any).sorted).toBe(1);

    game.stop();
  });

  it('handles game over reward calculations', () => {
    vi.useFakeTimers();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new ToolWorkshopGame(canvas, sessionContext);
    (game as any).sorted = 10;
    (game as any).comboMax = 3;
    (game as any).score = 420;
    (game as any).onGameOver();

    expect(sessionContext.host.grantRewards).toHaveBeenCalledWith({
      cashDelta: 20, // min(20, 10 * 2)
      trustDelta: 3, // min(3, comboMax 3)
    });
    expect(sessionContext.host.notify).toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(sessionContext.host.closeMinigame).toHaveBeenCalledWith({
      score: 420,
      completed: true, // 10 >= 8
    });
    vi.useRealTimers();
  });
});
