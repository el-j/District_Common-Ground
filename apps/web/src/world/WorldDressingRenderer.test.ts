// @vitest-environment jsdom
//
// Only applyResilienceTier() touches `document` (a plain DOM class toggle,
// no Phaser involved) — same jsdom-pragma path AmbientLightLayer.test.ts
// already uses for its own DOM-only rendering.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldDressingRenderer } from './WorldDressingRenderer';
import { dressingTierFor, dressingPropsForTier } from './ResilienceDressing';
import { OUTDOOR_DRESSING_PROPS } from './OutdoorDressing';

function createMockScene(): any {
  const rectangles: any[] = [];
  return {
    add: {
      rectangle: vi.fn((x: number, y: number, w: number, h: number, color: number) => {
        const obj = { x, y, w, h, color, destroyed: false, setDepth: vi.fn().mockReturnThis(), destroy: vi.fn() };
        obj.destroy.mockImplementation(() => { obj.destroyed = true; });
        rectangles.push(obj);
        return obj;
      }),
    },
    rectangles,
  };
}

describe('WorldDressingRenderer', () => {
  describe('applyResilienceTier', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="game-container"></div>';
    });
    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('sets the CSS class matching the resilience tier and clears the others', () => {
      const renderer = new WorldDressingRenderer(createMockScene());
      const container = document.getElementById('game-container')!;

      renderer.applyResilienceTier(5); // emergency
      expect(container.classList.contains('world--emergency')).toBe(true);

      renderer.applyResilienceTier(90); // thriving
      expect(container.classList.contains('world--emergency')).toBe(false);
      expect(container.classList.contains('world--thriving')).toBe(true);
    });

    it('is a no-op when the container is missing', () => {
      document.body.innerHTML = '';
      const renderer = new WorldDressingRenderer(createMockScene());
      expect(() => renderer.applyResilienceTier(5)).not.toThrow();
    });
  });

  describe('updateWorldDressing', () => {
    it('draws one rectangle per prop placement for the tier', () => {
      const scene = createMockScene();
      const renderer = new WorldDressingRenderer(scene);
      renderer.updateWorldDressing(5); // grimSqueeze tier
      expect(scene.rectangles.length).toBe(dressingPropsForTier(dressingTierFor(5)).length);
    });

    it('is a no-op when the tier has not changed', () => {
      const scene = createMockScene();
      const renderer = new WorldDressingRenderer(scene);
      renderer.updateWorldDressing(5);
      const callsAfterFirst = scene.add.rectangle.mock.calls.length;
      renderer.updateWorldDressing(6); // still 'emergency' -> same 'grimSqueeze' tier
      expect(scene.add.rectangle.mock.calls.length).toBe(callsAfterFirst);
    });

    it('destroys the previous tier sprites and redraws on a tier change', () => {
      const scene = createMockScene();
      const renderer = new WorldDressingRenderer(scene);
      renderer.updateWorldDressing(5); // grimSqueeze
      const grimSprites = [...scene.rectangles];

      renderer.updateWorldDressing(90); // flourishingCommons
      expect(grimSprites.every(s => s.destroyed)).toBe(true);
      const live = scene.rectangles.filter((s: any) => !s.destroyed);
      expect(live.length).toBe(dressingPropsForTier('flourishingCommons').length);
    });
  });

  describe('renderOutdoorDressing', () => {
    it('draws one fixed rectangle per outdoor prop placement', () => {
      const scene = createMockScene();
      const renderer = new WorldDressingRenderer(scene);
      renderer.renderOutdoorDressing();
      expect(scene.rectangles.length).toBe(OUTDOOR_DRESSING_PROPS.length);
    });
  });
});
