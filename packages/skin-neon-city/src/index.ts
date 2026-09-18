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
const NEAR_BLACK = '#050508';

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

/** Layered-alpha-stroke glow: draw the same rect stroke 4 times at
 * decreasing alpha and increasing width — the cheapest approximation of
 * bloom on a plain 2D canvas without a shader, the same technique
 * WorldScene.spawnStreetlamps() already proves out with ADD-blended
 * circles. Used here on every wall/door/road-border edge instead of just
 * streetlamps. */
function glowStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  const passes = [[6, 0.06], [4, 0.12], [2, 0.22], [1, 0.9]] as const;
  for (const [width, alpha] of passes) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
}

function glowLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string): void {
  const passes = [[5, 0.08], [3, 0.16], [1, 0.9]] as const;
  for (const [width, alpha] of passes) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  const tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', TS * 7, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 7, TS);

  // FLOOR — near-black with a single accent seam line, glow-lit
  (() => {
    ctx.fillStyle = NEAR_BLACK; ctx.fillRect(0, 0, TS, TS);
    glowLine(ctx, 0, TS / 2, TS, TS / 2, shadeColor(palette.worldFloor, 40));
  })();

  // WALL — near-black block, accent-glow outline on every edge (angular, not brick)
  (() => {
    const ox = TS;
    ctx.fillStyle = shadeColor(NEAR_BLACK, 4); ctx.fillRect(ox, 0, TS, TS);
    glowStroke(ctx, ox + 1, 1, TS - 2, TS - 2, palette.worldWall);
    glowLine(ctx, ox + 2, TS / 2, ox + TS - 2, TS / 2, palette.worldWallShadow);
  })();

  // GRASS (used as "greenery accent strip" in this direction) — dark ground, thin glow blades
  (() => {
    const ox = TS * 2;
    ctx.fillStyle = NEAR_BLACK; ctx.fillRect(ox, 0, TS, TS);
    [3, 7, 11].forEach(gx => glowLine(ctx, ox + gx, TS - 1, ox + gx, TS - 6, palette.worldGrass));
  })();

  // ROAD — near-black asphalt, one glowing centerline, glow border strokes
  (() => {
    const ox = TS * 3;
    ctx.fillStyle = shadeColor(NEAR_BLACK, 2); ctx.fillRect(ox, 0, TS, TS);
    glowLine(ctx, ox, 0.5, ox + TS, 0.5, palette.worldRoadBorder);
    glowLine(ctx, ox, TS - 0.5, ox + TS, TS - 0.5, palette.worldRoadBorder);
    glowLine(ctx, ox + 2, TS / 2, ox + TS - 2, TS / 2, palette.worldRoad);
  })();

  // PLAZA — dark tile grid traced entirely in glow lines, no fill detail
  (() => {
    const ox = TS * 4;
    ctx.fillStyle = NEAR_BLACK; ctx.fillRect(ox, 0, TS, TS);
    const h = TS / 2;
    glowLine(ctx, ox + h, 0, ox + h, TS, palette.worldPlaza);
    glowLine(ctx, ox, h, ox + TS, h, palette.worldPlaza);
  })();

  // DOOR — a glowing angular archway, the brightest thing on the sheet
  (() => {
    const ox = TS * 5;
    ctx.fillStyle = NEAR_BLACK; ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = shadeColor(palette.worldDoor, -55);
    ctx.beginPath();
    ctx.moveTo(ox + 4, 15); ctx.lineTo(ox + 4, 5); ctx.lineTo(ox + 8, 1); ctx.lineTo(ox + 12, 5); ctx.lineTo(ox + 12, 15);
    ctx.closePath(); ctx.fill();
    glowStroke(ctx, ox + 4, 4, 8, 11, palette.worldHighlight);
    glowLine(ctx, ox + 8, 1, ox + 4, 5, palette.worldHighlight);
    glowLine(ctx, ox + 8, 1, ox + 12, 5, palette.worldHighlight);
  })();

  // BUILT — a bright angular emissive badge (diamond, not a rounded plaque)
  (() => {
    const ox = TS * 6;
    ctx.fillStyle = NEAR_BLACK; ctx.fillRect(ox, 0, TS, TS);
    ctx.save();
    ctx.translate(ox + 8, 8); ctx.rotate(Math.PI / 4);
    glowStroke(ctx, -5, -5, 10, 10, palette.worldHighlight);
    ctx.restore();
  })();

  tex.refresh();
}

