import type Phaser from 'phaser';

// Local structural mirror of apps/web's SkinRenderer/ResolvedWorldPalette
// contract — see skin-diorama-glow's own doc comment for why this is
// copied, not imported: these bundles must stay fully standalone at
// runtime, zero workspace coupling, matching every packages/skin-*/
// packages/minigame-* package's own rule.
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
  worldTree: string;
  worldWater: string;
  worldDirtPath: string;
  worldSidewalk: string;
}

// M52 — local structural mirror of apps/web's now-4-skin-tone AppearanceToken
// (same standalone-copy rule as ResolvedWorldPalette above).
type AppearanceToken = 'APPEARANCE_TONE_1' | 'APPEARANCE_TONE_2' | 'APPEARANCE_TONE_3' | 'APPEARANCE_TONE_4';

interface SkinRenderer {
  createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void;
  createPlayerTexture(scene: Phaser.Scene, appearance?: AppearanceToken): void;
  createNPCTextures(scene: Phaser.Scene): void;
}

const TS = 16;
const TILE_FRAME_COUNT = 11;

// M52 — EPIC-37 §2. TONE_1 matches this package's pre-M52 hardcoded default
// exactly, so an unset/legacy save renders identically to before.
const APPEARANCE_SKIN_TONES: Record<AppearanceToken, string> = {
  APPEARANCE_TONE_1: '#f2c79a',
  APPEARANCE_TONE_2: '#dba374',
  APPEARANCE_TONE_3: '#ab7444',
  APPEARANCE_TONE_4: '#6e4a28',
};

/**
 * M50 — EPIC-37 §1/§2. Hi-Fi Renderer Feasibility Skin ("Painterly Depth").
 *
 * **Section 1's finding, recorded here since this file IS the evidence**:
 * of the vision doc's 3 art-sourcing approaches (procedural-canvas-pushed-
 * further / real illustrated assets / hybrid), only the first is actually
 * buildable in this development environment — there is no image-generation
 * tool available to this agent, and sourcing real illustrated art from the
 * open web would mean unlicensed, unverified assets shipped into a real
 * product, which this project's own operating constraints already rule
 * out. That absence is itself the concrete evidence this milestone asks
 * for, not a fallback chosen by default: real hand-illustrated or hybrid
 * art stays a genuinely open production question for M51 to define a
 * pipeline around (an external art vendor/tool, or an image-generation
 * pipeline this agent doesn't have access to) — not resolved here.
 *
 * The technique pushed further than all 3 existing hi-fi skins
 * (diorama-glow/flat-vector/neon-city), none of which combine all of:
 *  - a 5-stop gradient fill (ambient shadow → base → highlight) instead of
 *    each existing skin's 3-stop linear gradient — a smoother, more
 *    "painted" color blend, not a flat tri-tone band.
 *  - real per-tile ambient occlusion: soft radial darkening in each tile's
 *    corners, the classic painterly "contact shadow" cue no existing skin
 *    renderer does at all.
 *  - a whole-canvas depth vignette applied once after every tile is drawn
 *    — a genuine (if modest) depth cue standing in for true multi-layer
 *    parallax, which would need WorldScene.ts camera/render changes well
 *    beyond this milestone's "one flagship renderer package" scope (a
 *    real forward dependency for M52, recorded not silently assumed).
 *  - 3-tone character shading (shadow/base/highlight, not diorama-glow's
 *    2-tone) plus a genuine rim-light stroke (bright on the lit silhouette
 *    edge, dark on the shadow edge) and arc-drawn (not rectangle-drawn)
 *    heads for real curvature.
 */

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v));
}

