export interface NPCDefinition {
  id: string;
  name: string;
  token: string;
  position: { x: number; y: number };
  proximity: number;
  dialogueKey: string;
  /** M34 §1 — EPIC-31. Max px distance from `position` (treated as the NPC's
   *  "home" anchor once wandering starts) the NPC will wander before turning
   *  back. Defaults to DEFAULT_WANDER_RADIUS when omitted. */
  wanderRadius?: number;
}

const DEFAULT_WANDER_RADIUS = 48; // 3 tiles (TS=16) — matches WorldScene's own npc proximity=38-ish scale
const WANDER_SPEED = 16; // px/s — deliberately slower than PlayerEntity's 80, ambient not urgent
const MIN_PAUSE_MS = 1500;
const MAX_PAUSE_MS = 4000;

/**
 * M34 §1 — EPIC-31. Gives named NPCs real waypoint-style wander instead of
 * standing perfectly still. Kept Phaser-free (mirrors this class's existing
 * design, not PigeonEntity's Phaser-owning one) specifically so the
 * wander-stays-in-home-zone and proximity/talkability behavior stay unit
 * testable without a scene — WorldScene.ts owns the actual Image/shadow/
 * prompt sprites and just reads x/y off this class each frame, the same
 * "pure state, scene renders it" split this class already had for
 * isActive/gossipLine.
 *
 * Wall/prop avoidance deliberately uses an injected tile-walkability check
 * (WorldScene.ts's own MapData-grid lookup) rather than routing through
 * CollisionSystem.ts's `physics.add.collider` — that helper only ever
 * colliders a real Arcade physics sprite against the tilemap layer, and
 * NPCs are plain (non-physics) `Image` objects, so converting them to
 * physics bodies just to reuse it would be a disproportionate lift for
 * slow ambient wander. `aabbOverlap` (the collision system's other export)
 * has no tile-grid awareness at all. The lighter-weight bounds check is the
 * explicitly-allowed alternative named in this milestone's own task doc.
 */
export class NPCEntity {
  private active = false;
  private _gossipLine: string | null = null;
  private _x: number;
  private _y: number;
  private vx = 0;
  private vy = 0;
  private wanderTimer = 0;

  constructor(
    private readonly definition: NPCDefinition,
    private readonly onChange: (id: string, active: boolean) => void,
  ) {
    this._x = definition.position.x;
    this._y = definition.position.y;
    this.pickWanderDirection();
  }

  setGossip(line: string): void {
    this._gossipLine = line;
  }

  get gossipLine(): string | null {
    return this._gossipLine;
  }

  /** M34 §1 — advances wander state. `isWalkable` is injected (a tile-grid
   *  lookup in real play, `() => true`/`() => false` in tests) so this stays
   *  a pure function of its inputs. Picking a fresh random direction is used
   *  both for the periodic "change course" pause and as the bounce-back when
   *  the next step would leave the home radius or land on a blocking tile —
   *  simpler than pathfinding back toward home, and sufficient for ambient
   *  wander per this milestone's own non-goals (no traffic simulation). */
  tick(deltaMs: number, isWalkable: (x: number, y: number) => boolean): void {
    this.wanderTimer -= deltaMs;
    if (this.wanderTimer <= 0) this.pickWanderDirection();
    if (this.vx === 0 && this.vy === 0) return;

    const dt = deltaMs / 1000;
    const nx = this._x + this.vx * dt;
    const ny = this._y + this.vy * dt;
    const radius = this.definition.wanderRadius ?? DEFAULT_WANDER_RADIUS;
    const distFromHome = Math.hypot(nx - this.definition.position.x, ny - this.definition.position.y);

    if (distFromHome > radius || !isWalkable(nx, ny)) {
      this.pickWanderDirection();
      return;
    }

    this._x = nx;
    this._y = ny;
  }

  private pickWanderDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * WANDER_SPEED;
    this.vy = Math.sin(angle) * WANDER_SPEED;
    // Pause occasionally so NPCs read as idling/loitering, not endlessly pacing.
    if (Math.random() < 0.4) { this.vx = 0; this.vy = 0; }
    this.wanderTimer = MIN_PAUSE_MS + Math.random() * (MAX_PAUSE_MS - MIN_PAUSE_MS);
  }

  /** Talkability must keep working while an NPC is mid-wander, so this now
   *  measures from the live (possibly moved) x/y, not the static home
   *  `definition.position` — the one behavior change `update()` needed. */
  update(playerX: number, playerY: number): void {
    const dx = playerX - this._x;
    const dy = playerY - this._y;
    const distance = Math.hypot(dx, dy);
    const nextActive = distance <= this.definition.proximity;

    if (nextActive !== this.active) {
      this.active = nextActive;
      this.onChange(this.definition.id, this.active);
    }
  }

  get id(): string {
    return this.definition.id;
  }

  get isActive(): boolean {
    return this.active;
  }

  /** Live position — moves as the NPC wanders. WorldScene.ts reads this
   *  every frame to sync the Image/shadow/InteractionPrompt it owns. */
  get x(): number {
    return this._x;
  }

  get y(): number {
    return this._y;
  }

  /** Home anchor (spawn point) — unchanged even while wandering. Still used
   *  by WorldScene.ts once, at creation, for initial sprite placement. */
  get position(): { x: number; y: number } {
    return this.definition.position;
  }

  get dialogueKey(): string {
    return this.definition.dialogueKey;
  }

  get name(): string {
    return this.definition.name;
  }
}
