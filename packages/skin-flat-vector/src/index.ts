import type Phaser from 'phaser';

// Local structural mirror of apps/web's SkinRenderer/ResolvedWorldPalette
// contract — see packages/skin-diorama-glow/src/index.ts for the full
// rationale (apps/web isn't a shared library package; kept type-only and
// structurally identical instead, erased at build, zero runtime coupling).
interface ResolvedWorldPalette {
  worldFloor: string;
  worldWall: string;
  worldWallShadow: string;
  worldGrass: string;
  worldRoad: string;
  worldRoadBorder: string;
  worldPlaza: string;
  worldDoor: string;
  worldHighlight: string;
}

interface SkinRenderer {
  createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void;
  createPlayerTexture(scene: Phaser.Scene): void;
  createNPCTextures(scene: Phaser.Scene): void;
}

const TS = 16;

function shadeColor(hex: string, percent: number): string {
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

// Flat Vector Minimal's signature move: one precomputed low-alpha noise
// pattern, built once into an offscreen canvas and drawImage'd over every
// tile — never per-pixel Math.random() per frame. Deliberately no
// dithering/speckle beyond this single subtle grain layer.
let noisePattern: CanvasPattern | null = null;
function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (noisePattern) return noisePattern;
  const off = document.createElement('canvas');
  off.width = 16; off.height = 16;
  const octx = off.getContext('2d');
  if (!octx) return null;
  const img = octx.createImageData(16, 16);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() > 0.5 ? 255 : 0;
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * 22; // very low alpha grain
  }
  octx.putImageData(img, 0, 0);
  noisePattern = ctx.createPattern(off, 'repeat');
  return noisePattern;
}

function flatBands(ctx: CanvasRenderingContext2D, ox: number, base: string, bandFrac: number): void {
  // 2 flat bands: a darker lower band, a lighter upper band — no gradient.
  ctx.fillStyle = shadeColor(base, 6);
  ctx.fillRect(ox, 0, TS, TS * bandFrac);
  ctx.fillStyle = shadeColor(base, -6);
  ctx.fillRect(ox, TS * bandFrac, TS, TS * (1 - bandFrac));
  const pat = getNoisePattern(ctx);
  if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, TS, TS); }
}

function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  const tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', TS * 7, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 7, TS);

  flatBands(ctx, 0, palette.worldFloor, 0.6);

  // WALL — 3 flat bands (cap / body / base), no brick-course detail at all
  (() => {
    const ox = TS;
    ctx.fillStyle = shadeColor(palette.worldWall, 12); ctx.fillRect(ox, 0, TS, 3);
    ctx.fillStyle = palette.worldWall; ctx.fillRect(ox, 3, TS, 9);
    ctx.fillStyle = palette.worldWallShadow; ctx.fillRect(ox, 12, TS, 4);
    const pat = getNoisePattern(ctx);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, TS, TS); }
  })();

  flatBands(ctx, TS * 2, palette.worldGrass, 0.5);

  // ROAD — 2 flat bands + one bold flat dash, no per-pixel highlight speckle
  (() => {
    const ox = TS * 3;
    ctx.fillStyle = palette.worldRoad; ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = palette.worldRoadBorder; ctx.fillRect(ox, 0, TS, 1); ctx.fillRect(ox, TS - 1, TS, 1);
    ctx.fillStyle = shadeColor(palette.worldRoad, 30); ctx.fillRect(ox + 6, 6, 4, 4);
    const pat = getNoisePattern(ctx);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, TS, TS); }
  })();

  flatBands(ctx, TS * 4, palette.worldPlaza, 0.5);

  // DOOR — flat capsule doorway on a flat backdrop
  (() => {
    const ox = TS * 5;
    ctx.fillStyle = shadeColor(palette.worldGrass, -10); ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = palette.worldDoor; ctx.fillRect(ox + 4, 2, 8, 13);
    ctx.fillStyle = palette.worldHighlight; ctx.fillRect(ox + 10, 8, 1, 2);
    const pat = getNoisePattern(ctx);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, TS, TS); }
  })();

  // BUILT — bold flat square badge, no radial glow
  (() => {
    const ox = TS * 6;
    ctx.fillStyle = shadeColor(palette.worldGrass, -22); ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = palette.worldHighlight; ctx.fillRect(ox + 3, 3, 10, 10);
    ctx.fillStyle = shadeColor(palette.worldHighlight, -30); ctx.fillRect(ox + 6, 6, 4, 4);
    const pat = getNoisePattern(ctx);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, 0, TS, TS); }
  })();

  tex.refresh();
}

// Flat Vector hero/NPCs: bold flat capsule/rounded-rect body shapes, no
// separate shirt-shadow band, no per-strand hair pixels — 3 flat blocks
// (head, torso, legs) and nothing else.
function flatBody(
  ctx: CanvasRenderingContext2D, ox: number, flip: boolean,
  hair: string, skin: string, shirt: string, pants: string, step: number,
): void {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + (flip ? TS - x - w : x), y, w, h);
  };
  p(4, 1, 8, 4, hair);
  p(4, 5, 8, 3, skin);
  p(3, 8, 10, 5, shirt);       // one flat capsule-ish torso block, no shading band
  p(4, 13, 8, 2, pants);       // one flat leg block
  const la = step === 0 ? 4 : 5, rb = step === 0 ? 10 : 9;
  p(la, 15, 2, 1, pants); p(rb, 15, 2, 1, pants);
}

function createPlayerTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.exists('player')
    ? (scene.textures.get('player') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 8, TS);

  const hair = '#2f2f3a', skin = '#f2c9a0', shirt = '#ef6f3c', pants = '#233142';

  for (let step = 0; step < 2; step++) {
    flatBody(ctx, step * TS, false, hair, skin, shirt, pants, step);
    flatBody(ctx, (2 + step) * TS, false, hair, skin, shirt, pants, step);
    flatBody(ctx, (4 + step) * TS, false, hair, skin, shirt, pants, step);
    flatBody(ctx, (6 + step) * TS, true, hair, skin, shirt, pants, step);
  }

  tex.refresh();
  for (let i = 0; i < 8; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

function createNPCTextures(scene: Phaser.Scene): void {
  const tex = scene.textures.exists('npcs')
    ? (scene.textures.get('npcs') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('npcs', TS * 6, TS);
  if (!tex) throw new Error('npc canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 6, TS);

  const cfgs = [
    { hair: '#a8501c', shirt: '#f3902e', pants: '#5a3a1c', skin: '#f0bf8c' }, // Mira
    { hair: '#274361', shirt: '#2f7fc9', pants: '#1c2e42', skin: '#d8c5b2' }, // Leo
    { hair: '#3a2013', shirt: '#c93a2a', pants: '#5c1c12', skin: '#f5cba0' }, // Elena
    { hair: '#1c1c1c', shirt: '#7c8a2e', pants: '#33281c', skin: '#e0ae86' }, // Sal
    { hair: '#8a8a8a', shirt: '#4a5a4a', pants: '#262626', skin: '#cfa082' }, // Marcus
    { hair: '#d9d9d9', shirt: '#7c5a90', pants: '#463a58', skin: '#dcb896' }, // Higgins
  ];
  cfgs.forEach((c, i) => flatBody(ctx, i * TS, false, c.hair, c.skin, c.shirt, c.pants, 0));

  tex.refresh();
  for (let i = 0; i < 6; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export function createRenderer(): SkinRenderer {
  return { createTilesetTexture, createPlayerTexture, createNPCTextures };
}