/** Lightens (positive) / darkens (negative) a `#rrggbb` hex color. */
function shadeColor(hex: string, percent: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = clampByte((num >> 16) + amt);
  const g = clampByte(((num >> 8) & 0x00ff) + amt);
  const b = clampByte((num & 0x0000ff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Painterly Depth's signature move: a 5-stop diagonal gradient (deep
 *  ambient shadow, mid-shadow, true base color, mid-highlight, a bright
 *  rim-light sliver) instead of any existing skin's 3-stop version — a
 *  smoother, more hand-painted-reading color transition. */
function paintedFill(ctx: CanvasRenderingContext2D, ox: number, base: string): void {
  const g = ctx.createLinearGradient(ox, 0, ox + TS, TS);
  g.addColorStop(0, shadeColor(base, -22));
  g.addColorStop(0.28, shadeColor(base, -8));
  g.addColorStop(0.55, base);
  g.addColorStop(0.8, shadeColor(base, 16));
  g.addColorStop(1, shadeColor(base, 32));
  ctx.fillStyle = g;
  ctx.fillRect(ox, 0, TS, TS);
}

/** Soft ambient-occlusion corners — a small radial darkening in each of a
 *  tile's 4 corners, the "contact shadow" read no existing skin renderer
 *  attempts. Cheap since it only runs once per tile at texture-build time. */
function ambientOcclusionCorners(ctx: CanvasRenderingContext2D, ox: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  [[0, 0], [TS, 0], [0, TS], [TS, TS]].forEach(([cx, cy]) => {
    const g = ctx.createRadialGradient(ox + cx, cy, 0, ox + cx, cy, TS * 0.55);
    g.addColorStop(0, 'rgba(0,0,0,0.32)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox, 0, TS, TS);
  });
  ctx.restore();
}

function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  const width = TS * TILE_FRAME_COUNT;
  const tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', width, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, TS);

  const frame = (base: string, extra?: (ox: number) => void) => (ox: number) => {
    paintedFill(ctx, ox, base);
    extra?.(ox);
    ambientOcclusionCorners(ctx, ox);
  };

  frame(palette.worldFloor, ox => {
    ctx.strokeStyle = shadeColor(palette.worldFloor, -14);
    ctx.lineWidth = 0.5;
    for (let y = 4; y < TS; y += 4) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + TS, y); ctx.stroke(); }
  })(0);

  frame(palette.worldWall, ox => {
    ctx.fillStyle = shadeColor(palette.worldWall, 36);
    ctx.fillRect(ox, 0, TS, 1.5);
    ctx.fillStyle = palette.worldWallShadow;
    ctx.fillRect(ox, TS - 1.5, TS, 1.5);
  })(TS);

  frame(palette.worldGrass, ox => {
    const hi = shadeColor(palette.worldGrass, 26), lo = shadeColor(palette.worldGrass, -22);
    [[3, 4], [9, 3], [6, 10], [12, 9], [2, 12]].forEach(([gx, gy]) => {
      ctx.fillStyle = hi; ctx.fillRect(ox + gx, gy, 2, 1);
      ctx.fillStyle = lo; ctx.fillRect(ox + gx, gy + 1, 2, 1);
    });
  })(TS * 2);

  frame(palette.worldRoad, ox => {
    ctx.fillStyle = palette.worldRoadBorder;
    ctx.fillRect(ox, 0, TS, 1); ctx.fillRect(ox, TS - 1, TS, 1);
    ctx.fillStyle = shadeColor(palette.worldRoad, 30);
    ctx.fillRect(ox + 3, 7, 3, 2); ctx.fillRect(ox + 10, 7, 3, 2);
  })(TS * 3);

  frame(palette.worldPlaza, ox => {
    const h = TS / 2;
    [[0, 0], [h, 0], [0, h], [h, h]].forEach(([dx, dy]) => {
      ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1;
      ctx.strokeRect(ox + dx + 0.5, dy + 0.5, h - 1, h - 1);
    });
  })(TS * 4);

  frame(shadeColor(palette.worldGrass, -14), ox => {
    ctx.fillStyle = palette.worldDoor;
    ctx.fillRect(ox + 3, 1, 10, 14);
    const g = ctx.createRadialGradient(ox + 8, 7, 1, ox + 8, 7, 6.5);
    g.addColorStop(0, palette.worldHighlight);
    g.addColorStop(0.6, shadeColor(palette.worldDoor, 10));
    g.addColorStop(1, shadeColor(palette.worldDoor, -40));
    ctx.fillStyle = g;
    ctx.fillRect(ox + 5, 2, 6, 11);
  })(TS * 5);

  frame(shadeColor(palette.worldGrass, -28), ox => {
    ctx.strokeStyle = palette.worldHighlight;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + 2.5, 2.5, TS - 5, TS - 5);
    const g = ctx.createRadialGradient(ox + 8, 8, 1, ox + 8, 8, 5.5);
    g.addColorStop(0, palette.worldHighlight);
    g.addColorStop(1, shadeColor(palette.worldHighlight, -45));
    ctx.fillStyle = g;
    ctx.fillRect(ox + 6, 6, 4, 4);
  })(TS * 6);

  frame(palette.worldGrass, ox => {
    ctx.fillStyle = shadeColor(palette.worldTree, -22);
    ctx.fillRect(ox + 6, 10, 4, 6);
    const g = ctx.createRadialGradient(ox + 6, 5, 1, ox + 8, 7, 7.5);
    g.addColorStop(0, shadeColor(palette.worldTree, 28));
    g.addColorStop(0.6, palette.worldTree);
    g.addColorStop(1, shadeColor(palette.worldTree, -18));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ox + 8, 7, 6.5, 0, Math.PI * 2); ctx.fill();
  })(TS * 7);

  frame(palette.worldWater, ox => {
    const g = ctx.createLinearGradient(ox, 4, ox, 10);
    g.addColorStop(0, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ox + 2, 4, TS - 4, 6);
  })(TS * 8);

  frame(palette.worldDirtPath, ox => {
    const hi = shadeColor(palette.worldDirtPath, 24), lo = shadeColor(palette.worldDirtPath, -20);
    [[3, 4], [9, 3], [6, 10], [12, 9], [2, 12]].forEach(([gx, gy]) => {
      ctx.fillStyle = hi; ctx.fillRect(ox + gx, gy, 2, 1);
      ctx.fillStyle = lo; ctx.fillRect(ox + gx, gy + 1, 2, 1);
    });
  })(TS * 9);

  frame(palette.worldSidewalk, ox => {
    const h = TS / 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox + h, 0); ctx.lineTo(ox + h, TS); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, h); ctx.lineTo(ox + TS, h); ctx.stroke();
  })(TS * 10);

  // Whole-canvas depth vignette — a subtle radial darkening toward the
  // edges, standing in for true parallax depth (see this file's own doc
  // comment on why real multi-layer parallax is out of scope here).
  const vignette = ctx.createRadialGradient(width / 2, TS / 2, TS * 2, width / 2, TS / 2, width * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.10)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, TS);
  ctx.restore();

  tex.refresh();
}

