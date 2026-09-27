import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('phaser', () => ({
  default: {
    Math: {
      Distance: {
        Between: (x1: number, y1: number, x2: number, y2: number) => Math.hypot(x2 - x1, y2 - y1),
      },
    },
  },
}));

import { ScrapsEntity } from './ScrapsEntity';
import { useGameStore } from '../../core/state/useGameStore';

function createMockScene() {
  const sprite = {
    x: 80,
    y: 220,
    setDepth: vi.fn().mockReturnThis(),
  };
  const promptText = {
    x: 80,
    y: 204,
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setPosition: vi.fn(function (this: any, x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }),
    setText: vi.fn().mockReturnThis(),
  };

  const heartText = {
    y: 200,
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };

  const scene = {
    add: {
      rectangle: vi.fn(() => sprite),
      text: vi.fn((_x: number, _y: number, content: string) => {
        if (content.includes('[E]')) return promptText;
        return heartText;
      }),
    },
    tweens: {
      add: vi.fn((config: any) => {
        config.onComplete?.();
      }),
    },
  };
  return { scene: scene as any, sprite, promptText, heartText };
}

describe('ScrapsEntity', () => {
  beforeEach(() => {
    useGameStore.setState({
      player: {
        classRole: 'pip',
        cash: 10,
        energy: 50,
        maxEnergy: 100,
        socialTrust: 20,
        stressLevel: 30,
        position: { x: 0, y: 0 },
        facing: 'down',
        lastWorkedDay: null,
        name: '', gender: 'prefer-not-to-say', appearance: 'APPEARANCE_TONE_1',
      },
    });
  });

  it('initializes sprite and hidden interaction prompt', () => {
    const { scene, sprite, promptText } = createMockScene();
    new ScrapsEntity(scene, 80, 220);

    expect(sprite.setDepth).toHaveBeenCalledWith(5);
    expect(promptText.setVisible).toHaveBeenCalledWith(false);
  });

  it('shows prompt when in range and feeds when interacted with cash', () => {
    const { scene, promptText } = createMockScene();
    const scraps = new ScrapsEntity(scene, 80, 220);

    // Player in range (x: 82, y: 220) with playerInteract = true
    scraps.update(82, 220, true, 16);

    expect(promptText.setVisible).toHaveBeenCalledWith(true);
    // Player had 10 cash, spent 2 -> 8 cash, stress reduced from 30 to 20
    expect(useGameStore.getState().player.cash).toBe(8);
    expect(useGameStore.getState().player.stressLevel).toBe(20);
    expect(scene.tweens.add).toHaveBeenCalled();
  });

  it('pets scraps for reduced stress benefit when broke', () => {
    useGameStore.setState({
      player: {
        ...useGameStore.getState().player,
        cash: 0,
        stressLevel: 30,
      },
    });

    const { scene } = createMockScene();
    const scraps = new ScrapsEntity(scene, 80, 220);

    scraps.update(82, 220, true, 16);
    expect(useGameStore.getState().player.cash).toBe(0);
    expect(useGameStore.getState().player.stressLevel).toBe(25); // reduced by 5
  });
});
