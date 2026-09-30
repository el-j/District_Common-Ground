import Phaser from 'phaser';
import type { ResolvedWorldPalette } from '../skins/ThemeManager';
import type { SkinRenderer } from '../skins/SkinRendererInterface';
import type { AppearanceToken } from '../core/state/useGameStore';
import { TILE_FRAME_COUNT } from './MapData';

export const TS = 16;

/** Lightens (positive percent) or darkens (negative) a `#rrggbb` hex color — used to
 * derive secondary shades (mortar lines, brick courses, speckle) from the
 * skin's 9 world-tile palette fields without needing a dozen more fields. */
export function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0x00ff) + amt);
  const b = clamp((num & 0x0000ff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  // M30 — guarded the same way createPlayerTexture()/createNPCTextures() are:
  // reuse the existing canvas texture on a re-render (skin switch) instead of
  // always creating fresh, since Phaser's TextureManager rejects a second
  // createCanvas() call for a key that already exists.
  const tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', TS * TILE_FRAME_COUNT, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * TILE_FRAME_COUNT, TS);

  // T.FLOOR (0): indoor planks
  (() => {
    const ox = 0;
    ctx.fillStyle = palette.worldFloor;
    ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = shadeColor(palette.worldFloor, 4);
    ctx.lineWidth = 0.5;
    for (let y = 0; y < TS; y += 4) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + TS, y); ctx.stroke(); }
  })();

  // T.WALL (1): brick wall
  (() => {
    const ox = TS;
    ctx.fillStyle = palette.worldWall;
    ctx.fillRect(ox, 0, TS, TS);
    const bA = shadeColor(palette.worldWall, -8), bB = palette.worldWallShadow, mort = shadeColor(palette.worldWall, -25);
    for (let row = 0; row < 2; row++) {
      const ry = row * 8;
      const sh = row % 2 === 0 ? 0 : 4;
      ctx.fillStyle = mort; ctx.fillRect(ox, ry, TS, 1);
      for (let bx = -sh; bx < TS; bx += 9) {
        ctx.fillStyle = bx % 18 < 9 ? bA : bB;
        const x1 = Math.max(0, bx), x2 = Math.min(bx + 8, TS);
        if (x2 > x1) ctx.fillRect(ox + x1, ry + 1, x2 - x1, 6);
        ctx.fillStyle = mort;
        if (bx + 8 < TS) ctx.fillRect(ox + bx + 8, ry, 1, 8);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(ox, 0, TS, 1);
    ctx.fillRect(ox, TS - 1, TS, 1);
  })();

  // T.GRASS (2): varied outdoor green
  (() => {
    const ox = TS * 2;
    ctx.fillStyle = palette.worldGrass;
    ctx.fillRect(ox, 0, TS, TS);
    const shades = [shadeColor(palette.worldGrass, 6), shadeColor(palette.worldGrass, -6), shadeColor(palette.worldGrass, 12), shadeColor(palette.worldGrass, -12)];
    [[2,3],[5,1],[8,5],[11,2],[3,9],[7,12],[12,8],[4,13],[9,6],[14,10],[1,15],[13,14],[6,7],[0,11]].forEach(([gx, gy], i) => {
      ctx.fillStyle = shades[i % shades.length];
      ctx.fillRect(ox + gx, gy, 1, 1);
    });
  })();

  // T.ROAD (3): paved
  (() => {
    const ox = TS * 3;
    ctx.fillStyle = palette.worldRoad;
    ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = palette.worldRoadBorder; ctx.fillRect(ox, 0, TS, 1); ctx.fillRect(ox, TS - 1, TS, 1);
    ctx.fillStyle = shadeColor(palette.worldRoad, 10); ctx.fillRect(ox + 1, 1, TS - 2, 1);
    ctx.fillStyle = shadeColor(palette.worldRoad, 20); ctx.fillRect(ox + 2, 7, 3, 2); ctx.fillRect(ox + 9, 7, 3, 2);
  })();

  // T.PLAZA (4): stone tiles with subtle grid
  (() => {
    const ox = TS * 4;
    ctx.fillStyle = palette.worldPlaza;
    ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = shadeColor(palette.worldPlaza, 5); ctx.lineWidth = 0.75;
    const h = TS / 2;
    [[0,0],[h,0],[0,h],[h,h]].forEach(([dx, dy]) => ctx.strokeRect(ox + dx + 0.5, dy + 0.5, h - 1, h - 1));
    ctx.fillStyle = shadeColor(palette.worldPlaza, -8);
    [[1,1],[h+1,1],[1,h+1],[h+1,h+1]].forEach(([dx, dy]) => ctx.fillRect(ox + dx, dy, 2, 1));
  })();

  // T.DOOR (5): entrance
  (() => {
    const ox = TS * 5;
    ctx.fillStyle = shadeColor(palette.worldGrass, -15); ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = palette.worldDoor; ctx.fillRect(ox + 3, 1, 10, 14);
    ctx.fillStyle = shadeColor(palette.worldDoor, -35); ctx.fillRect(ox + 5, 2, 6, 11);
    ctx.fillStyle = palette.worldHighlight; ctx.fillRect(ox + 9, 7, 2, 3);
    ctx.fillStyle = shadeColor(palette.worldDoor, -45); ctx.fillRect(ox + 3, 14, 10, 2);
  })();

  // T.BUILT (6): completed build
  (() => {
    const ox = TS * 6;
    ctx.fillStyle = shadeColor(palette.worldGrass, -30); ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = palette.worldHighlight; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + 2, 2, TS - 4, TS - 4);
    ctx.fillStyle = shadeColor(palette.worldHighlight, -25);
    ctx.fillRect(ox + 6, 4, 4, 8); ctx.fillRect(ox + 4, 6, 8, 4);
    ctx.fillStyle = palette.worldHighlight; ctx.fillRect(ox + 7, 7, 2, 2);
  })();

  // T.TREE (7): ground + a round canopy blob — blocks movement like WALL
  (() => {
    const ox = TS * 7;
    ctx.fillStyle = palette.worldGrass; ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = shadeColor(palette.worldTree, -20); ctx.fillRect(ox + 6, 10, 4, 6); // trunk
    ctx.fillStyle = palette.worldTree;
    ctx.beginPath(); ctx.arc(ox + 8, 7, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shadeColor(palette.worldTree, 18);
    ctx.beginPath(); ctx.arc(ox + 6, 5, 2.5, 0, Math.PI * 2); ctx.fill();
  })();

  // T.WATER (8): flat fill + horizontal ripple lines — blocks movement (no bridge tile yet)
  (() => {
    const ox = TS * 8;
    ctx.fillStyle = palette.worldWater; ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = shadeColor(palette.worldWater, 16); ctx.lineWidth = 0.75;
    [3, 7, 11].forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(ox + (i % 2 === 0 ? 1 : 3), y);
      ctx.lineTo(ox + TS - (i % 2 === 0 ? 3 : 1), y);
      ctx.stroke();
    });
    ctx.fillStyle = shadeColor(palette.worldWater, -14); ctx.fillRect(ox, TS - 2, TS, 2);
  })();

  // T.DIRT_PATH (9): walkable, like FLOOR/ROAD — speckled tan-brown track
  (() => {
    const ox = TS * 9;
    ctx.fillStyle = palette.worldDirtPath; ctx.fillRect(ox, 0, TS, TS);
    const shades = [shadeColor(palette.worldDirtPath, 10), shadeColor(palette.worldDirtPath, -10)];
    [[2,3],[6,1],[10,6],[13,3],[4,9],[9,11],[12,13],[1,12]].forEach(([gx, gy], i) => {
      ctx.fillStyle = shades[i % shades.length];
      ctx.fillRect(ox + gx, gy, 1, 1);
    });
  })();

  // T.SIDEWALK (10): walkable — flat concrete slabs with a thin grid seam
  (() => {
    const ox = TS * 10;
    ctx.fillStyle = palette.worldSidewalk; ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = shadeColor(palette.worldSidewalk, -10); ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(ox + TS / 2, 0); ctx.lineTo(ox + TS / 2, TS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, TS / 2); ctx.lineTo(ox + TS, TS / 2); ctx.stroke();
  })();

  tex.refresh();
}

