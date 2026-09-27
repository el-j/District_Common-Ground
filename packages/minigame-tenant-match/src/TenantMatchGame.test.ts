// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { manifest, createMinigame, TenantMatchInstance } from './index';
import { TenantMatchGame } from './TenantMatchGame';
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
    scale: vi.fn(),
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
    sessionId: 'sess-tenant',
    sessionToken: 'token-match',
    userId: 'user-morgan',
    archetype: 'morgan',
    activeSkin: 'default',
    day: 5,
    currentStats: {
      cash: 120,
      energy: 75,
      socialTrust: 50,
      stressLevel: 15,
    },
    host: {
      playSFX: vi.fn(),
      grantRewards: vi.fn().mockResolvedValue(undefined),
      notify: vi.fn(),
      closeMinigame: vi.fn(),
    },
  };
}

describe('TenantMatch Minigame Package', () => {
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCtx = createMock2DContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports valid minigame manifest', () => {
    expect(manifest.id).toBe('tenant-match');
    expect(manifest.category).toBe('puzzle');
    expect(manifest.targetHardware).toBe('canvas');
    expect(manifest.permissions).toContain('wallet:grant');
  });

  it('creates instance via createMinigame()', () => {
    const instance = createMinigame();
    expect(instance).toBeInstanceOf(TenantMatchInstance);
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
    expect(canvas?.className).toBe('tenant-match-canvas');

    instance.onResize?.(1024, 768);
    expect(canvas?.width).toBe(1024);
    expect(canvas?.height).toBe(768);

    await instance.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    container.remove();
  });

  it('handles card matching logic and state transitions', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new TenantMatchGame(canvas, sessionContext);
    game.start();

    const cards = (game as any).cards;
    // Find matching pair
    const cardA = cards[0];
    const cardB = cards.find((c: any) => c.pairId === cardA.pairId && c.id !== cardA.id);

    // Simulate flipping cardA
    cardA.state = 'flipping-up';
    (game as any).revealed.push(cardA);

    // Simulate flipping cardB
    cardB.state = 'flipping-up';
    (game as any).revealed.push(cardB);
    (game as any).resolveTimer = 0.01;

    // Resolve match
    (game as any).resolveMatch();
    expect((game as any).pairsFound).toBe(1);
    expect(sessionContext.host.playSFX).toHaveBeenCalledWith('match_chime');

    game.stop();
  });

  it('handles game over reward calculations', () => {
    vi.useFakeTimers();
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const sessionContext = createMockContext();

    const game = new TenantMatchGame(canvas, sessionContext);
    (game as any).pairsFound = 6;
    (game as any).round = 0;
    (game as any).totalPairs = 8;
    (game as any).comboMax = 2;
    (game as any).score = 350;
    (game as any).onGameOver();

    expect(sessionContext.host.grantRewards).toHaveBeenCalledWith({
      cashDelta: 36, // 6 * 6
      trustDelta: 4, // 2 * 2
      energyDelta: -5,
    });
    expect(sessionContext.host.notify).toHaveBeenCalled();

    vi.advanceTimersByTime(2000);
    expect(sessionContext.host.closeMinigame).toHaveBeenCalledWith({
      score: 350,
      completed: false,
    });
    vi.useRealTimers();
  });
});
