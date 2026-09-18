import type Phaser from 'phaser';

// Local structural mirror of apps/web's SkinRenderer/ResolvedWorldPalette
// contract. apps/web isn't a shared library package, so there's nothing to
// import these from — kept structurally identical instead. Type-only,
// erased at build time: zero runtime coupling to apps/web or any other
// workspace package, matching every packages/minigame-* package's own
// standalone-bundle rule.
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

/** Lightens (positive) / darkens (negative) a `#rrggbb` hex color. Copied,
 * not imported, from WorldScene's own helper — these bundles must stay
 * fully standalone at runtime. */
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

/** Diorama Glow's signature move: every tile gets a diagonal linear
 * gradient toward one fixed light source (top-left) instead of a flat
 * fillStyle — the "warm single-key-light" look of a lit tabletop diorama. */
function litFill(ctx: CanvasRenderingContext2D, ox: number, base: string): void {
  const g = ctx.createLinearGradient(ox, 0, ox + TS, TS);
  g.addColorStop(0, shadeColor(base, 18));
  g.addColorStop(0.55, base);
  g.addColorStop(1, shadeColor(base, -14));
  ctx.fillStyle = g;
  ctx.fillRect(ox, 0, TS, TS);
}

/** A soft blurred shadow strip along a tile's lower edge — the diorama's
 * long, gentle cast-shadow read, cheap to fake with a small blur radius on
 * a texture that's only ever built once (or once per skin switch), not
 * per-frame. */
function dropShadowStrip(ctx: CanvasRenderingContext2D, ox: number, y: number, h: number): void {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(ox + 1, y, TS - 2, h);
  ctx.restore();
}

function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  const tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', TS * 7, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 7, TS);

  // FLOOR
  litFill(ctx, 0, palette.worldFloor);
  ctx.strokeStyle = shadeColor(palette.worldFloor, -10);
  ctx.lineWidth = 0.5;
  for (let y = 4; y < TS; y += 4) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TS, y); ctx.stroke(); }

  // WALL — lit gradient body, rounded coping line at top, soft shadow at base
  (() => {
    const ox = TS;
    litFill(ctx, ox, palette.worldWall);
    ctx.fillStyle = shadeColor(palette.worldWall, 30);
    ctx.fillRect(ox, 0, TS, 2);
    dropShadowStrip(ctx, ox, TS - 4, 4);
    ctx.fillStyle = palette.worldWallShadow;
    ctx.fillRect(ox, TS - 1, TS, 1);
  })();

  // GRASS — mounded diorama-style tufts (radial-ish highlight blobs, not speckle)
  (() => {
    const ox = TS * 2;
    litFill(ctx, ox, palette.worldGrass);
    const hi = shadeColor(palette.worldGrass, 22), lo = shadeColor(palette.worldGrass, -18);
    [[3, 4], [9, 3], [6, 10], [12, 9], [2, 12]].forEach(([gx, gy]) => {
      ctx.fillStyle = hi; ctx.fillRect(ox + gx, gy, 2, 1);
      ctx.fillStyle = lo; ctx.fillRect(ox + gx, gy + 1, 2, 1);
    });
  })();

  // ROAD — lit gradient, rounded-looking centerline dashes
  (() => {
    const ox = TS * 3;
    litFill(ctx, ox, palette.worldRoad);
    ctx.fillStyle = palette.worldRoadBorder;
    ctx.fillRect(ox, 0, TS, 1); ctx.fillRect(ox, TS - 1, TS, 1);
    ctx.fillStyle = shadeColor(palette.worldRoad, 26);
    ctx.fillRect(ox + 3, 7, 3, 2); ctx.fillRect(ox + 10, 7, 3, 2);
  })();

  // PLAZA — warm lit stone, soft corner shadows instead of a hard grid
  (() => {
    const ox = TS * 4;
    litFill(ctx, ox, palette.worldPlaza);
    const h = TS / 2;
    [[0, 0], [h, 0], [0, h], [h, h]].forEach(([dx, dy]) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + dx + 0.5, dy + 0.5, h - 1, h - 1);
    });
  })();

  // DOOR — glowing warm interior sliver behind a rounded doorway
  (() => {
    const ox = TS * 5;
    litFill(ctx, ox, shadeColor(palette.worldGrass, -12));
    ctx.fillStyle = palette.worldDoor;
    ctx.fillRect(ox + 3, 1, 10, 14);
    const g = ctx.createRadialGradient(ox + 8, 7, 1, ox + 8, 7, 6);
    g.addColorStop(0, palette.worldHighlight);
    g.addColorStop(1, shadeColor(palette.worldDoor, -35));
    ctx.fillStyle = g;
    ctx.fillRect(ox + 5, 2, 6, 11);
    dropShadowStrip(ctx, ox, 14, 2);
  })();

  // BUILT — a soft-glowing diorama plaque
  (() => {
    const ox = TS * 6;
    litFill(ctx, ox, shadeColor(palette.worldGrass, -25));
    ctx.strokeStyle = palette.worldHighlight;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + 2.5, 2.5, TS - 5, TS - 5);
    const g = ctx.createRadialGradient(ox + 8, 8, 1, ox + 8, 8, 5);
    g.addColorStop(0, palette.worldHighlight);
    g.addColorStop(1, shadeColor(palette.worldHighlight, -40));
    ctx.fillStyle = g;
    ctx.fillRect(ox + 6, 6, 4, 4);
  })();

  tex.refresh();
}

