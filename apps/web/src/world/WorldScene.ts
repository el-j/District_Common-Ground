import Phaser from 'phaser';
import { inputManager } from './InputManager';
import { setupTilemapCollision } from './CollisionSystem';
import { PlayerEntity } from './entities/PlayerEntity';
import { NPCEntity } from './entities/NPCEntity';
import { ScrapsEntity } from './entities/ScrapsEntity';
import { PigeonEntity } from './entities/PigeonEntity';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { ConstructionModal, type ConstructionNodeData } from '../ui/ConstructionModal';
import { CrisisWireModal } from '../ui/CrisisWireModal';
import { HistoryModal } from '../ui/HistoryModal';
import { TownHallAssembly } from '../ui/TownHallAssembly';
import { SafeHavenBanner } from '../ui/SafeHavenBanner';
import { TopHUD } from '../ui/TopHUD';
import { useGameStore } from '../core/state/useGameStore';
import { BUILD_COMPLETION_THRESHOLD } from '../core/simulation/EconomyMath';
import { addTrust, spendEnergy, reduceStress } from '../core/state/actions';
import { startBGMLoop, playRain, stopRain, setBgmPhase } from '../core/audio/SoundSynth';
import { weatherTier, type WeatherTier } from './WeatherSystem';
import { fetchDailyGossip } from '../api/narrativeGossip';
import { MinigameLoader } from '../core/kernel/MinigameLoader';
import { computeViewportZoom } from './CameraViewport';
import { getActiveWorldPalette, type ResolvedWorldPalette } from '../skins/ThemeManager';
import { INTERIORS, findInteriorAtTile, type PropToken } from './InteriorProps';
import { resilienceTier, dressingTierFor, dressingPropsForTier, type DressingTier, type DressingPropToken } from './ResilienceDressing';
import { InteractionPrompt } from './InteractionPrompt';
import { AmbientLightLayer } from './AmbientLightLayer';
import { DIALOGUES, pickDialogueKey } from './NpcDialogues';

const TS = 16;
const COLS = 64;
const ROWS = 80;

const T = { FLOOR: 0, WALL: 1, GRASS: 2, ROAD: 3, PLAZA: 4, DOOR: 5, BUILT: 6 } as const;

// M21 §5 — door tile coordinates (mirrors buildMap()'s drawBuilding doorX args below),
// used as fixed "lit window" points for AmbientLightLayer's warm-glow pooling.
const DOOR_TILES: { x: number; y: number }[] = [
  { x: 31, y: 10 }, { x: 7, y: 17 }, { x: 39, y: 17 },
  { x: 5, y: 35 }, { x: 42, y: 35 },
  { x: 7, y: 61 }, { x: 39, y: 61 }, { x: 20, y: 57 },
  { x: 57, y: 12 }, { x: 57, y: 27 },
  { x: 11, y: 75 }, { x: 28, y: 75 }, { x: 46, y: 75 },
];

// ── Map helpers ───────────────────────────────────────────────────────────────

function fillRect(m: number[][], x1: number, y1: number, x2: number, y2: number, t: number): void {
  for (let y = Math.max(0, y1); y <= Math.min(ROWS - 1, y2); y++)
    for (let x = Math.max(0, x1); x <= Math.min(COLS - 1, x2); x++)
      m[y][x] = t;
}

function drawBuilding(m: number[][], x1: number, y1: number, x2: number, y2: number, doorX: number): void {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++) {
      if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
      m[y][x] = (x === x1 || x === x2 || y === y1 || y === y2) ? T.WALL : T.FLOOR;
    }
  if (y2 >= 0 && y2 < ROWS && doorX >= 0 && doorX < COLS) m[y2][doorX] = T.DOOR;
}

function buildMap(): number[][] {
  const m: number[][] = Array.from({ length: ROWS }, () =>
    Array.from<number>({ length: COLS }).fill(T.GRASS),
  );

  // Border
  fillRect(m, 0, 0, COLS - 1, 0, T.WALL);
  fillRect(m, 0, ROWS - 1, COLS - 1, ROWS - 1, T.WALL);
  fillRect(m, 0, 0, 0, ROWS - 1, T.WALL);
  fillRect(m, COLS - 1, 0, COLS - 1, ROWS - 1, T.WALL);

  // Roads
  fillRect(m, 1, 20, COLS - 2, 22, T.ROAD);   // North cross-street
  fillRect(m, 1, 41, COLS - 2, 43, T.ROAD);   // South cross-street
  fillRect(m, 1, 63, COLS - 2, 65, T.ROAD);   // Solar Quarter border road
  fillRect(m, 49, 1, 51, ROWS - 2, T.ROAD);   // East Canal access road

  // Central plaza floor
  fillRect(m, 9, 23, 38, 40, T.PLAZA);

  // South courtyard
  fillRect(m, 15, 46, 32, 60, T.PLAZA);

  // ── North Transit Hub (rows 0–15) ──────────────────────────────────────────
  // Rail platform
  fillRect(m, 3, 2, 26, 14, T.FLOOR);
  fillRect(m, 3, 2, 26, 2, T.WALL);    // platform edge north
  fillRect(m, 3, 14, 26, 14, T.ROAD);  // track strip
  // Ticket booth
  drawBuilding(m, 28, 3, 34, 10, 31);
  // Cargo dock
  fillRect(m, 36, 3, 46, 13, T.FLOOR);
  fillRect(m, 36, 3, 46, 3, T.WALL);

  // ── Original north buildings (shifted east) ────────────────────────────────
  drawBuilding(m, 2, 2, 13, 17, 7);     // High-Rise / Corporate Block
  drawBuilding(m, 33, 2, 46, 17, 39);   // Utility Station

  // ── Central buildings ──────────────────────────────────────────────────────
  drawBuilding(m, 2, 24, 8, 35, 5);     // Town Hall
  drawBuilding(m, 39, 24, 46, 35, 42);  // Tool Library / Old Warehouse

  // ── South buildings (original zone) ───────────────────────────────────────
  drawBuilding(m, 2, 45, 13, 61, 7);    // Apartment Block A
  drawBuilding(m, 33, 45, 46, 61, 39);  // Apartment Block B
  drawBuilding(m, 17, 49, 23, 57, 20);  // Corner Grocer / Community Fridge

  // ── East Canal zone (cols 52–62) ──────────────────────────────────────────
  fillRect(m, 52, 5, 62, 38, T.PLAZA);   // canal walkway
  fillRect(m, 53, 15, 62, 17, T.ROAD);   // flood dike strip
  fillRect(m, 53, 28, 62, 30, T.ROAD);   // second dike
  drawBuilding(m, 54, 5, 61, 12, 57);    // East Canal community building
  drawBuilding(m, 54, 20, 61, 27, 57);   // Flood management office

  // ── South Solar Quarter (rows 66–78) ──────────────────────────────────────
  fillRect(m, 5, 66, 58, 78, T.PLAZA);  // rooftop plaza
  drawBuilding(m, 5, 66, 18, 75, 11);   // Solar building A
  drawBuilding(m, 22, 66, 35, 75, 28);  // Greenhouse garden node
  drawBuilding(m, 40, 66, 53, 75, 46);  // Solar building B
  fillRect(m, 7, 77, 55, 78, T.BUILT);  // Completed solar field (decorative)

  return m;
}

