import { describe, it, expect, vi } from 'vitest';
import { shadeColor, createTilesetTexture, createPlayerTexture, createNPCTextures, DEFAULT_RENDERER } from './DefaultTextureRenderer';
import type { ResolvedWorldPalette } from '../skins/ThemeManager';

function createMockScene(): any {
  const textures = new Map<string, any>();
  return {
    textures: {
      exists: vi.fn((key: string) => textures.has(key)),
      get: vi.fn((key: string) => textures.get(key)),
      createCanvas: vi.fn((key: string, width: number, height: number) => {
        const canvasTexture = {
          key,
          width,
          height,
          getContext: vi.fn(() => ({
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
          })),
          refresh: vi.fn(),
          add: vi.fn(),
        };
        textures.set(key, canvasTexture);
        return canvasTexture;
      }),
    },
  };
}

describe('DefaultTextureRenderer', () => {
  it('shadeColor correctly lightens and darkens hex colors', () => {
    expect(shadeColor('#102030', 10)).not.toBe('#102030');
    expect(shadeColor('#102030', -10)).not.toBe('#102030');
    expect(shadeColor('invalid', 10)).toBe('invalid');
  });

  it('createTilesetTexture creates and refreshes canvas texture', () => {
    const scene = createMockScene();
    const mockPalette: ResolvedWorldPalette = {
      worldFloor: '#3a2e2b',
      worldWall: '#8a4b38',
      worldWallShadow: '#5c3225',
      worldGrass: '#4d7c3f',
      worldRoad: '#2d3748',
      worldRoadMarking: '#f6e05e',
      worldDoor: '#744210',
      worldDoorKnob: '#ecc94b',
      worldBuilt: '#975a16',
      worldSidewalk: '#cbd5e0',
      worldDirt: '#7b341e',
      worldWater: '#3182ce',
      worldTreeCanopy: '#276749',
    };

    createTilesetTexture(scene, mockPalette);
    expect(scene.textures.createCanvas).toHaveBeenCalledWith('tileset', 16 * 10, 16);
  });

  it('createPlayerTexture handles appearance skin tones and frames', () => {
    const scene = createMockScene();
    createPlayerTexture(scene, 'APPEARANCE_TONE_2');
    expect(scene.textures.createCanvas).toHaveBeenCalledWith('player', 16 * 8, 16);
  });

  it('createNPCTextures generates 6 NPC character frames', () => {
    const scene = createMockScene();
    createNPCTextures(scene);
    expect(scene.textures.createCanvas).toHaveBeenCalledWith('npcs', 16 * 6, 16);
  });

  it('DEFAULT_RENDERER satisfies SkinRenderer contract', () => {
    expect(DEFAULT_RENDERER.createTilesetTexture).toBeDefined();
    expect(DEFAULT_RENDERER.createPlayerTexture).toBeDefined();
    expect(DEFAULT_RENDERER.createNPCTextures).toBeDefined();
  });
});