// Neon City hero/NPCs: sharp angular silhouettes (pointed shoulders, no
// rounding) with a thin emissive rim-light edge traced in glow lines,
// instead of the diorama skin's soft highlight patch or the flat skin's
// plain blocks.
function angularBody(
  ctx: CanvasRenderingContext2D, ox: number, flip: boolean,
  hair: string, skin: string, shirt: string, accent: string, step: number,
): void {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + (flip ? TS - x - w : x), y, w, h);
  };
  const L = (x1: number, y1: number, x2: number, y2: number, c: string) => {
    const fx = (x: number) => ox + (flip ? TS - x : x);
    glowLine(ctx, fx(x1), y1, fx(x2), y2, c);
  };
  ctx.fillStyle = '#04040a'; ctx.fillRect(ox + 2, 1, 12, 14); // dark silhouette base
  p(4, 1, 8, 4, hair);
  p(4, 5, 8, 3, skin);
  // angular shoulders — a trapezoid instead of a rectangle
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(ox + (flip ? TS - 5 : 5), 8);
  ctx.lineTo(ox + (flip ? TS - 11 : 11), 8);
  ctx.lineTo(ox + (flip ? TS - 13 : 13), 13);
  ctx.lineTo(ox + (flip ? TS - 3 : 3), 13);
  ctx.closePath();
  ctx.fill();
  const la = step === 0 ? 4 : 5, rb = step === 0 ? 10 : 9;
  p(la, 14, 2, 2, '#0a0a12'); p(rb, 14, 2, 2, '#0a0a12');
  // emissive rim-light edge tracing the torso outline
  L(5, 8, 3, 13, accent);
  L(11, 8, 13, 13, accent);
}

function createPlayerTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.exists('player')
    ? (scene.textures.get('player') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 8, TS);

  const hair = '#1a1a24', skin = '#e0b898', shirt = '#141420', accent = '#39ffd6';

  for (let step = 0; step < 2; step++) {
    angularBody(ctx, step * TS, false, hair, skin, shirt, accent, step);
    angularBody(ctx, (2 + step) * TS, false, hair, skin, shirt, accent, step);
    angularBody(ctx, (4 + step) * TS, false, hair, skin, shirt, accent, step);
    angularBody(ctx, (6 + step) * TS, true, hair, skin, shirt, accent, step);
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
    { hair: '#241a12', shirt: '#141420', skin: '#e8bd94', accent: '#ff7a45' }, // Mira: amber neon
    { hair: '#12182a', shirt: '#141420', skin: '#cfc2b4', accent: '#39a0ff' }, // Leo: blue neon
    { hair: '#241010', shirt: '#141420', skin: '#f0c8a0', accent: '#ff3d6a' }, // Elena: magenta neon
    { hair: '#0e0e0e', shirt: '#141420', skin: '#dcae86', accent: '#8aff4a' }, // Sal: green neon
    { hair: '#3a3a3a', shirt: '#141420', skin: '#c89878', accent: '#c0c0ff' }, // Marcus: white-violet neon
    { hair: '#4a4a4a', shirt: '#141420', skin: '#d8b492', accent: '#c04aff' }, // Higgins: purple neon
  ];
  cfgs.forEach((c, i) => angularBody(ctx, i * TS, false, c.hair, c.skin, c.shirt, c.accent, 0));

  tex.refresh();
  for (let i = 0; i < 6; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export function createRenderer(): SkinRenderer {
  return { createTilesetTexture, createPlayerTexture, createNPCTextures };
}
