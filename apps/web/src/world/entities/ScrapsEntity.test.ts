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

import { ScrapsEntity, scrapsPrompt } from './ScrapsEntity';
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

  it('shows the prompt in range but never changes stats itself (WorldScene\'s feedScraps() does)', () => {
    const { scene, promptText } = createMockScene();
    const scraps = new ScrapsEntity(scene, 80, 220);

    scraps.update(82, 220, 16);

    expect(promptText.setVisible).toHaveBeenCalledWith(true);
    expect(useGameStore.getState().player.cash).toBe(10);
    expect(useGameStore.getState().player.stressLevel).toBe(30);
  });

  it('the prompt reflects cash and whether Scraps was already fed today', () => {
    expect(scrapsPrompt()).toContain('Feed Scraps');
    useGameStore.setState(s => ({ player: { ...s.player, cash: 0 } }));
    expect(scrapsPrompt()).toContain('$1');
    useGameStore.setState(s => ({ economy: { ...s.economy, lastScrapsDay: s.meta.day } }));
    expect(scrapsPrompt()).toContain('fed today');
  });
});
