import Phaser from 'phaser';
import { inputManager } from './InputManager';
import { setupTilemapCollision } from './CollisionSystem';
import { PlayerEntity } from './entities/PlayerEntity';
import { NPCEntity } from './entities/NPCEntity';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { ConstructionModal, type ConstructionNodeData } from '../ui/ConstructionModal';
import { TopHUD } from '../ui/TopHUD';
import { useGameStore } from '../core/state/useGameStore';
import { BUILD_COMPLETION_THRESHOLD } from '../core/simulation/EconomyMath';

const TS = 16;
const COLS = 48;
const ROWS = 64;

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
  fillRect(m, 1, 20, COLS - 2, 22, T.ROAD);
  fillRect(m, 1, 41, COLS - 2, 43, T.ROAD);

  // Central plaza floor
  fillRect(m, 9, 23, 38, 40, T.PLAZA);

  // South courtyard
  fillRect(m, 15, 46, 32, 60, T.PLAZA);

  // North buildings
  drawBuilding(m, 2, 2, 13, 17, 7);     // High-Rise / Corporate Block
  drawBuilding(m, 33, 2, 46, 17, 39);   // Utility Station

  // Central buildings
  drawBuilding(m, 2, 24, 8, 35, 5);     // Town Hall
  drawBuilding(m, 39, 24, 46, 35, 42);  // Tool Library / Old Warehouse

  // South buildings
  drawBuilding(m, 2, 45, 13, 61, 7);    // Apartment Block A
  drawBuilding(m, 33, 45, 46, 61, 39);  // Apartment Block B
  drawBuilding(m, 17, 49, 23, 57, 20);  // Corner Grocer / Community Fridge

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
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private completedIds = new Set<string>();

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
    this.layer = layer;
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

    setupTilemapCollision(this, sprite, layer);
    this.player = new PlayerEntity(sprite);

    // Construction nodes
    this.constructionNodes = [
      { id: 'kitchen', label: 'Community Kitchen & Fridge', position: { x: 20*TS+TS/2, y: 58*TS+TS/2 }, progressKey: 'kitchenProgress' },
      { id: 'solar',   label: 'Rooftop Solar Cooperative',  position: { x: 24*TS+TS/2, y: 8*TS+TS/2  }, progressKey: 'solarGridProgress' },
      { id: 'legal',   label: 'Legal Defense Fund',          position: { x: 23*TS+TS/2, y: 31*TS+TS/2 }, progressKey: 'legalFundProgress' },
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

    // Zone labels
    const lStyle = { fontFamily: 'monospace', fontSize: '9px', color: '#555577', alpha: 0.6 };
    this.add.text(COLS/2*TS, 1*TS+4,  '— NORTH DISTRICT —', lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 23*TS+4, '— CENTRAL PLAZA —',  lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);
    this.add.text(COLS/2*TS, 44*TS+4, '— SOUTH QUARTER —',  lStyle).setOrigin(0.5,0).setDepth(2).setAlpha(0.4);

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
  }

  update(): void {
    inputManager.update();
    this.player.update();
    this.npcs.forEach(npc => npc.update(this.player.x, this.player.y));
    this.syncCompletedBuilds();
    this.updateZone();
    this.handleInteractions();
    this.drawThumbstick();
  }

  private updateZone(): void {
    const py = this.player.y;
    let zone = '';
    if (py < 20 * TS)        zone = 'NORTH DISTRICT';
    else if (py > 44 * TS)   zone = 'SOUTH QUARTER';
    else if (py > 23 * TS && py < 40 * TS) zone = 'CENTRAL PLAZA';
    WorldScene.hud?.setZone(zone);
  }

  private handleInteractions(): void {
    const nearbyNpc = this.npcs.find(npc => npc.isActive);
    const nearbyBuild = this.constructionNodes.find(node => {
      const dx = this.player.x - node.position.x, dy = this.player.y - node.position.y;
      return Math.hypot(dx, dy) <= 42;
    });

    if (!this.dialogueOpen && !this.buildOpen) {
      const pressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);
      if (pressed) {
        if (nearbyBuild) this.openBuild(nearbyBuild);
        else if (nearbyNpc) this.openTalk(nearbyNpc);
      }
    }

    if (this.dialogueOpen || this.buildOpen) {
      WorldScene.hud?.hideAction();
    } else if (nearbyBuild) {
      WorldScene.hud?.setAction('Build 🔨', () => this.openBuild(nearbyBuild));
    } else if (nearbyNpc) {
      WorldScene.hud?.setAction('Talk 💬', () => this.openTalk(nearbyNpc));
    } else {
      WorldScene.hud?.hideAction();
    }
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
    const tree = DIALOGUES[npc.dialogueKey] ?? DIALOGUES['mira_intro'];
    new DialogueOverlay(uiRoot, tree, npc.dialogueKey, npc.name, () => { this.dialogueOpen = false; WorldScene.hud?.hideAction(); });
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