export const APPEARANCE_SKIN_TONES: Record<AppearanceToken, string> = {
  APPEARANCE_TONE_1: '#f0c090',
  APPEARANCE_TONE_2: '#d9a26b',
  APPEARANCE_TONE_3: '#a86f3f',
  APPEARANCE_TONE_4: '#6b4526',
};

export function createPlayerTexture(scene: Phaser.Scene, appearance?: AppearanceToken): void {
  const tex = scene.textures.exists('player')
    ? (scene.textures.get('player') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 8, TS);

  const skinTone = APPEARANCE_SKIN_TONES[appearance ?? 'APPEARANCE_TONE_1'];
  const C = { hair: '#6644bb', skin: skinTone, shirt: '#4477dd', pants: '#2a44bb', shoe: '#111130', eye: '#180e08', shirtSh: '#3360cc' };

  function down(ox: number, step: number): void {
    ctx.fillStyle = C.hair; ctx.fillRect(ox+4,1,8,3); ctx.fillRect(ox+3,2,1,2); ctx.fillRect(ox+12,2,1,2);
    ctx.fillStyle = C.skin; ctx.fillRect(ox+4,4,8,4); ctx.fillRect(ox+3,4,1,3); ctx.fillRect(ox+12,4,1,3);
    ctx.fillStyle = C.eye; ctx.fillRect(ox+6,5,1,2); ctx.fillRect(ox+9,5,1,2);
    ctx.fillStyle = C.shirt; ctx.fillRect(ox+4,8,8,4); ctx.fillStyle = C.shirtSh; ctx.fillRect(ox+4,11,8,1);
    ctx.fillStyle = C.pants; ctx.fillRect(ox+5,12,6,2);
    const la = step===0 ? 5 : 4, rb = step===0 ? 9 : 10;
    ctx.fillStyle = C.pants; ctx.fillRect(ox+la,14,2,2); ctx.fillRect(ox+rb,14,2,2);
    ctx.fillStyle = C.shoe;
    ctx.fillRect(ox+(step===0?4:3),15,3,1); ctx.fillRect(ox+(step===0?9:10),15,3,1);
  }

  function up(ox: number, step: number): void {
    ctx.fillStyle = C.hair; ctx.fillRect(ox+4,1,8,5); ctx.fillRect(ox+3,2,1,3); ctx.fillRect(ox+12,2,1,3);
    ctx.fillStyle = C.skin; ctx.fillRect(ox+7,6,2,2);
    ctx.fillStyle = C.shirt; ctx.fillRect(ox+4,8,8,4); ctx.fillStyle = C.shirtSh; ctx.fillRect(ox+4,11,8,1);
    ctx.fillStyle = C.pants; ctx.fillRect(ox+5,12,6,2);
    const la = step===0 ? 5 : 4, rb = step===0 ? 9 : 10;
    ctx.fillStyle = C.pants; ctx.fillRect(ox+la,14,2,2); ctx.fillRect(ox+rb,14,2,2);
    ctx.fillStyle = C.shoe;
    ctx.fillRect(ox+(step===0?4:3),15,3,1); ctx.fillRect(ox+(step===0?9:10),15,3,1);
  }

  function side(ox: number, flip: boolean, step: number): void {
    const p = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(ox + (flip ? TS - x - w : x), y, w, h);
    };
    p(3,1,7,3,C.hair); p(3,3,2,2,C.hair);
    p(3,3,6,4,C.skin);
    p(4,5,1,1,C.eye);
    p(4,8,5,4,C.shirt); p(4,11,5,1,C.shirtSh);
    p(9,9,2,3,C.shirt);
    p(4,12,5,2,C.pants);
    const fx = step === 0 ? 4 : 3, bx = step === 0 ? 6 : 7;
    p(fx,14,3,2,C.pants); p(bx,14,3,2,C.pants);
    p(3,15,5,1,C.shoe);
  }

  down(0, 0); down(TS, 1);
  up(TS * 2, 0);   up(TS * 3, 1);
  side(TS * 4, false, 0); side(TS * 5, false, 1);
  side(TS * 6, true,  0); side(TS * 7, true,  1);

  tex.refresh();
  for (let i = 0; i < 8; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export function createNPCTextures(scene: Phaser.Scene): void {
  const tex = scene.textures.exists('npcs')
    ? (scene.textures.get('npcs') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('npcs', TS * 6, TS);
  if (!tex) throw new Error('npc canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 6, TS);

  const cfgs = [
    { hair: '#b05010', shirt: '#ee8830', pants: '#884422', skin: '#f0b878' }, // Mira: orange
    { hair: '#335588', shirt: '#3388cc', pants: '#224466', skin: '#d8c8b8' }, // Leo: blue
    { hair: '#553311', shirt: '#cc4422', pants: '#772211', skin: '#f8d0a8' }, // Elena: red
    { hair: '#222222', shirt: '#889933', pants: '#443322', skin: '#e8b898' }, // Sal: olive apron
    { hair: '#999999', shirt: '#556655', pants: '#333333', skin: '#d0a888' }, // Marcus: grey (workshop coveralls)
    { hair: '#dddddd', shirt: '#886699', pants: '#554466', skin: '#e0c0a0' }, // Higgins: silver (violet shawl)
  ];
  cfgs.forEach((c, i) => {
    const ox = i * TS;
    ctx.fillStyle = c.hair; ctx.fillRect(ox+4,1,8,3);
    ctx.fillStyle = c.skin;
    ctx.fillRect(ox+4,4,8,4); ctx.fillRect(ox+3,4,1,3); ctx.fillRect(ox+12,4,1,3);
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(ox+6,5,1,2); ctx.fillRect(ox+9,5,1,2);
    ctx.fillStyle = c.shirt; ctx.fillRect(ox+4,8,8,4);
    ctx.fillStyle = c.pants;
    ctx.fillRect(ox+5,12,6,2); ctx.fillRect(ox+5,14,2,2); ctx.fillRect(ox+9,14,2,2);
    ctx.fillStyle = '#111130'; ctx.fillRect(ox+4,15,3,1); ctx.fillRect(ox+9,15,3,1);
  });
  tex.refresh();
  for (let i = 0; i < 6; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export const DEFAULT_RENDERER: SkinRenderer = {
  createTilesetTexture,
  createPlayerTexture,
  createNPCTextures,
};