// ── Tileset (7 tile types, 112×16 canvas) ─────────────────────────────────────

/** Lightens (positive percent) or darkens (negative) a `#rrggbb` hex color — used to
 * derive secondary shades (mortar lines, brick courses, speckle) from the
 * skin's 9 world-tile palette fields without needing a dozen more fields. */
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

function createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void {
  let tex = scene.textures.exists('tileset')
    ? (scene.textures.get('tileset') as Phaser.Textures.CanvasTexture)
    : scene.textures.createCanvas('tileset', TS * 7, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, TS * 7, TS);

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

  tex.refresh();
}

// ── Player spritesheet (8 frames × 16px = 128×16) ────────────────────────────

function createPlayerTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('player', TS * 8, TS);
  if (!tex) throw new Error('player canvas failed');
  const ctx = tex.getContext();

  const C = { hair: '#6644bb', skin: '#f0c090', shirt: '#4477dd', pants: '#2a44bb', shoe: '#111130', eye: '#180e08', shirtSh: '#3360cc' };

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

// ── NPC spritesheet (3 characters × 16px = 48×16) ────────────────────────────

function createNPCTextures(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('npcs', TS * 6, TS);
  if (!tex) throw new Error('npc canvas failed');
  const ctx = tex.getContext();

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

// ── WorldScene ─────────────────────────────────────────────────────────────────


interface FlyerObject {
  sprite: Phaser.GameObjects.Rectangle;
  x: number;
  y: number;
}

export class WorldScene extends Phaser.Scene {
  private static hud: TopHUD | null = null;
  private player!: PlayerEntity;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private thumbstickGraphic!: Phaser.GameObjects.Graphics;
  private npcs: NPCEntity[] = [];
  private npcSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private constructionNodes: ConstructionNodeData[] = [];
  private nodeMarkers: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private dialogueOpen = false;
  private buildOpen = false;
  private crisisOpen = false;
  private historyOpen = false;
  private assemblyOpen = false;
  private safeHavenOpen = false;
  private safeHavenShown = false;
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private completedIds = new Set<string>();
  private scraps!: ScrapsEntity;
  private pigeons: PigeonEntity[] = [];
  private flyers: FlyerObject[] = [];
  private divisionCrisisActive = false;
  private ticksSinceDay = 0;
  private bgmStarted = false;
  private tintOverlay!: Phaser.GameObjects.Rectangle;
  private prevDay = 0;
  private lastTintHash = -1;
  private streetlamps: Phaser.GameObjects.Arc[] = [];
  private weatherOverlay!: Phaser.GameObjects.Rectangle;
  private rainDrops: Phaser.GameObjects.Rectangle[] = [];
  private currentWeatherTier: WeatherTier = 'none';
  private lastLampAlpha = -1;

  // M21 — camera/palette/dressing/juice state
  private lastSkinRevision = -1;
  private currentInteriorId: string | null = null;
  private nodePrompts: Map<string, InteractionPrompt> = new Map();
  private npcPrompts: Map<string, InteractionPrompt> = new Map();
  private bikePrompt!: InteractionPrompt;
  private dressingSprites: Phaser.GameObjects.Rectangle[] = [];
  private currentDressingTier: DressingTier | null = null;
  private ambientLight: AmbientLightLayer | null = null;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private npcShadows: Map<string, Phaser.GameObjects.Ellipse> = new Map();
  private followingPlayer = true;

  // Courier Rush Cargo Bike portal (near Sal's Kitchen / Grocer)
  private bikePortal = { x: 18 * TS + TS / 2, y: 55 * TS + TS / 2 };
  private bikeMarker!: Phaser.GameObjects.Graphics;
  private minigameOpen = false;

  // M27 — the 4 new built-in minigames, one per remaining M14-contract
  // category, each placed near the construction node or NPC its theme ties
  // to: Tenant Rights Match near the Legal Fund/Leo, Kitchen Rush near the
  // Community Kitchen/Mira & Sal, Solidarity Line near the Land Trust/Higgins,
  // Tool Workshop inside the Tool Library near Marcus.
  private readonly minigamePortals: {
    id: string; label: string; emoji: string; color: number; position: { x: number; y: number };
  }[] = [
    { id: 'tenant-match',    label: 'Tenant Rights Match', emoji: '📜', color: 0x60a5fa, position: { x: 30 * TS + TS / 2, y: 31 * TS + TS / 2 } },
    { id: 'kitchen-rush',    label: 'Kitchen Rush',        emoji: '🍲', color: 0xf59e0b, position: { x: 24 * TS + TS / 2, y: 58 * TS + TS / 2 } },
    { id: 'solidarity-line', label: 'Solidarity Line',     emoji: '🛡️', color: 0x5eead4, position: { x: 32 * TS + TS / 2, y: 37 * TS + TS / 2 } },
    { id: 'tool-workshop',   label: 'Tool Workshop',       emoji: '🛠️', color: 0xfacc15, position: { x: 44 * TS + TS / 2, y: 32 * TS + TS / 2 } },
  ];
  private minigamePortalPrompts: Map<string, InteractionPrompt> = new Map();

  // Town Hall interaction point (door at col 5, row 35)
  private static readonly TOWN_HALL = { x: 5 * 16 + 8, y: 35 * 16 + 8 };

  public static setHud(hud: TopHUD): void { WorldScene.hud = hud; }

  constructor() { super({ key: 'WorldScene' }); }

  preload(): void {
    createTilesetTexture(this, getActiveWorldPalette());
    createPlayerTexture(this);
    createNPCTextures(this);
  }

  create(): void {
    const mapData = buildMap();
    const map = this.make.tilemap({ data: mapData, tileWidth: TS, tileHeight: TS });
    const tileset = map.addTilesetImage('tiles', 'tileset', TS, TS, 0, 0);
    if (!tileset) throw new Error('tileset missing');
    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('layer failed');
    this.layer = layer as Phaser.Tilemaps.TilemapLayer;
    layer.setCollision([T.WALL]);

    const worldW = COLS * TS, worldH = ROWS * TS;
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Player — starts in south courtyard
    const px = 25 * TS + TS / 2, py = 53 * TS + TS / 2;
    const sprite = this.physics.add.sprite(px, py, 'player', 0);
    sprite.setCollideWorldBounds(true);
    (sprite.body as Phaser.Physics.Arcade.Body).setSize(10, 10);

    this.anims.create({ key: 'walk_down',  frames: [{ key:'player',frame:0 },{ key:'player',frame:1 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_up',    frames: [{ key:'player',frame:2 },{ key:'player',frame:3 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_left',  frames: [{ key:'player',frame:4 },{ key:'player',frame:5 }], frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'walk_right', frames: [{ key:'player',frame:6 },{ key:'player',frame:7 }], frameRate: 6, repeat: -1 });

    setupTilemapCollision(this, sprite, layer as Phaser.Tilemaps.TilemapLayer);
    this.player = new PlayerEntity(sprite);

    // Construction nodes (A–E)
    this.constructionNodes = [
      { id: 'kitchen',     label: 'Community Kitchen & Fridge', position: { x: 20*TS+TS/2, y: 58*TS+TS/2 }, progressKey: 'kitchenProgress' },
      { id: 'solar',       label: 'Rooftop Solar Cooperative',  position: { x: 24*TS+TS/2, y: 8*TS+TS/2  }, progressKey: 'solarGridProgress' },
      { id: 'legal',       label: 'Legal Defense Fund',          position: { x: 23*TS+TS/2, y: 31*TS+TS/2 }, progressKey: 'legalFundProgress' },
      { id: 'toolLibrary', label: 'Community Tool Library',      position: { x: 42*TS+TS/2, y: 30*TS+TS/2 }, progressKey: 'toolLibraryProgress' },
      { id: 'landTrust',   label: 'Community Land Trust',        position: { x: 25*TS+TS/2, y: 36*TS+TS/2 }, progressKey: 'landTrustProgress' },
    ];
    this.constructionNodes.forEach(node => {
      const g = this.add.graphics();
      this.drawNodeMarker(g, node.position.x, node.position.y, false);
      g.setDepth(4);
      this.nodeMarkers.set(node.id, g);
      // M21 §7 — bobbing bounce-bubble proximity prompt, layered above the
      // always-visible location ring so the ring still helps navigation
      // from a distance while the bubble signals "you can act here now".
      this.nodePrompts.set(node.id, new InteractionPrompt(this, node.position.x, node.position.y, '🔨'));
    });

    // NPCs
    this.npcs = [
      new NPCEntity({ id:'mira',    token:'NPC_NEIGHBOR',  name:'Mira',         position:{ x:27*TS+TS/2, y:53*TS+TS/2 }, proximity:38, dialogueKey:'mira_intro'    }, ()=>undefined),
      new NPCEntity({ id:'leo',     token:'NPC_NEIGHBOR',  name:'Leo',          position:{ x:26*TS+TS/2, y:31*TS+TS/2 }, proximity:38, dialogueKey:'leo_intro'     }, ()=>undefined),
      new NPCEntity({ id:'elena',   token:'NPC_ORGANIZER', name:'Elena',        position:{ x:24*TS+TS/2, y:11*TS+TS/2 }, proximity:38, dialogueKey:'elena_intro'   }, ()=>undefined),
      // M26 — three new NPCs, each placed near the construction node or
      // zone their dossier ties to (docs/planning/09-NPC-SOCIAL-NETWORK-
      // AND-RELATIONSHIPS.md): Sal near the South courtyard/kitchen, Marcus
      // by the Tool Library node, Higgins by the Land Trust node.
      new NPCEntity({ id:'sal',     token:'NPC_NEIGHBOR',  name:'Sal',          position:{ x:21*TS+TS/2, y:56*TS+TS/2 }, proximity:38, dialogueKey:'sal_intro'     }, ()=>undefined),
      new NPCEntity({ id:'marcus',  token:'NPC_ORGANIZER', name:'Marcus',       position:{ x:40*TS+TS/2, y:29*TS+TS/2 }, proximity:38, dialogueKey:'marcus_intro'  }, ()=>undefined),
      new NPCEntity({ id:'higgins', token:'NPC_NEIGHBOR',  name:'Mrs. Higgins', position:{ x:27*TS+TS/2, y:36*TS+TS/2 }, proximity:38, dialogueKey:'higgins_intro' }, ()=>undefined),
    ];
    const npcFrame: Record<string, number> = { mira:0, leo:1, elena:2, sal:3, marcus:4, higgins:5 };
    this.npcs.forEach(npc => {
      const img = this.add.image(npc.position.x, npc.position.y, 'npcs', npcFrame[npc.id] ?? 0);
      img.setDepth(5);
      this.npcSprites.set(npc.id, img);
      // M21 §5 — soft drop-shadow ellipse under each NPC (below the sprite's depth 5)
      const shadow = this.add.ellipse(npc.position.x, npc.position.y + 6, 12, 5, 0x000000, 0.3).setDepth(4.5);
      this.npcShadows.set(npc.id, shadow);
      // M21 §7 — proximity bounce-bubble
      this.npcPrompts.set(npc.id, new InteractionPrompt(this, npc.position.x, npc.position.y, '💬'));
    });

    // Fetch daily gossip and inject into NPC dialogue trees
    void fetchDailyGossip(useGameStore.getState().meta.day).then(gossipMap => {
      this.npcs.forEach(npc => {
        const line = gossipMap[npc.id];
        if (line) npc.setGossip(line);
      });
    });

    // Zone labels
    const lStyle = { fontFamily: 'monospace', fontSize: '9px', color: '#555577', alpha: 0.6 };
    this.add.text(COLS/2*TS, 1*TS+4,  '— NORTH — TRANSIT HUB —', lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 23*TS+4, '— CENTRAL PLAZA —',       lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 44*TS+4, '— SOUTH QUARTER —',       lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(55*TS, 20*TS,       '— EAST CANAL —',          lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 66*TS+4, '— SOUTH SOLAR QUARTER —', lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);

    // Courier Rush Cargo Bike Portal (Glowing cyan circle)
    this.bikeMarker = this.add.graphics();
    this.bikeMarker.fillStyle(0x38bdf8, 0.35);
    this.bikeMarker.fillCircle(this.bikePortal.x, this.bikePortal.y, 14);
    this.bikeMarker.lineStyle(2, 0x38bdf8, 0.85);
    this.bikeMarker.strokeCircle(this.bikePortal.x, this.bikePortal.y, 14);
    this.bikeMarker.setDepth(4);
    this.add.text(this.bikePortal.x, this.bikePortal.y - 18, '🚲 Courier Rush', {
      fontSize: '8px',
      color: '#38bdf8',
      backgroundColor: 'rgba(15,23,42,0.7)',
      padding: { x: 3, y: 1 },
    }).setOrigin(0.5, 1).setDepth(4);
    this.bikePrompt = new InteractionPrompt(this, this.bikePortal.x, this.bikePortal.y, '🚲');

    // M27 — the 4 new minigame portals, same glowing-circle + label + bounce
    // prompt treatment as the Courier Rush bike portal above.
    this.minigamePortals.forEach(portal => {
      const marker = this.add.graphics();
      marker.fillStyle(portal.color, 0.35);
      marker.fillCircle(portal.position.x, portal.position.y, 14);
      marker.lineStyle(2, portal.color, 0.85);
      marker.strokeCircle(portal.position.x, portal.position.y, 14);
      marker.setDepth(4);
      const colorHex = `#${portal.color.toString(16).padStart(6, '0')}`;
      this.add.text(portal.position.x, portal.position.y - 18, `${portal.emoji} ${portal.label}`, {
        fontSize: '8px',
        color: colorHex,
        backgroundColor: 'rgba(15,23,42,0.7)',
        padding: { x: 3, y: 1 },
      }).setOrigin(0.5, 1).setDepth(4);
      this.minigamePortalPrompts.set(portal.id, new InteractionPrompt(this, portal.position.x, portal.position.y, portal.emoji));
    });

    // Subscribe to crisis state to spawn/remove division flyers
    useGameStore.subscribe((state) => {
      const crisis = state.crisisState;
      const id = crisis.activeCrisisId;
      const isDivision = id != null && (
        id.includes('division') || id.includes('agitation')
      );
      if (isDivision && !this.divisionCrisisActive) {
        this.divisionCrisisActive = true;
        this.spawnFlyers();
      } else if (!isDivision && this.divisionCrisisActive) {
        this.divisionCrisisActive = false;
        this.removeAllFlyers();
      }
    });

    // Camera — M21 §1: viewport-independent zoom so the camera always frames
    // a fixed 12×10 tile count regardless of the player's window/monitor
    // size (Scale.RESIZE otherwise lets the effective FOV in tiles balloon
    // on wide desktop monitors — the actual "Ant Farm" root cause, not the
    // zoom API). The startFollow lerp (0.1, 0.1) already matched the spec's
    // own recommendation and is unchanged.
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(computeViewportZoom(this.scale.width, this.scale.height, TS));
    this.cameras.main.setDeadzone(16, 16);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#1a2c18');
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.cameras.main.setZoom(computeViewportZoom(gameSize.width, gameSize.height, TS));
      this.ambientLight?.resize(gameSize.width, gameSize.height);
    });

    // Rebuild the tileset whenever a skin manifest's real data is applied —
    // same "recolor without a scene restart" mechanism switchSkin() already
    // uses for HUD colors (Test 21.2). M28: keyed on `skinRevision`, not
    // `activeSkin`, because on first boot the active skin's *id* never
    // changes (it's already the default) even though its real palette data
    // only becomes available once the manifest fetch resolves — see
    // ThemeManager.activateDefaultSkin()'s doc comment for the full bug.
    this.lastSkinRevision = useGameStore.getState().meta.skinRevision;
    useGameStore.subscribe((state) => {
      if (state.meta.skinRevision !== this.lastSkinRevision) {
        this.lastSkinRevision = state.meta.skinRevision;
        createTilesetTexture(this, getActiveWorldPalette());
      }
    });

    // Input
    inputManager.init(this);
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.thumbstickGraphic = this.add.graphics();
    this.thumbstickGraphic.setScrollFactor(0);
    this.thumbstickGraphic.setDepth(100);

    // Resilience visual tier — apply initial state and subscribe to changes.
    // M21 §4: also swap the small set of street-front world-dressing props
    // (boarded shopfronts / market stalls / flower planters), layered
    // independently from these CSS filter classes, which stay exactly as-is.
    this.applyResilienceTier(useGameStore.getState().commons.resilienceScore);
    this.updateWorldDressing(useGameStore.getState().commons.resilienceScore);
    useGameStore.subscribe((state) => {
      this.applyResilienceTier(state.commons.resilienceScore);
      this.updateWorldDressing(state.commons.resilienceScore);
    });

    // M21 §3 — Interior Furnishing: named-room props (Pip's Courier Room,
    // Community Kitchen, Town Assembly Hall)
    this.renderInteriorProps();

    // M21 §5 — soft drop-shadow ellipse under the player
    this.playerShadow = this.add.ellipse(sprite.x, sprite.y + 6, 12, 5, 0x000000, 0.3).setDepth(4.5);

    // Scraps the cat
    this.scraps = new ScrapsEntity(this, 160, 53 * 16);

    // Pigeons in Central Plaza (4–6 birds)
    const pigeonBounds = new Phaser.Geom.Rectangle(9 * TS, 23 * TS, 29 * TS, 17 * TS);
    const pigeonCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pigeonCount; i++) {
      const px = pigeonBounds.x + Math.random() * pigeonBounds.width;
      const py = pigeonBounds.y + Math.random() * pigeonBounds.height;
      this.pigeons.push(new PigeonEntity(this, px, py, pigeonBounds));
    }

    this.spawnStreetlamps();

    // Tint overlay for day/night lighting (depth 90, scrollFactor 0 = fixed to screen)
    const screenW = this.scale.width, screenH = this.scale.height;
    this.tintOverlay = this.add.rectangle(screenW / 2, screenH / 2, screenW * 4, screenH * 4, 0x220044, 0)
      .setScrollFactor(0).setDepth(90);

    // Weather overlay (M10 follow-up 2026-09-15): frost tint layers above the
    // day/night tint (depth 91) so the two compose instead of one CSS filter
    // clobbering the other. Rain is a small pool of falling streak rectangles
    // (depth 92), animated in update() only while raining — same
    // rectangle-primitive style as spawnStreetlamps()/spawnFlyers(), no new
    // Phaser subsystem introduced for one effect.
    this.weatherOverlay = this.add.rectangle(screenW / 2, screenH / 2, screenW * 4, screenH * 4, 0xaad4ff, 0)
      .setScrollFactor(0).setDepth(91);
    for (let i = 0; i < 40; i++) {
      const drop = this.add.rectangle(
        Math.random() * screenW,
        Math.random() * screenH,
        2, 12, 0xcfe8ff, 0,
      ).setScrollFactor(0).setDepth(92).setAngle(12);
      this.rainDrops.push(drop);
    }

    // M21 §5 — ambient warm-light "juice" layer: a separate multiply-blended
    // HTML canvas above the Phaser canvas (not a second CSS `filter:` rule —
    // filters on the same element don't compose, same lesson M10's
    // frost/rain overlays already applied).
    const gameContainerEl = document.getElementById('game-container');
    if (gameContainerEl) {
      this.ambientLight = new AmbientLightLayer(gameContainerEl);
      this.ambientLight.resize(screenW, screenH);
    }

    this.updateWeather(weatherTier(useGameStore.getState().pulseState?.multipliers.heat ?? 1.0));
    useGameStore.subscribe((state) => {
      this.updateWeather(weatherTier(state.pulseState?.multipliers.heat ?? 1.0));
    });

    // Track day advances for day/night cycle
    this.prevDay = useGameStore.getState().meta.day;
    useGameStore.subscribe((state) => {
      if (state.meta.day !== this.prevDay) {
        this.ticksSinceDay = 0;
        this.prevDay = state.meta.day;
      }
    });
  }

  update(_time: number, delta: number): void {
    inputManager.update();

    // Start BGM on first player movement
    if (!this.bgmStarted) {
      const dir = inputManager.getDirection();
      if (dir.dx !== 0 || dir.dy !== 0) {
        this.bgmStarted = true;
        startBGMLoop();
      }
    }

    this.player.update(delta);

    // Day/night cycle: advance ticks, update camera tint every ~500ms
    this.ticksSinceDay += delta;
    this.updateDayNight();
    this.updateRainDrops(delta);
    this.updateInteriorFraming();
    this.updateShadowsAndLight();

    // Scraps
    const ePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
    this.scraps.update(this.player.x, this.player.y, ePressed, delta);

    this.npcs.forEach(npc => npc.update(this.player.x, this.player.y));
    this.pigeons.forEach(p => p.update(this.player.x, this.player.y, delta));
    this.syncCompletedBuilds();
    this.updateZone();
    this.checkCrisis();
    this.checkAssembly();
    this.checkSafeHaven();
    this.handleInteractions();
    this.drawThumbstick();
  }

  private spawnStreetlamps(): void {
    // Evenly spaced glowing lamp posts along each road strip; only visible at night.
    const roadRows = [21, 42, 64]; // North / South cross-streets + Solar Quarter border road
    for (const row of roadRows) {
      for (let col = 4; col < COLS - 2; col += 8) {
        this.streetlamps.push(this.createLampGlow(col * TS + TS / 2, row * TS + TS / 2));
      }
    }
    const canalCol = 50; // East Canal access road
    for (let row = 4; row < ROWS - 2; row += 8) {
      this.streetlamps.push(this.createLampGlow(canalCol * TS + TS / 2, row * TS + TS / 2));
    }
  }

  private createLampGlow(x: number, y: number): Phaser.GameObjects.Arc {
    return this.add.circle(x, y, TS * 1.5, 0xffdd88, 0.35)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4)
      .setAlpha(0);
  }

  private updateStreetlamps(nightStrength: number): void {
    if (nightStrength === this.lastLampAlpha) return;
    this.lastLampAlpha = nightStrength;
    for (const lamp of this.streetlamps) lamp.setAlpha(nightStrength * 0.35);
  }

  private updateDayNight(): void {
    const cycleDuration = 120_000;
    const phase = (this.ticksSinceDay % cycleDuration) / cycleDuration;

    // Per-channel lerp helper to avoid raw-integer colour corruption
    const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
    const rgb = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

    let color = 0x110022, alpha = 0;
    if (phase < 0.25) {
      const t = phase / 0.25;
      color = rgb(lerp(0xff, 0x44, t), lerp(0xaa, 0x22, t), lerp(0x44, 0x66, t));
      alpha = (1 - t) * 0.16;
    } else if (phase < 0.5) {
      const t = (phase - 0.25) / 0.25;
      color = rgb(lerp(0x44, 0xcc, t), lerp(0x22, 0x66, t), lerp(0x66, 0x22, t));
      alpha = t * 0.12;
    } else if (phase < 0.75) {
      const t = (phase - 0.5) / 0.25;
      color = rgb(lerp(0xcc, 0x11, t), lerp(0x66, 0x00, t), lerp(0x22, 0x22, t));
      alpha = 0.12 + t * 0.14;
    } else {
      const t = (phase - 0.75) / 0.25;
      color = 0x110022;
      alpha = 0.26 * (1 - t);
    }

    const nightStrength = Math.min(1, alpha / 0.26);
    this.updateStreetlamps(nightStrength);
    // M23 §6 — same overlay-darkness signal already driving the streetlamps
    // now also selects the BGM's night progression on its next bar.
    setBgmPhase(nightStrength > 0.5 ? 'night' : 'day');

    // Only call setFillStyle when the value meaningfully changes (prevents 60fps redraws)
    const hash = color * 1000 + Math.round(alpha * 500);
    if (hash === this.lastTintHash) return;
    this.lastTintHash = hash;
    this.tintOverlay.setFillStyle(color, alpha);
  }

  private checkCrisis(): void {
    if (this.crisisOpen) return;
    const { activeCrisisId } = useGameStore.getState().crisisState;
    if (!activeCrisisId) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.crisisOpen = true;
    new CrisisWireModal(uiRoot, activeCrisisId, () => { this.crisisOpen = false; });
  }

  private checkAssembly(): void {
    if (this.assemblyOpen || this.crisisOpen || this.dialogueOpen || this.buildOpen) return;
    if (!TownHallAssembly.shouldOpen()) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.assemblyOpen = true;
    new TownHallAssembly(uiRoot, () => { this.assemblyOpen = false; });
  }

  private checkSafeHaven(): void {
    if (this.safeHavenShown || this.safeHavenOpen) return;
    if (!useGameStore.getState().commons.safeHavenUnlocked) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.safeHavenOpen = true;
    this.safeHavenShown = true;
    new SafeHavenBanner(uiRoot, () => { this.safeHavenOpen = false; });
  }

  private spawnFlyers(): void {
    // 3–5 flyers near alley tiles around south courtyard
    const positions = [
      { x: 14 * TS, y: 50 * TS }, { x: 7 * TS,  y: 47 * TS },
      { x: 34 * TS, y: 48 * TS }, { x: 28 * TS, y: 62 * TS },
      { x: 11 * TS, y: 44 * TS },
    ];
    positions.slice(0, 3 + Math.floor(Math.random() * 3)).forEach(pos => {
      const sprite = this.add.rectangle(pos.x, pos.y, 10, 7, 0xeecc22).setDepth(3);
      this.flyers.push({ sprite, x: pos.x, y: pos.y });
    });
  }

  private removeAllFlyers(): void {
    this.flyers.forEach(f => f.sprite.destroy());
    this.flyers = [];
  }

  private updateZone(): void {
    const px = this.player.x;
    const py = this.player.y;
    let zone = '';
    if (px > 50 * TS) {
      zone = 'East Canal';
    } else if (py < 20 * TS) {
      zone = 'North — Transit Hub';
    } else if (py > 65 * TS) {
      zone = 'South Solar Quarter';
    } else if (py > 44 * TS) {
      zone = 'South Quarter';
    } else if (py > 23 * TS && py < 40 * TS) {
      zone = 'Central Plaza';
    }
    WorldScene.hud?.setZone(zone);
  }

  private handleInteractions(): void {
    if (this.crisisOpen) { WorldScene.hud?.hideAction(); return; }

    // M21 §7 — bounce-bubble proximity prompts (Test 21.6): appear as soon as
    // the player enters each interactable's own radius, not just the single
    // nearest one used for the actual [E] action below.
    this.npcs.forEach(npc => {
      const prompt = this.npcPrompts.get(npc.id);
      if (!prompt) return;
      if (npc.isActive) prompt.show(); else prompt.hide();
    });
    this.constructionNodes.forEach(node => {
      const prompt = this.nodePrompts.get(node.id);
      if (!prompt) return;
      const dx = this.player.x - node.position.x, dy = this.player.y - node.position.y;
      if (Math.hypot(dx, dy) <= 42) prompt.show(); else prompt.hide();
    });
    {
      const dx = this.player.x - this.bikePortal.x, dy = this.player.y - this.bikePortal.y;
      if (Math.hypot(dx, dy) <= 38) this.bikePrompt.show(); else this.bikePrompt.hide();
    }
    this.minigamePortals.forEach(portal => {
      const prompt = this.minigamePortalPrompts.get(portal.id);
      if (!prompt) return;
      const dx = this.player.x - portal.position.x, dy = this.player.y - portal.position.y;
      if (Math.hypot(dx, dy) <= 38) prompt.show(); else prompt.hide();
    });

    const nearbyNpc = this.npcs.find(npc => npc.isActive);
    const nearbyBuild = this.constructionNodes.find(node => {
      const dx = this.player.x - node.position.x, dy = this.player.y - node.position.y;
      return Math.hypot(dx, dy) <= 42;
    });
    const th = WorldScene.TOWN_HALL;
    const nearTownHall = Math.hypot(this.player.x - th.x, this.player.y - th.y) <= 48;

    // Scraps feed (only when player has cash)
    const scrapsDist = Math.hypot(this.player.x - this.scraps['sprite']['x'], this.player.y - this.scraps['sprite']['y']);
    const scrapsInRange = scrapsDist < 48;
    const hasCash = useGameStore.getState().player.cash > 0;

    // Nearest flyer
    const nearbyFlyer = this.flyers.find(f =>
      Math.hypot(this.player.x - f.x, this.player.y - f.y) <= 32,
    );

    // Courier Rush bike portal interaction
    const nearBike = Math.hypot(this.player.x - this.bikePortal.x, this.player.y - this.bikePortal.y) <= 38;
    // M27 — nearest of the 4 new minigame portals, same radius as the bike
    const nearMinigamePortal = this.minigamePortals.find(portal =>
      Math.hypot(this.player.x - portal.position.x, this.player.y - portal.position.y) <= 38,
    );

    if (!this.dialogueOpen && !this.buildOpen && !this.historyOpen && !this.assemblyOpen && !this.minigameOpen) {
      const pressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);
      if (pressed) {
        if (nearbyFlyer) {
          this.tearDownFlyer(nearbyFlyer);
        } else if (nearBike) {
          this.launchCourierRush();
        } else if (nearMinigamePortal) {
          this.launchWorldMinigame(nearMinigamePortal.id);
        } else if (scrapsInRange && hasCash) {
          this.feedScraps();
        } else if (nearTownHall) {
          this.openHistory();
        } else if (nearbyBuild) {
          this.openBuild(nearbyBuild);
        } else if (nearbyNpc) {
          this.openTalk(nearbyNpc);
        }
      }
    }

    if (this.dialogueOpen || this.buildOpen || this.historyOpen || this.assemblyOpen || this.minigameOpen) {
      WorldScene.hud?.hideAction();
    } else if (nearbyFlyer) {
      WorldScene.hud?.setAction('Tear down flyer ✊', () => this.tearDownFlyer(nearbyFlyer));
    } else if (nearBike) {
      WorldScene.hud?.setAction('Deliver Soup (Courier Rush) 🚲', () => this.launchCourierRush());
    } else if (nearMinigamePortal) {
      WorldScene.hud?.setAction(`${nearMinigamePortal.label} ${nearMinigamePortal.emoji}`, () => this.launchWorldMinigame(nearMinigamePortal.id));
    } else if (scrapsInRange && hasCash) {
      WorldScene.hud?.setAction('Feed Scraps 🐟', () => this.feedScraps());
    } else if (nearTownHall) {
      WorldScene.hud?.setAction('Town Hall 📜', () => this.openHistory());
    } else if (nearbyBuild) {
      WorldScene.hud?.setAction('Build 🔨', () => this.openBuild(nearbyBuild));
    } else if (nearbyNpc) {
      WorldScene.hud?.setAction('Talk 💬', () => this.openTalk(nearbyNpc));
    } else {
      WorldScene.hud?.hideAction();
    }
  }

  private launchCourierRush(): void {
    if (this.minigameOpen) return;
    this.minigameOpen = true;
    WorldScene.hud?.hideAction();

    void MinigameLoader.launchMinigame('courier-rush', {
      onClose: () => {
        this.minigameOpen = false;
      },
    });
  }

  /** M27 — shared launcher for the 4 new minigame portals (courier-rush keeps
   * its own dedicated method above since it predates this generic one). */
  private launchWorldMinigame(id: string): void {
    if (this.minigameOpen) return;
    this.minigameOpen = true;
    WorldScene.hud?.hideAction();

    void MinigameLoader.launchMinigame(id, {
      onClose: () => {
        this.minigameOpen = false;
      },
    });
  }

  private feedScraps(): void {
    const state = useGameStore.getState();
    if (state.player.cash <= 0) return;
    useGameStore.setState(s => ({
      player: {
        ...s.player,
        cash: Math.max(0, s.player.cash - 1),
        stressLevel: Math.max(0, s.player.stressLevel - 10),
      },
    }));
    this.scraps['spawnHearts']();
  }

  private tearDownFlyer(flyer: FlyerObject): void {
    flyer.sprite.destroy();
    this.flyers = this.flyers.filter(f => f !== flyer);
    addTrust(5);
    spendEnergy(2);
    // Show brief confirmation
    const txt = this.add.text(flyer.x, flyer.y - 12, '✊ +5 Trust', {
      fontSize: '10px', color: '#88ff88', backgroundColor: '#1a2a1a', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(20);
    this.tweens.add({
      targets: txt, y: txt.y - 24, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
    reduceStress(0); // placeholder — community effect captured in trust
  }

  private openHistory(): void {
    if (this.historyOpen || this.dialogueOpen || this.buildOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.historyOpen = true;
    new HistoryModal(uiRoot, () => { this.historyOpen = false; WorldScene.hud?.hideAction(); });
  }

  private syncCompletedBuilds(): void {
    const state = useGameStore.getState();
    this.constructionNodes.forEach(node => {
      if (state.commons[node.progressKey] >= BUILD_COMPLETION_THRESHOLD && !this.completedIds.has(node.id)) {
        this.completedIds.add(node.id);
        const tx = Math.floor(node.position.x / TS), ty = Math.floor(node.position.y / TS);
        this.layer.putTileAt(T.BUILT, tx, ty);
        const g = this.nodeMarkers.get(node.id);
        if (g) { g.clear(); this.drawNodeMarker(g, node.position.x, node.position.y, true); }
      }
    });
  }

  private drawNodeMarker(g: Phaser.GameObjects.Graphics, x: number, y: number, done: boolean): void {
    const col = done ? 0x44cc88 : 0x5566ff;
    const ring = done ? 0x88ffbb : 0xaabbff;
    g.fillStyle(col, 0.8); g.fillCircle(x, y, 7);
    g.lineStyle(1.5, ring, 1); g.strokeCircle(x, y, 7);
  }

  private openBuild(node: ConstructionNodeData): void {
    if (this.buildOpen || this.dialogueOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.buildOpen = true;
    new ConstructionModal(uiRoot, node.progressKey, () => { this.buildOpen = false; WorldScene.hud?.hideAction(); });
  }

  private openTalk(npc: NPCEntity): void {
    if (this.dialogueOpen || this.buildOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.dialogueOpen = true;

    const day = useGameStore.getState().meta.day;
    const dialogueKey = pickDialogueKey(npc.id, day);
    const baseTree = DIALOGUES[dialogueKey] ?? DIALOGUES['mira_intro'];
    const tree: typeof baseTree = { ...baseTree };

    const gossip = npc.gossipLine;
    if (gossip) {
      const gossipKey = `${dialogueKey}_rumor`;
      const startNode = tree[dialogueKey];
      if (startNode) {
        tree[npc.dialogueKey] = {
          ...startNode,
          responses: [
            ...startNode.responses,
            { label: 'Heard anything lately?', next: gossipKey },
          ],
        };
      }
      tree[gossipKey] = {
        text: gossip,
        mood: 'tired',
        responses: [{ label: 'Good to know', next: null }],
      };
    }

    new DialogueOverlay(uiRoot, tree, dialogueKey, npc.name, () => { this.dialogueOpen = false; WorldScene.hud?.hideAction(); });
  }

  private updateWeather(tier: WeatherTier): void {
    if (tier === this.currentWeatherTier) return;
    this.currentWeatherTier = tier;

    this.weatherOverlay.setFillStyle(0xaad4ff, tier === 'frost' ? 0.16 : 0);

    const raining = tier === 'rain';
    for (const drop of this.rainDrops) drop.setAlpha(raining ? 0.35 : 0);
    if (raining) {
      playRain();
    } else {
      stopRain();
    }
  }

  private updateRainDrops(delta: number): void {
    if (this.currentWeatherTier !== 'rain') return;
    const screenW = this.scale.width, screenH = this.scale.height;
    const fallSpeed = 0.4; // px/ms
    for (const drop of this.rainDrops) {
      drop.y += fallSpeed * delta;
      drop.x -= fallSpeed * 0.25 * delta;
      if (drop.y > screenH) {
        drop.y = -10;
        drop.x = Math.random() * screenW;
      }
      if (drop.x < -10) drop.x = screenW + 10;
    }
  }

  private applyResilienceTier(score: number): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    container.classList.remove('world--thriving', 'world--stabilising', 'world--crisis', 'world--emergency');
    container.classList.add(`world--${resilienceTier(score)}`);
  }

  /** M21 §4 — swaps the small, fixed set of street-front dressing props (boarded
   * shopfronts / market stalls / flower planters) for the current resilience tier. */
  private updateWorldDressing(score: number): void {
    const tier = dressingTierFor(score);
    if (tier === this.currentDressingTier) return;
    this.currentDressingTier = tier;

    this.dressingSprites.forEach(s => s.destroy());
    this.dressingSprites = [];

    const drawSpec: Record<DressingPropToken, { w: number; h: number; color: number }> = {
      PROP_BOARDED_WINDOW: { w: 12, h: 10, color: 0x5a4a3a },
      PROP_CRACKED_ASPHALT: { w: 14, h: 4, color: 0x1c1c26 },
      PROP_MARKET_STALL: { w: 16, h: 10, color: 0xcc8844 },
      PROP_FLOWER_PLANTER: { w: 10, h: 6, color: 0xdd5588 },
      PROP_BUNTING: { w: 16, h: 4, color: 0xeecc44 },
    };
    dressingPropsForTier(tier).forEach(placement => {
      const spec = drawSpec[placement.token];
      const px = placement.x * TS + TS / 2, py = placement.y * TS + TS / 2;
      this.dressingSprites.push(this.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3));
    });
  }

  /** M21 §3 — renders each named interior's furniture props as depth-3 hand-drawn
   * rectangles, resolved from InteriorProps.ts's abstract PropTokens (same
   * hand-drawn-primitive technique createTilesetTexture()/spawnFlyers() already use —
   * no new asset pipeline needed, and the Headless Simulation boundary stays intact
   * since InteriorProps.ts itself has zero Phaser/rendering knowledge). */
  private renderInteriorProps(): void {
    const drawSpec: Record<PropToken, { w: number; h: number; color: number }> = {
      PROP_BIKE_RACK: { w: 12, h: 6, color: 0x556677 },
      PROP_COT: { w: 14, h: 8, color: 0x774433 },
      PROP_BOXES: { w: 10, h: 10, color: 0x996633 },
      PROP_LAMP: { w: 4, h: 8, color: 0xffdd88 },
      PROP_TABLE: { w: 20, h: 8, color: 0x8b5a2b },
      PROP_STOVE: { w: 10, h: 10, color: 0x444444 },
      PROP_CRATES: { w: 10, h: 8, color: 0xcc8844 },
      PROP_BENCH: { w: 14, h: 5, color: 0x775533 },
      PROP_CHALKBOARD: { w: 12, h: 10, color: 0x223322 },
      PROP_BANNER: { w: 14, h: 4, color: 0xdd4444 },
    };
    Object.values(INTERIORS).forEach(def => {
      def.props.forEach(prop => {
        const spec = drawSpec[prop.token];
        const px = prop.x * TS + TS / 2, py = prop.y * TS + TS / 2;
        this.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3);
      });
    });
  }

  /** M21 §1 — smooth pan-to-center when the player crosses into a named
   * interior's room boundary, then resumes the normal follow lerp. */
  private updateInteriorFraming(): void {
    const tx = Math.floor(this.player.x / TS), ty = Math.floor(this.player.y / TS);
    const interior = findInteriorAtTile(tx, ty);
    const id = interior?.id ?? null;
    if (id === this.currentInteriorId) return;
    this.currentInteriorId = id;

    if (interior) {
      const cx = ((interior.rect.x1 + interior.rect.x2) / 2) * TS;
      const cy = ((interior.rect.y1 + interior.rect.y2) / 2) * TS;
      this.cameras.main.stopFollow();
      this.followingPlayer = false;
      this.cameras.main.pan(cx, cy, 350, 'Sine.easeInOut', false, (_cam, progress) => {
        if (progress === 1) {
          this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
          this.followingPlayer = true;
        }
      });
    } else if (!this.followingPlayer) {
      this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
      this.followingPlayer = true;
    }
  }

  /** M21 §5 — keeps drop-shadow ellipses under moving entities and redraws the
   * ambient warm-light layer each frame from the player's current screen
   * position plus any nearby lit doorway. Verified to compose (not fight)
   * with the day/night tint, resilience CSS filter, and weather overlay —
   * same three-independent-layers check M10's weather system already did —
   * because this canvas only ever paints inside its warm-gradient circles
   * and stays fully transparent (no `multiply` effect) everywhere else. */
  private updateShadowsAndLight(): void {
    this.playerShadow.setPosition(this.player.x, this.player.y + 6);
    this.npcs.forEach(npc => {
      const shadow = this.npcShadows.get(npc.id);
      const sprite = this.npcSprites.get(npc.id);
      if (shadow && sprite) shadow.setPosition(sprite.x, sprite.y + 6);
    });

    if (!this.ambientLight) return;
    const cam = this.cameras.main;
    const toScreen = (wx: number, wy: number) => ({
      x: (wx - cam.worldView.x) * cam.zoom,
      y: (wy - cam.worldView.y) * cam.zoom,
    });
    const lights = [{ ...toScreen(this.player.x, this.player.y), radius: 35 * cam.zoom }];
    for (const door of DOOR_TILES) {
      const wx = door.x * TS + TS / 2, wy = door.y * TS + TS / 2;
      if (wx < cam.worldView.x - TS || wx > cam.worldView.right + TS ||
          wy < cam.worldView.y - TS || wy > cam.worldView.bottom + TS) continue;
      lights.push({ ...toScreen(wx, wy), radius: 25 * cam.zoom });
    }
    this.ambientLight.render(lights);
  }

  private drawThumbstick(): void {
    this.thumbstickGraphic.clear();
    if (!inputManager.isUsingTouch()) return;
    const origin = inputManager.getThumbstickOrigin();
    if (!origin) return;
    const delta = inputManager.getThumbstickDelta();
    this.thumbstickGraphic.lineStyle(2, 0xffffff, 0.2);
    this.thumbstickGraphic.strokeCircle(origin.x, origin.y, 40);
    this.thumbstickGraphic.fillStyle(0xffffff, 0.4);
    this.thumbstickGraphic.fillCircle(origin.x + delta.x * 40, origin.y + delta.y * 40, 16);
  }
}
