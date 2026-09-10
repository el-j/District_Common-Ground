import Phaser from 'phaser';
import { inputManager } from './InputManager';
import { setupTilemapCollision } from './CollisionSystem';
import { PlayerEntity } from './entities/PlayerEntity';

const TILE_SIZE = 16;
const MAP_COLS = 40;
const MAP_ROWS = 30;

// 0 = walkable floor, 1 = solid wall
// Index 0 in data maps to first frame of tileset (floor tile)
// Index 1 in data maps to second frame of tileset (wall tile)
function buildMap(): number[][] {
  const map: number[][] = Array.from({ length: MAP_ROWS }, (_, y) =>
    Array.from({ length: MAP_COLS }, (_, x) => {
      const isBorder = x === 0 || y === 0 || x === MAP_COLS - 1 || y === MAP_ROWS - 1;
      return isBorder ? 1 : 0;
    }),
  );

  // Scatter some buildings / obstacles for collision testing
  const blocks: [number, number][] = [
    // NW quadrant
    [3, 3], [4, 3], [3, 4], [4, 4],
    // NE quadrant
    [35, 3], [36, 3], [35, 4], [36, 4],
    // Central fence
    [16, 13], [17, 13], [18, 13], [19, 13], [20, 13], [21, 13], [22, 13], [23, 13],
    // Mid-left cluster
    [8, 8], [9, 8], [8, 9],
    // Mid-right cluster
    [30, 8], [31, 8], [31, 9],
    // SW quadrant
    [3, 25], [4, 25], [3, 26], [4, 26],
    // SE quadrant
    [35, 25], [36, 25], [35, 26], [36, 26],
    // Central plaza marker
    [18, 7], [21, 7], [18, 22], [21, 22],
  ];

  for (const [x, y] of blocks) {
    if (y >= 0 && y < MAP_ROWS && x >= 0 && x < MAP_COLS) {
      map[y][x] = 1;
    }
  }

  return map;
}

function createTilesetTexture(scene: Phaser.Scene): void {
  const tex = scene.textures.createCanvas('tileset', TILE_SIZE * 2, TILE_SIZE);
  if (!tex) throw new Error('Failed to create tileset canvas texture');
  const ctx = tex.getContext();

  // Frame 0: walkable floor (dark)
  ctx.fillStyle = '#2d2d3d';
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
  // Subtle grid lines
  ctx.strokeStyle = '#35354a';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

  // Frame 1: solid wall (lighter, with border)
  ctx.fillStyle = '#5a5a7a';
  ctx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#7a7a9a';
  ctx.lineWidth = 1;
  ctx.strokeRect(TILE_SIZE + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

  tex.refresh();
}

function createPlayerTexture(scene: Phaser.Scene): void {
  // 4 frames (one per direction): down, up, left, right
  // Each frame is 16×16, giving a 64×16 spritesheet
  const tex = scene.textures.createCanvas('player', TILE_SIZE * 4, TILE_SIZE);
  if (!tex) throw new Error('Failed to create player canvas texture');
  const ctx = tex.getContext();

  const colors: [string, string][] = [
    ['#4488ff', '#2266cc'], // down  frames 0–1
    ['#ff4444', '#cc2222'], // up    frames 2–3
    ['#44cc44', '#228822'], // left  frames 4–5
    ['#ffcc00', '#cc9900'], // right frames 6–7
  ];

  for (let i = 0; i < 4; i++) {
    const [fill, border] = colors[i];
    const px = i * TILE_SIZE;
    ctx.fillStyle = fill;
    ctx.fillRect(px + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    // Direction indicator dot
    ctx.fillStyle = '#ffffff';
    const dotPositions: [number, number][] = [
      [px + 7, 10], // down  → dot at bottom center
      [px + 7, 4],  // up    → dot at top center
      [px + 4, 7],  // left  → dot at left center
      [px + 10, 7], // right → dot at right center
    ];
    ctx.fillRect(dotPositions[i][0], dotPositions[i][1], 2, 2);
  }

  tex.refresh();

  // Define explicit 16×16 frames so Phaser doesn't treat the entire 64×16 canvas as frame 0
  tex.add(0, 0, 0, 0, TILE_SIZE, TILE_SIZE);
  tex.add(1, 0, TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  tex.add(2, 0, TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE);
  tex.add(3, 0, TILE_SIZE * 3, 0, TILE_SIZE, TILE_SIZE);
}

export class WorldScene extends Phaser.Scene {
  private player!: PlayerEntity;
  private thumbstickGraphic!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'WorldScene' });
  }

  preload(): void {
    createTilesetTexture(this);
    createPlayerTexture(this);
  }

  create(): void {
    const mapData = buildMap();
    const map = this.make.tilemap({
      data: mapData,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });

    const tileset = map.addTilesetImage('tiles', 'tileset', TILE_SIZE, TILE_SIZE, 0, 0);
    if (!tileset) throw new Error('Failed to create tileset');

    const layer = map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('Failed to create tilemap layer');

    layer.setCollision([1]);

    // Create player in the open center of the map
    const startX = Math.floor(MAP_COLS / 2) * TILE_SIZE + TILE_SIZE / 2;
    const startY = Math.floor(MAP_ROWS / 2) * TILE_SIZE + TILE_SIZE / 2;
    const playerSprite = this.physics.add.sprite(startX, startY, 'player', 0);
    playerSprite.setCollideWorldBounds(true);

    this.anims.create({ key: 'walk_down', frames: [{ key: 'player', frame: 0 }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'walk_up', frames: [{ key: 'player', frame: 1 }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'walk_left', frames: [{ key: 'player', frame: 2 }], frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'walk_right', frames: [{ key: 'player', frame: 3 }], frameRate: 8, repeat: -1 });

    setupTilemapCollision(this, playerSprite, layer);

    this.player = new PlayerEntity(playerSprite);

    const worldWidth = MAP_COLS * TILE_SIZE;
    const worldHeight = MAP_ROWS * TILE_SIZE;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(playerSprite, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    inputManager.init(this);

    // Thumbstick overlay (pinned to screen, not scrolled by camera)
    this.thumbstickGraphic = this.add.graphics();
    this.thumbstickGraphic.setScrollFactor(0);
    this.thumbstickGraphic.setDepth(100);
  }

  update(): void {
    inputManager.update();
    this.player.update();
    this.drawThumbstick();
  }

  private drawThumbstick(): void {
    this.thumbstickGraphic.clear();

    if (!inputManager.isUsingTouch()) return;

    const origin = inputManager.getThumbstickOrigin();
    if (!origin) return;

    const delta = inputManager.getThumbstickDelta();

    const knobX = origin.x + delta.x * 40;
    const knobY = origin.y + delta.y * 40;

    // Outer ring
    this.thumbstickGraphic.lineStyle(2, 0xffffff, 0.25);
    this.thumbstickGraphic.strokeCircle(origin.x, origin.y, 40);

    // Inner knob
    this.thumbstickGraphic.fillStyle(0xffffff, 0.5);
    this.thumbstickGraphic.fillCircle(knobX, knobY, 16);
  }
}
