import Phaser from 'phaser';

const WANDER_SPEED = 14; // px/s — ambient, slower than the player and even than PigeonEntity's 18
const MIN_PAUSE_MS = 1500;
const MAX_PAUSE_MS = 4000;
// M34 §2 — a light desaturating multiply-tint so background extras read as
// "crowd," not as another talkable named NPC using the exact same frame at
// full saturation. A runtime Phaser tint, not a new palette/hex baked into a
// texture — same category as the shadow ellipses' fixed 0x000000 everywhere
// else in WorldScene.ts, not a CLAUDE.md Critical-Architecture-Rule violation.
const CROWD_TINT = 0xc4c4d2;

/**
 * M34 §2 — EPIC-31. Lightweight background street life: purely decorative,
 * carries no dialogue/quest/gossip state (unlike NPCEntity), never talkable.
 * Deliberately reuses the existing 'npcs' spritesheet texture instead of a
 * new art pipeline or a new SkinRenderer-contract texture — that texture is
 * already generated per-active-skin by DEFAULT_RENDERER/each hi-fi package's
 * createNPCTextures(), so pedestrians automatically match whichever skin is
 * active with zero new hardcoded color, and "reuse the NPC texture-
 * generation approach, not a new art pipeline" (this milestone's own doc
 * wording) is satisfied literally rather than by building a parallel atlas.
 *
 * Phaser-owning (mirrors PigeonEntity's shape, not NPCEntity's Phaser-free
 * one) since pedestrians carry no logic worth unit-testing in isolation —
 * same precedent PigeonEntity/ScrapsEntity/PlayerEntity already established
 * of no dedicated test file for a purely-visual entity class.
 */
export class PedestrianEntity {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private vx = 0;
  private vy = 0;
  private wanderTimer = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    frame: number,
    private readonly bounds: Phaser.Geom.Rectangle,
  ) {
    this.sprite = scene.add.image(x, y, 'npcs', frame).setDepth(3).setAlpha(0.85).setTint(CROWD_TINT);
    this.shadow = scene.add.ellipse(x, y + 6, 10, 4, 0x000000, 0.22).setDepth(2.5);
    this.pickWanderDirection();
  }

  get x(): number { return this.sprite.x; }
  get y(): number { return this.sprite.y; }

  /** `isWalkable` is the same WorldScene.ts tile-grid lookup NPCEntity.tick()
   *  uses — pedestrians are people, not birds, so (unlike PigeonEntity) they
   *  shouldn't wander straight through a building wall inside their bounds
   *  rectangle. */
  update(delta: number, isWalkable: (x: number, y: number) => boolean): void {
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) this.pickWanderDirection();

    if (this.vx !== 0 || this.vy !== 0) {
      const dt = delta / 1000;
      const nx = Phaser.Math.Clamp(this.sprite.x + this.vx * dt, this.bounds.left, this.bounds.right);
      const ny = Phaser.Math.Clamp(this.sprite.y + this.vy * dt, this.bounds.top, this.bounds.bottom);

      if (isWalkable(nx, ny)) {
        this.sprite.setPosition(nx, ny);
        this.shadow.setPosition(nx, ny + 6);
      } else {
        this.pickWanderDirection();
      }
    }

    if (this.sprite.x <= this.bounds.left || this.sprite.x >= this.bounds.right) this.vx *= -1;
    if (this.sprite.y <= this.bounds.top || this.sprite.y >= this.bounds.bottom) this.vy *= -1;
  }

  private pickWanderDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * WANDER_SPEED;
    this.vy = Math.sin(angle) * WANDER_SPEED;
    if (Math.random() < 0.4) { this.vx = 0; this.vy = 0; }
    this.wanderTimer = MIN_PAUSE_MS + Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS);
  }
}
