import { describe, it, expect, vi } from 'vitest';

vi.mock('phaser', () => {
  class MockCircle {
    constructor(public x: number, public y: number, public radius: number) {}
    static Contains = vi.fn();
  }
  return {
    default: {
      Geom: {
        Circle: MockCircle,
      },
    },
  };
});

import { InteractionPrompt } from './InteractionPrompt';

function createMockScene() {
  const bubble = {
    y: -18,
  };
  const icon = {
    y: -18,
    setOrigin: vi.fn().mockReturnThis(),
  };
  const container = {
    scene: null as any,
    setDepth: vi.fn().mockReturnThis(),
    setAlpha: vi.fn().mockReturnThis(),
    setScale: vi.fn().mockReturnThis(),
    setPosition: vi.fn().mockReturnThis(),
    setInteractive: vi.fn(function (this: any) {
      this.input = { enabled: false, cursor: 'default' };
      return this;
    }),
    on: vi.fn(),
    destroy: vi.fn(),
    input: null as any,
  };

  const tween = {
    stop: vi.fn(),
  };

  const scene = {
    add: {
      circle: vi.fn(() => bubble),
      text: vi.fn(() => icon),
      container: vi.fn(() => container),
    },
    tweens: {
      add: vi.fn((config: any) => {
        config.onComplete?.();
        return tween;
      }),
    },
  };
  container.scene = scene;
  return { scene: scene as any, bubble, icon, container, tween };
}

describe('InteractionPrompt', () => {
  it('creates prompt elements with clickable interaction if onClick is passed', () => {
    const { scene, container } = createMockScene();
    const onClick = vi.fn();
    const prompt = new InteractionPrompt(scene, 100, 200, '💬', onClick);

    expect(scene.add.circle).toHaveBeenCalled();
    expect(scene.add.text).toHaveBeenCalled();
    expect(scene.add.container).toHaveBeenCalledWith(100, 200, expect.any(Array));
    expect(container.setInteractive).toHaveBeenCalled();
    expect(container.on).toHaveBeenCalledWith('pointerdown', onClick);

    prompt.setPosition(150, 250);
    expect(container.setPosition).toHaveBeenCalledWith(150, 250);
  });

  it('animates show and hide properly', () => {
    const { scene, container, tween } = createMockScene();
    const prompt = new InteractionPrompt(scene, 100, 200, '💬', () => {});

    prompt.show();
    expect(container.setAlpha).toHaveBeenCalledWith(1);
    expect(container.input?.enabled).toBe(true);

    prompt.hide();
    expect(container.setAlpha).toHaveBeenCalledWith(0);
    expect(container.input?.enabled).toBe(false);

    prompt.destroy();
    expect(tween.stop).toHaveBeenCalled();
    expect(container.destroy).toHaveBeenCalled();
  });
});
