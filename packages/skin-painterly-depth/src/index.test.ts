// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRenderer } from './index';

function createMockPhaserScene() {
  const textures = new Map<string, any>();
  const mockCtx = {
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
    clearRect: vi.fn(),
    fillText: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
    drawImage: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createPattern: vi.fn(() => ({})),
    createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16 * 16 * 4) })),
    putImageData: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    shadowColor: '',
    shadowBlur: 0,
  };

  const createTexture = (key: string, width: number, height: number) => ({
    key,
    width,
    height,
    getContext: () => mockCtx,
    refresh: vi.fn(),
    add: vi.fn(),
  });

  const scene = {
    textures: {
      exists: (key: string) => textures.has(key),
      get: (key: string) => textures.get(key),
      createCanvas: (key: string, width: number, height: number) => {
        const tex = createTexture(key, width, height);
        textures.set(key, tex);
        return tex;
      },
    },
  };
  return { scene: scene as any, mockCtx, textures };
}

const mockPalette = {
  worldFloor: '#8a7d6b',
  worldWall: '#4a3f35',
  worldWallShadow: '#2c221e',
  worldGrass: '#4e7a3e',
  worldRoad: '#333333',
  worldRoadBorder: '#555555',
  worldPlaza: '#998877',
  worldDoor: '#663322',
  worldHighlight: '#ffddaa',
  worldTree: '#2d5a27',
  worldWater: '#3070b0',
  worldDirtPath: '#a08060',
  worldSidewalk: '#b0b0b0',
};

describe('Skin Painterly Depth Package', () => {
  it('creates renderer implementing skin interface', () => {
    const renderer = createRenderer();
    expect(typeof renderer.createTilesetTexture).toBe('function');
    expect(typeof renderer.createPlayerTexture).toBe('function');
    expect(typeof renderer.createNPCTextures).toBe('function');
  });

  it('generates painterly depth tileset texture with ambient occlusion passes', () => {
    const renderer = createRenderer();
    const { scene, textures } = createMockPhaserScene();

    renderer.createTilesetTexture(scene, mockPalette);
    expect(textures.has('tileset')).toBe(true);
    const tex = textures.get('tileset');
    expect(tex.refresh).toHaveBeenCalled();
  });

  it('generates player texture with appearance tokens and NPC textures', () => {
    const renderer = createRenderer();
    const { scene, textures } = createMockPhaserScene();

    // Default appearance
    renderer.createPlayerTexture(scene);
    expect(textures.has('player')).toBe(true);
    expect(textures.get('player').add).toHaveBeenCalledTimes(8);

    // Explicit appearance token
    renderer.createPlayerTexture(scene, 'APPEARANCE_TONE_3');
    expect(textures.get('player').refresh).toHaveBeenCalledTimes(2);

    renderer.createNPCTextures(scene);
    expect(textures.has('npcs')).toBe(true);
    expect(textures.get('npcs').add).toHaveBeenCalledTimes(6);
  });
});