// Diorama Glow hero/NPCs: rounder proportions (bigger head-to-body ratio,
// thicker dark outline) and a simple 2-tone cel-shade (base fill + one
// lighter highlight patch on the "lit" side) instead of flat single tones.
function celBody(
  ctx: CanvasRenderingContext2D, ox: number, flip: boolean,
  hair: string, skin: string, shirt: string, pants: string, shoe: string, step: number, faceDown: boolean,
): void {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + (flip ? TS - x - w : x), y, w, h);
  };
  const outline = '#0b0b12';
  // thick outline silhouette first (rounder head, bigger than the default skin's)
  p(2, 1, 12, 12, outline);
  // head — bigger, rounder
  p(3, 2, 10, 6, hair);
  p(3, 5, 10, 4, skin);
  p(6, 6, 1, 1, '#1a0e08'); p(9, 6, 1, 1, '#1a0e08');
  // body
  p(4, 9, 8, 4, shirt);
  p(4, 13, 8, 1, pants);
  const la = step === 0 ? 5 : 4, rb = step === 0 ? 9 : 10;
  p(la, 14, 2, 2, pants); p(rb, 14, 2, 2, pants);
  p(step === 0 ? 4 : 3, 15, 3, 1, shoe); p(step === 0 ? 9 : 10, 15, 3, 1, shoe);
  // cel-shade highlight patch on the lit (upper-left) side
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(ox + (flip ? 8 : 3), faceDown ? 3 : 2, 4, 3);
}

function createPlayerTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.exists('player')
    ? (scene.textures.get('player') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 8, TS);

  const hair = '#7a56d6', skin = '#f4cca0', shirt = '#5288f0', pants = '#33499e', shoe = '#141428';

  for (let step = 0; step < 2; step++) {
    celBody(ctx, step * TS, false, hair, skin, shirt, pants, shoe, step, true);          // down
    celBody(ctx, (2 + step) * TS, false, hair, skin, shirt, pants, shoe, step, true);     // up
    celBody(ctx, (4 + step) * TS, false, hair, skin, shirt, pants, shoe, step, false);    // side (left)
    celBody(ctx, (6 + step) * TS, true, hair, skin, shirt, pants, shoe, step, false);     // side flipped (right)
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
    { hair: '#c8792a', shirt: '#f6a24e', pants: '#8a5228', skin: '#f4c48a' }, // Mira
    { hair: '#4a6ba0', shirt: '#4a9be0', pants: '#2c4a78', skin: '#dfd0c0' }, // Leo
    { hair: '#6a3e1c', shirt: '#e05a3a', pants: '#8a301c', skin: '#f8d4ac' }, // Elena
    { hair: '#2c2c2c', shirt: '#9cae4a', pants: '#4a3c2c', skin: '#eac2a0' }, // Sal
    { hair: '#b0b0b0', shirt: '#6a7a6a', pants: '#3c3c3c', skin: '#d8b090' }, // Marcus
    { hair: '#eaeaea', shirt: '#a077b0', pants: '#665478', skin: '#e8caac' }, // Higgins
  ];
  cfgs.forEach((c, i) => celBody(ctx, i * TS, false, c.hair, c.skin, c.shirt, c.pants, '#141428', 0, true));

  tex.refresh();
  for (let i = 0; i < 6; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export function createRenderer(): SkinRenderer {
  return { createTilesetTexture, createPlayerTexture, createNPCTextures };
}