// Painterly Depth hero/NPCs: arc-drawn (not rectangle-drawn) rounded head,
// 3-tone shading (shadow/base/highlight, not 2-tone), and a genuine
// rim-light stroke on the lit silhouette edge.
function paintedBody(
  ctx: CanvasRenderingContext2D, ox: number, flip: boolean,
  hair: string, skin: string, shirt: string, pants: string, shoe: string, step: number, faceDown: boolean,
): void {
  const p = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(ox + (flip ? TS - x - w : x), y, w, h);
  };
  const outline = '#0a0a12';

  // Silhouette base (slightly rounder proportions than a flat rect body).
  p(2, 1, 12, 13, outline);

  // Head — arc-drawn for real curvature, 3-tone (shadow/base/highlight).
  const headCx = ox + (flip ? TS - 8 : 8), headCy = 5;
  ctx.fillStyle = shadeColor(skin, -18);
  ctx.beginPath(); ctx.arc(headCx, headCy, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(headCx - (flip ? -0.6 : 0.6), headCy - 0.5, 4.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shadeColor(skin, 24);
  ctx.beginPath(); ctx.arc(headCx - (flip ? -1.4 : 1.4), headCy - 1.4, 2.2, 0, Math.PI * 2); ctx.fill();
  // Hair cap.
  p(3, 1, 10, 4, hair);
  // Eyes.
  p(6, 6, 1, 1, '#1a0e08'); p(9, 6, 1, 1, '#1a0e08');

  // Torso — 3-tone.
  p(4, 9, 8, 4, shadeColor(shirt, -16));
  p(4, 9, 7, 3, shirt);
  p(4, 9, 3, 1, shadeColor(shirt, 22));
  p(4, 13, 8, 1, pants);
  const la = step === 0 ? 5 : 4, rb = step === 0 ? 9 : 10;
  p(la, 14, 2, 2, pants); p(rb, 14, 2, 2, pants);
  p(step === 0 ? 4 : 3, 15, 3, 1, shoe); p(step === 0 ? 9 : 10, 15, 3, 1, shoe);

  // Rim light: a thin bright stroke down the lit silhouette edge, a dark
  // stroke down the shadow edge — the classic painted cel-shade trick no
  // existing skin renderer here does.
  const litX = ox + (flip ? TS - 3 : 2), shadowX = ox + (flip ? 2 : TS - 3);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(litX, 2, 1, 12);
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(shadowX, 2, 1, 12);
}

function createPlayerTexture(scene: Phaser.Scene, appearance?: AppearanceToken): void {
  const tex = scene.textures.exists('player')
    ? (scene.textures.get('player') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 8, TS);

  const hair = '#4a2f8f', skin = APPEARANCE_SKIN_TONES[appearance ?? 'APPEARANCE_TONE_1'], shirt = '#3f7fe0', pants = '#28316f', shoe = '#121220';

  for (let step = 0; step < 2; step++) {
    paintedBody(ctx, step * TS, false, hair, skin, shirt, pants, shoe, step, true);
    paintedBody(ctx, (2 + step) * TS, false, hair, skin, shirt, pants, shoe, step, true);
    paintedBody(ctx, (4 + step) * TS, false, hair, skin, shirt, pants, shoe, step, false);
    paintedBody(ctx, (6 + step) * TS, true, hair, skin, shirt, pants, shoe, step, false);
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
    { hair: '#b5651d', shirt: '#e88a3a', pants: '#7a4318', skin: '#f2c085' }, // Mira
    { hair: '#39557f', shirt: '#4488cc', pants: '#243a5e', skin: '#dcc9b8' }, // Leo
    { hair: '#5a3016', shirt: '#cc4a2e', pants: '#701f10', skin: '#f4cc9c' }, // Elena
    { hair: '#232323', shirt: '#849a3e', pants: '#3e3220', skin: '#e6b892' }, // Sal
    { hair: '#9a9a9a', shirt: '#5c6c5c', pants: '#2e2e2e', skin: '#cea683' }, // Marcus
    { hair: '#dcdcdc', shirt: '#8f66a0', pants: '#554368', skin: '#e2bd9c' }, // Higgins
  ];
  cfgs.forEach((c, i) => paintedBody(ctx, i * TS, false, c.hair, c.skin, c.shirt, c.pants, '#121220', 0, true));

  tex.refresh();
  for (let i = 0; i < 6; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

export function createRenderer(): SkinRenderer {
  return { createTilesetTexture, createPlayerTexture, createNPCTextures };
}
