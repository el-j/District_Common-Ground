import { describe, it, expect, vi, beforeEach } from 'vitest';

// PickupRenderers.ts pulls in InteractionPrompt.ts, which does a real
// (non-type-only) `import Phaser from 'phaser'` for `Phaser.Geom.Circle` —
// mocked the same way InteractionPrompt.test.ts already does, since
// Phaser's real ESM entry point can't init under plain Node/jsdom.
vi.mock('phaser', () => {
  class MockCircle {
    constructor(public x: number, public y: number, public radius: number) {}
    static Contains = vi.fn();
  }
  return {
    default: {
      Geom: { Circle: MockCircle },
    },
  };
});

import { useGameStore } from '../core/state/useGameStore';
import { ScavengePickupRenderer, CookbookPickupRenderer } from './PickupRenderers';
import { SCAVENGE_POINTS } from './ScavengePoints';
import { COOKBOOK_PICKUPS } from './CookbookPickups';

function resetStore() {
  useGameStore.setState({
    inventory: { materials: {}, collectedScavengePoints: [] } as any,
    crafting: { knownRecipes: [], mastery: {}, craftedItems: {}, collectedCookbookPoints: [] } as any,
  });
}

function createMockScene(): any {
  const rectangles: any[] = [];
  const texts: any[] = [];
  return {
    add: {
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number) => {
        const obj = { x, y, w, h, color, setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
        rectangles.push(obj);
        return obj;
      }),
      text: vi.fn(() => {
        const obj = { y: 0, setOrigin: vi.fn().mockReturnThis(), setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
        obj.setOrigin.mockReturnValue(obj);
        obj.setDepth.mockReturnValue(obj);
        texts.push(obj);
        return obj;
      }),
      // InteractionPrompt's own dependencies
      circle: vi.fn(() => ({ y: -18 })),
      container: vi.fn((x: number, y: number) => ({
        x, y,
        setDepth: vi.fn().mockReturnThis(),
        setAlpha: vi.fn().mockReturnThis(),
        setScale: vi.fn().mockReturnThis(),
        setPosition: vi.fn().mockReturnThis(),
        setInteractive: vi.fn(function (this: any) { this.input = { enabled: false, cursor: 'default' }; return this; }),
        on: vi.fn(),
        destroy: vi.fn(),
        input: null as any,
        scene: { tweens: { add: vi.fn() } },
      })),
    },
    tweens: { add: vi.fn() },
    rectangles,
    texts,
  };
}

describe('ScavengePickupRenderer', () => {
  beforeEach(resetStore);

  it('renders one entry per uncollected scavenge point', () => {
    const scene = createMockScene();
    const renderer = new ScavengePickupRenderer(scene, vi.fn());
    renderer.render();
    expect(renderer.entries.length).toBe(SCAVENGE_POINTS.length);
  });

  it('skips points the player already collected', () => {
    useGameStore.setState({ inventory: { materials: {}, collectedScavengePoints: [SCAVENGE_POINTS[0].id] } as any });
    const scene = createMockScene();
    const renderer = new ScavengePickupRenderer(scene, vi.fn());
    renderer.render();
    expect(renderer.entries.length).toBe(SCAVENGE_POINTS.length - 1);
    expect(renderer.entries.find(e => e.data.id === SCAVENGE_POINTS[0].id)).toBeUndefined();
  });

  it('collect() grants the material, removes the entry, and destroys its sprite/prompt', () => {
    const scene = createMockScene();
    const renderer = new ScavengePickupRenderer(scene, vi.fn());
    renderer.render();
    const entry = renderer.entries[0];

    renderer.collect(entry);

    expect(useGameStore.getState().inventory.collectedScavengePoints).toContain(entry.data.id);
    expect(useGameStore.getState().inventory.materials[entry.data.material]).toBe(entry.data.amount);
    expect(entry.sprite.destroy).toHaveBeenCalled();
    expect(entry.prompt).toBeDefined();
    expect(renderer.entries).not.toContain(entry);
  });

  it('routes an InteractionPrompt tap through onPromptTap()', () => {
    const scene = createMockScene();
    const onPromptTap = vi.fn();
    const renderer = new ScavengePickupRenderer(scene, onPromptTap);
    renderer.render();

    const containerCall = scene.add.container.mock.results[0].value;
    const onHandler = containerCall.on.mock.calls.find((c: any[]) => c[0] === 'pointerdown')?.[1];
    onHandler?.();
    expect(onPromptTap).toHaveBeenCalledTimes(1);
  });
});

describe('CookbookPickupRenderer', () => {
  beforeEach(resetStore);

  it('renders one entry per uncollected cookbook pickup', () => {
    const scene = createMockScene();
    const renderer = new CookbookPickupRenderer(scene, vi.fn());
    renderer.render();
    expect(renderer.entries.length).toBe(COOKBOOK_PICKUPS.length);
  });

  it('skips pickups the player already collected', () => {
    useGameStore.setState({ crafting: { knownRecipes: [], mastery: {}, craftedItems: {}, collectedCookbookPoints: [COOKBOOK_PICKUPS[0].id] } as any });
    const scene = createMockScene();
    const renderer = new CookbookPickupRenderer(scene, vi.fn());
    renderer.render();
    expect(renderer.entries.length).toBe(COOKBOOK_PICKUPS.length - 1);
  });

  it('collect() teaches the recipe, removes the entry, and destroys its sprite/prompt', () => {
    const scene = createMockScene();
    const renderer = new CookbookPickupRenderer(scene, vi.fn());
    renderer.render();
    const entry = renderer.entries[0];

    renderer.collect(entry);

    expect(useGameStore.getState().crafting.collectedCookbookPoints).toContain(entry.data.id);
    expect(useGameStore.getState().crafting.knownRecipes).toContain(entry.data.recipe);
    expect(entry.sprite.destroy).toHaveBeenCalled();
    expect(renderer.entries).not.toContain(entry);
  });
});
