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
import { TopHUD } from '../ui/TopHUD';
import { useGameStore } from '../core/state/useGameStore';
import { BUILD_COMPLETION_THRESHOLD } from '../core/simulation/EconomyMath';
import { addTrust, spendEnergy, reduceStress } from '../core/state/actions';
import { startBGMLoop } from '../core/audio/SoundSynth';
import { fetchDailyGossip } from '../api/narrativeGossip';

const TS = 16;
const COLS = 64;
const ROWS = 80;

const T = { FLOOR: 0, WALL: 1, GRASS: 2, ROAD: 3, PLAZA: 4, DOOR: 5, BUILT: 6 } as const;

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

function createTilesetTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('tileset', TS * 7, TS);
  if (!tex) throw new Error('tileset canvas failed');
  const ctx = tex.getContext();

  // T.FLOOR (0): dark indoor planks
  (() => {
    const ox = 0;
    ctx.fillStyle = '#18182a';
    ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = '#1d1d34';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < TS; y += 4) { ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + TS, y); ctx.stroke(); }
  })();

  // T.WALL (1): brick wall
  (() => {
    const ox = TS;
    ctx.fillStyle = '#1e1e30';
    ctx.fillRect(ox, 0, TS, TS);
    const bA = '#3c3a5a', bB = '#444268', mort = '#18182a';
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
    ctx.fillStyle = '#1a2c18';
    ctx.fillRect(ox, 0, TS, TS);
    const shades = ['#1e3020', '#22341c', '#243820', '#1c2c18'];
    [[2,3],[5,1],[8,5],[11,2],[3,9],[7,12],[12,8],[4,13],[9,6],[14,10],[1,15],[13,14],[6,7],[0,11]].forEach(([gx, gy], i) => {
      ctx.fillStyle = shades[i % shades.length];
      ctx.fillRect(ox + gx, gy, 1, 1);
    });
  })();

  // T.ROAD (3): paved grey
  (() => {
    const ox = TS * 3;
    ctx.fillStyle = '#2c2c3a';
    ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = '#22222e'; ctx.fillRect(ox, 0, TS, 1); ctx.fillRect(ox, TS - 1, TS, 1);
    ctx.fillStyle = '#383848'; ctx.fillRect(ox + 1, 1, TS - 2, 1);
    ctx.fillStyle = '#44445a'; ctx.fillRect(ox + 2, 7, 3, 2); ctx.fillRect(ox + 9, 7, 3, 2);
  })();

  // T.PLAZA (4): stone tiles with subtle grid
  (() => {
    const ox = TS * 4;
    ctx.fillStyle = '#20202e';
    ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = '#2a2a3c'; ctx.lineWidth = 0.75;
    const h = TS / 2;
    [[0,0],[h,0],[0,h],[h,h]].forEach(([dx, dy]) => ctx.strokeRect(ox + dx + 0.5, dy + 0.5, h - 1, h - 1));
    ctx.fillStyle = '#26263a';
    [[1,1],[h+1,1],[1,h+1],[h+1,h+1]].forEach(([dx, dy]) => ctx.fillRect(ox + dx, dy, 2, 1));
  })();

  // T.DOOR (5): warm wood entrance
  (() => {
    const ox = TS * 5;
    ctx.fillStyle = '#2a341e'; ctx.fillRect(ox, 0, TS, TS);
    ctx.fillStyle = '#5a3c14'; ctx.fillRect(ox + 3, 1, 10, 14);
    ctx.fillStyle = '#0e0c12'; ctx.fillRect(ox + 5, 2, 6, 11);
    ctx.fillStyle = '#c08833'; ctx.fillRect(ox + 9, 7, 2, 3);
    ctx.fillStyle = '#3e2a0e'; ctx.fillRect(ox + 3, 14, 10, 2);
  })();

  // T.BUILT (6): teal completed build
  (() => {
    const ox = TS * 6;
    ctx.fillStyle = '#142218'; ctx.fillRect(ox, 0, TS, TS);
    ctx.strokeStyle = '#2daa66'; ctx.lineWidth = 1.5;
    ctx.strokeRect(ox + 2, 2, TS - 4, TS - 4);
    ctx.fillStyle = '#1a8844';
    ctx.fillRect(ox + 6, 4, 4, 8); ctx.fillRect(ox + 4, 6, 8, 4);
    ctx.fillStyle = '#44ee88'; ctx.fillRect(ox + 7, 7, 2, 2);
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
  const tex = scene.textures.createCanvas('npcs', TS * 3, TS);
  if (!tex) throw new Error('npc canvas failed');
  const ctx = tex.getContext();

  const cfgs = [
    { hair: '#b05010', shirt: '#ee8830', pants: '#884422', skin: '#f0b878' }, // Mira: orange
    { hair: '#335588', shirt: '#3388cc', pants: '#224466', skin: '#d8c8b8' }, // Leo: blue
    { hair: '#553311', shirt: '#cc4422', pants: '#772211', skin: '#f8d0a8' }, // Elena: red
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
  for (let i = 0; i < 3; i++) tex.add(i, 0, i * TS, 0, TS, TS);
}

// ── Dialogue trees ─────────────────────────────────────────────────────────────

type DialogueNode = { text: string; responses: { label: string; next: string | null }[] };

const DIALOGUES: Record<string, Record<string, DialogueNode>> = {
  mira_intro: {
    mira_intro: {
      text: "Hey. I'm Mira. Things have been tense lately, but people still look out for each other down here.",
      responses: [
        { label: "What's going on?", next: 'mira_tension' },
        { label: 'Nice to meet you', next: null },
      ],
    },
    mira_tension: {
      text: "The corner store almost closed last month. If we keep the kitchen going, folks won't go hungry when money's tight.",
      responses: [
        { label: 'I can help with that', next: 'mira_kitchen' },
        { label: "I'll keep that in mind", next: null },
      ],
    },
    mira_kitchen: {
      text: "Every bit helps. Even $5 or a few hours of energy goes a long way. Hit the build node nearby to contribute.",
      responses: [{ label: 'Got it, thanks', next: null }],
    },
  },
  leo_intro: {
    leo_intro: {
      text: "Leo. I spend most of my time at the plaza — trying to keep the Town Hall accountable. Full-time job.",
      responses: [
        { label: "What does the Town Hall do?", next: 'leo_hall' },
        { label: 'Sounds exhausting', next: null },
      ],
    },
    leo_hall: {
      text: "Officially? Manages disputes. In practice? Decides who gets squeezed and who gets protected. The Legal Fund changes that math.",
      responses: [
        { label: 'How does the Legal Fund help?', next: 'leo_legal' },
        { label: 'I see. Thanks', next: null },
      ],
    },
    leo_legal: {
      text: "Gives people options when they can't afford a lawyer. Keeps power from just rolling over the block.",
      responses: [{ label: "I'll try to fund it", next: null }],
    },
  },
  elena_intro: {
    elena_intro: {
      text: "Elena. I organize the Solar Cooperative up here. The utility company wants us dependent on them forever.",
      responses: [
        { label: 'Why solar?', next: 'elena_solar' },
        { label: 'Interesting approach', next: null },
      ],
    },
    elena_solar: {
      text: "Energy independence. When the grid goes down during a crisis, neighbors with solar can still share power.",
      responses: [
        { label: 'How can I help?', next: 'elena_help' },
        { label: 'I understand', next: null },
      ],
    },
    elena_help: {
      text: "Find the solar node nearby. Cash buys panels. Your energy buys installation time. Every bit lowers stress across the district.",
      responses: [{ label: "I'm on it", next: null }],
    },
  },
};

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
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private completedIds = new Set<string>();
  private scraps!: ScrapsEntity;
  private pigeons: PigeonEntity[] = [];
  private flyers: FlyerObject[] = [];
  private fascistCrisisActive = false;
  private ticksSinceDay = 0;
  private bgmStarted = false;
  private tintOverlay!: Phaser.GameObjects.Rectangle;
  private prevDay = 0;
  private lastTintHash = -1;

  // Town Hall interaction point (door at col 5, row 35)
  private static readonly TOWN_HALL = { x: 5 * 16 + 8, y: 35 * 16 + 8 };

  public static setHud(hud: TopHUD): void { WorldScene.hud = hud; }

  constructor() { super({ key: 'WorldScene' }); }

  preload(): void {
    createTilesetTexture(this);
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
    });

    // NPCs
    this.npcs = [
      new NPCEntity({ id:'mira',  token:'NPC_NEIGHBOR',  name:'Mira',  position:{ x:27*TS+TS/2, y:53*TS+TS/2 }, proximity:38, dialogueKey:'mira_intro'  }, ()=>undefined),
      new NPCEntity({ id:'leo',   token:'NPC_NEIGHBOR',  name:'Leo',   position:{ x:26*TS+TS/2, y:31*TS+TS/2 }, proximity:38, dialogueKey:'leo_intro'   }, ()=>undefined),
      new NPCEntity({ id:'elena', token:'NPC_ORGANIZER', name:'Elena', position:{ x:24*TS+TS/2, y:11*TS+TS/2 }, proximity:38, dialogueKey:'elena_intro' }, ()=>undefined),
    ];
    const npcFrame: Record<string, number> = { mira:0, leo:1, elena:2 };
    this.npcs.forEach(npc => {
      const img = this.add.image(npc.position.x, npc.position.y, 'npcs', npcFrame[npc.id] ?? 0);
      img.setDepth(5);
      this.npcSprites.set(npc.id, img);
    });

    // Fetch daily gossip and inject into NPC dialogue trees
    void fetchDailyGossip().then(gossipMap => {
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

    // Subscribe to crisis state to spawn/remove fascist flyers
    useGameStore.subscribe((state) => {
      const crisis = state.crisisState;
      const id = crisis.activeCrisisId;
      const isFascist = id != null && (
        id.startsWith('neo-fascist') || id.startsWith('fascist') || id === 'fascist-youth-recruitment'
      );
      if (isFascist && !this.fascistCrisisActive) {
        this.fascistCrisisActive = true;
        this.spawnFlyers();
      } else if (!isFascist && this.fascistCrisisActive) {
        this.fascistCrisisActive = false;
        this.removeAllFlyers();
      }
    });

    // Camera
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.startFollow(sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#1a2c18');

    // Input
    inputManager.init(this);
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey  = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.thumbstickGraphic = this.add.graphics();
    this.thumbstickGraphic.setScrollFactor(0);
    this.thumbstickGraphic.setDepth(100);

    // Resilience visual tier — apply initial state and subscribe to changes
    this.applyResilienceTier(useGameStore.getState().commons.resilienceScore);
    useGameStore.subscribe((state) => {
      this.applyResilienceTier(state.commons.resilienceScore);
    });

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

    // Tint overlay for day/night lighting (depth 90, scrollFactor 0 = fixed to screen)
    const screenW = this.scale.width, screenH = this.scale.height;
    this.tintOverlay = this.add.rectangle(screenW / 2, screenH / 2, screenW * 4, screenH * 4, 0x220044, 0)
      .setScrollFactor(0).setDepth(90);

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

    this.player.update();

    // Day/night cycle: advance ticks, update camera tint every ~500ms
    this.ticksSinceDay += delta;
    this.updateDayNight();

    // Scraps
    const ePressed = Phaser.Input.Keyboard.JustDown(this.actionKey);
    this.scraps.update(this.player.x, this.player.y, ePressed, delta);

    this.npcs.forEach(npc => npc.update(this.player.x, this.player.y));
    this.pigeons.forEach(p => p.update(this.player.x, this.player.y, delta));
    this.syncCompletedBuilds();
    this.updateZone();
    this.checkCrisis();
    this.checkAssembly();
    this.handleInteractions();
    this.drawThumbstick();
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

    if (!this.dialogueOpen && !this.buildOpen && !this.historyOpen && !this.assemblyOpen) {
      const pressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);
      if (pressed) {
        if (nearbyFlyer) {
          this.tearDownFlyer(nearbyFlyer);
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

    if (this.dialogueOpen || this.buildOpen || this.historyOpen || this.assemblyOpen) {
      WorldScene.hud?.hideAction();
    } else if (nearbyFlyer) {
      WorldScene.hud?.setAction('Tear down flyer [E] ✊', () => this.tearDownFlyer(nearbyFlyer));
    } else if (scrapsInRange && hasCash) {
      WorldScene.hud?.setAction('[E] Feed Scraps 🐟', () => this.feedScraps());
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

    const baseTree = DIALOGUES[npc.dialogueKey] ?? DIALOGUES['mira_intro'];
    const tree: typeof baseTree = { ...baseTree };

    const gossip = npc.gossipLine;
    if (gossip) {
      const gossipKey = `${npc.dialogueKey}_rumor`;
      const startNode = tree[npc.dialogueKey];
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
        responses: [{ label: 'Good to know', next: null }],
      };
    }

    new DialogueOverlay(uiRoot, tree, npc.dialogueKey, npc.name, () => { this.dialogueOpen = false; WorldScene.hud?.hideAction(); });
  }

  private applyResilienceTier(score: number): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    container.classList.remove('world--thriving', 'world--stabilising', 'world--crisis', 'world--emergency');
    if (score < 15) {
      container.classList.add('world--emergency');
    } else if (score < 30) {
      container.classList.add('world--crisis');
    } else if (score < 60) {
      container.classList.add('world--stabilising');
    } else {
      container.classList.add('world--thriving');
    }
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
