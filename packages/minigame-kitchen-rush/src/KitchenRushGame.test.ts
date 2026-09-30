// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manifest, createMinigame, KitchenRushInstance } from './index';
import { KitchenRushGame } from './KitchenRushGame';
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
    shadowColor: '',
    shadowBlur: 0,
  } as unknown as CanvasRenderingContext2D;
}

function createMockContext(): GameSessionContext {
  return {
    sessionId: 'sess-kitchen',
    sessionToken: 'token-xyz',
    userId: 'user-morgan',
    archetype: 'morgan',
    activeSkin: 'default',
    day: 2,
    currentStats: {
      cash: 50,
      energy: 90,
      socialTrust: 30,
      stressLevel: 10,
    },
    host: {
      playSFX: vi.fn(),
      grantRewards: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn(),
      closeMinigame: vi.fn(),
    },
  };
}

describe('KitchenRush Minigame Package', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid minigame manifest', () => {
    expect(manifest.id).toBe('kitchen-rush');
    expect(manifest.category).toBe('cooking');
    expect(manifest.targetHardware).toBe('canvas');
    expect(manifest.permissions).toContain('wallet:grant');
  });

  it('creates instance via createMinigame()', () => {
    const instance = createMinigame();
    expect(instance).toBeInstanceOf(KitchenRushInstance);
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
    expect(canvas?.className).toBe('kitchen-rush-canvas');

    instance.onResize?.(1024, 768);
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    await instance.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    container.remove();
  });

  it('handles correct and wrong ingredients and serves orders', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new KitchenRushGame(canvas, sessionContext);
    game.start();

    const active = (game as any).activeOrder;
    const expectedIngredient = active.recipe[0];
    const wrongIngredient = { emoji: '🧁', name: 'Cupcake', color: '#ff00ff' };

    // Wrong ingredient
    (game as any).handleIngredientClick(wrongIngredient);
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('sizzle_fail');

    // Right ingredients until served
    for (const ing of [...active.recipe]) {
      (game as any).handleIngredientClick(ing);
    }
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('serve_ding');
    expect((game as any).served).toBe(1);

    game.stop();
  });

  it('handles game over reward distribution and closing', () => {
    vi.useFakeTimers();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new KitchenRushGame(canvas, sessionContext);
    (game as any).served = 5;
    (game as any).score = 300;
    (game as any).onGameOver();

    expect(sessionContext.host.grantRewards).toHaveBeenCalledWith({
      cashDelta: 10, // min(20, 5 * 2)
      trustDelta: 1, // min(3, comboMax) = 1
    });
    expect(sessionContext.host.notify).toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(sessionContext.host.closeMinigame).toHaveBeenCalledWith({
      score: 300,
      completed: true,
    });
    vi.useRealTimers();
  });
});
