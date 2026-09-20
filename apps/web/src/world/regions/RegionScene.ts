import Phaser from 'phaser';
import { inputManager, type Facing } from '../InputManager';
import { PlayerEntity } from '../entities/PlayerEntity';
import { InteractionPrompt } from '../InteractionPrompt';
import { WorldScene } from '../WorldScene';
import { REGIONS, type RegionId } from './RegionData';
import { travelToRegion, collectMaterial, learnRecipe } from '../../core/state/actions';
import { INTERIORS, ALL_INTERIOR_IDS, type InteriorDefinition } from '../InteriorProps';
import type { InteriorSceneData } from '../InteriorScene';
import { INDUSTRIAL_SCAVENGE_POINTS, type RegionScavengePointPlacement } from './IndustrialScavengePoints';
import { useGameStore } from '../../core/state/useGameStore';
import { DIALOGUES } from '../NpcDialogues';
import { DialogueOverlay } from '../../ui/DialogueOverlay';
import type { RecipeId } from '../../core/simulation/Recipes';

const TS = 16;
// A small, genuinely placeholder grid for REGION_INDUSTRIAL_OUTSKIRTS —
// deliberately not WorldScene-scale fidelity, but real hand-authored
// content (own dimensions, own tile layout, own materials/NPCs/building),
// per M45's actual scope.
const GRID_TILES = 36;

export interface RegionSceneData {
  regionId: RegionId;
  returnX: number;
  returnY: number;
  returnFacing: Facing;
}

interface Interactable {
  x: number;
  y: number;
  radius: number;
  label: string;
  prompt: InteractionPrompt;
  trigger: () => void;
}

// M45 — EPIC-35 §3. Fixed, deterministic decoration — rail-siding bands and
// scrap piles — the same "hand-placed, never generated" discipline
// OutdoorDressing.ts (M32) established, scoped to this region's own grid
// instead of the town's. Purely visual (no collision geometry), a
// recorded scope decision for this pass.
const RAIL_SIDING_ROWS = [8, 20];
const SCRAP_PILE_DECOR: { x: number; y: number }[] = [
  { x: 6, y: 14 }, { x: 28, y: 6 }, { x: 30, y: 24 },
];

// M45 — EPIC-35 §3. 2-3 NPCs, static flavor characters (same scope
// reduction M42 already recorded for its own minor interior NPCs — a
// single fixed dialogue tree, not the open-world roster's 5-tree rotation).
const REGION_NPCS = [
  { id: 'rusty', name: 'Rusty', dialogueKey: 'rusty_outskirts', x: 10, y: 15 },
  { id: 'ember', name: 'Ember', dialogueKey: 'ember_outskirts', x: 24, y: 15 },
];

/**
 * M44 — EPIC-35 §2/§3. The generic renderer for every region *other* than
 * Common Ground (whose scene is `WorldScene` itself). Launched over a
 * *slept* `WorldScene` exactly the way `InteriorScene.ts` (EPIC-34/M41)
 * launches over it for a building interior — same `scene.sleep()` +
 * `scene.launch()` + `scene.wake()` + `scene.stop()` lifecycle, reused
 * rather than a second mechanism invented from scratch.
 *
 * M45 — EPIC-35 §3 (Region Content Pass #1). Generalized from M44's flat
 * placeholder into real, hand-authored region content for
 * `REGION_INDUSTRIAL_OUTSKIRTS`: rail-siding/scrap-pile decoration,
 * material scavenging points (iron/coal/scrap metal), 2 static NPCs, and
 * one real building (the Scrapyard Depot) entered through the exact same
 * `InteriorScene.ts` (EPIC-34/M41) framework Common Ground's buildings
 * use — `InteriorDefinition` gained a required `homeRegion` field so both
 * scenes can filter `ALL_INTERIOR_IDS` down to their own doors.
 */
export class RegionScene extends Phaser.Scene {
  private regionId!: RegionId;
  private returnX = 0;
  private returnY = 0;
  private returnFacing: Facing = 'down';
  private player!: PlayerEntity;
  private interactables: Interactable[] = [];
  private scavengeSprites: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private modalOpen = false;

  constructor() {
    super('RegionScene');
  }

  init(data: RegionSceneData): void {
    this.regionId = data.regionId;
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.returnFacing = data.returnFacing;
    this.interactables = [];
    this.scavengeSprites = new Map();
    this.modalOpen = false;
  }

  create(): void {
    const region = REGIONS[this.regionId];
    const wpx = GRID_TILES * TS, hpx = GRID_TILES * TS;

    const g = this.add.graphics();
    g.fillStyle(0x4a4438, 1); // ash/slag ground — this region's own palette, resolved directly (no skin-manifest hook yet; see task doc's Section 2 decision)
    g.fillRect(0, 0, wpx, hpx);
    RAIL_SIDING_ROWS.forEach(row => {
      g.fillStyle(0x2a2822, 1);
      g.fillRect(2 * TS, row * TS, (GRID_TILES - 4) * TS, TS * 0.6);
    });
    g.lineStyle(4, 0x1e1c16, 1);
    g.strokeRect(0, 0, wpx, hpx);
    g.setDepth(0);

    SCRAP_PILE_DECOR.forEach(({ x, y }) => {
      this.add.rectangle(x * TS + TS / 2, y * TS + TS / 2, 14, 10, 0x6a6255).setDepth(1);
    });

    this.add.text(8, 6, region.label, { fontSize: '10px', color: '#eaffda' }).setDepth(2);

    this.physics.world.setBounds(0, 0, wpx, hpx);
    this.cameras.main.setBounds(0, 0, wpx, hpx);

    const cx = region.arrivalPoint.x * TS + TS / 2, cy = region.arrivalPoint.y * TS + TS / 2;
    const sprite = this.physics.add.sprite(cx, cy, 'player', 0);
    sprite.setCollideWorldBounds(true);
    this.player = new PlayerEntity(sprite);
    this.cameras.main.startFollow(sprite, true, 0.15, 0.15);
    this.cameras.main.setZoom(Math.max(1, Math.min(2, this.scale.width / wpx, this.scale.height / hpx)));

    inputManager.init(this);
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // M41/M45 — WAKE listener for returning from an interior entered from
    // this region (e.g. the Scrapyard Depot) — mirrors WorldScene.ts's own
    // onWakeFromInterior() exactly.
    this.events.on(Phaser.Scenes.Events.WAKE, (_sys: unknown, data: { returnX: number; returnY: number }) => {
      const px = data.returnX * TS + TS / 2, py = data.returnY * TS + TS / 2;
      this.player.getSprite().setPosition(px, py);
      this.cameras.main.startFollow(this.player.getSprite(), true, 0.1, 0.1);
    });

    const returnPoint = { x: wpx / 2, y: hpx - TS };
    this.interactables.push({
      x: returnPoint.x, y: returnPoint.y, radius: 24, label: 'Return to Common Ground 🚉',
      prompt: new InteractionPrompt(this, returnPoint.x, returnPoint.y, '🚉', () => this.returnHome()),
      trigger: () => this.returnHome(),
    });

    // M46 — EPIC-35 §1. Lets WorldMapModal.ts request travel while this
    // region is the active scene — only "back to Common Ground" is
    // actually routable from here in v1 (no direct region-to-region travel
    // yet, a recorded scope limit, not an oversight).
    WorldScene.setActiveTravelHandler(targetId => {
      if (targetId === 'REGION_COMMON_GROUND') { this.returnHome(); return true; }
      return false;
    });

    // M45 §3 — this region's own building(s), filtered by homeRegion.
    ALL_INTERIOR_IDS
      .map(id => INTERIORS[id])
      .filter(def => def.homeRegion === this.regionId)
      .forEach(def => this.addInteriorDoorInteractable(def));

    // M45 §3 — material scavenging points.
    INDUSTRIAL_SCAVENGE_POINTS.forEach(point => this.addScavengeInteractable(point));

    // M45 §3 — static flavor NPCs.
    REGION_NPCS.forEach(npc => {
      const px = npc.x * TS + TS / 2, py = npc.y * TS + TS / 2;
      this.add.circle(px, py, 7, 0x8a6a4a).setDepth(4);
      this.add.text(px, py - 14, npc.name, { fontSize: '8px', color: '#f0e0c8' }).setOrigin(0.5, 1).setDepth(4);
      this.interactables.push({
        x: px, y: py, radius: 24, label: `Talk to ${npc.name} 💬`,
        prompt: new InteractionPrompt(this, px, py, '💬', () => this.talkTo(npc.dialogueKey, npc.name)),
        trigger: () => this.talkTo(npc.dialogueKey, npc.name),
      });
    });
  }

  private addInteriorDoorInteractable(def: InteriorDefinition): void {
    const px = def.doorTile.x * TS + TS / 2, py = def.doorTile.y * TS + TS / 2;
    this.add.rectangle(px, py, 18, 18, 0x3a3428).setDepth(2);
    this.add.text(px, py - 16, def.label, { fontSize: '7px', color: '#e8d9b8' }).setOrigin(0.5, 1).setDepth(2);
    this.interactables.push({
      x: px, y: py, radius: 24, label: `Enter ${def.label} 🚪`,
      prompt: new InteractionPrompt(this, px, py, '🚪', () => this.enterInteriorFromRegion(def)),
      trigger: () => this.enterInteriorFromRegion(def),
    });
  }

  private enterInteriorFromRegion(def: InteriorDefinition): void {
    if (this.modalOpen) return;
    const returnX = Math.floor(this.player.x / TS);
    const returnY = Math.floor(this.player.y / TS);
    const returnFacing = this.player.getFacing();
    WorldScene.getHud()?.hideAction();
    this.scene.sleep();
    this.scene.launch('InteriorScene', {
      interiorId: def.id, returnX, returnY, returnFacing, returnSceneKey: 'RegionScene',
    } satisfies InteriorSceneData);
  }

  private addScavengeInteractable(point: RegionScavengePointPlacement): void {
    const collected = new Set(useGameStore.getState().inventory.collectedScavengePoints);
    if (collected.has(point.id)) return;
    const px = point.x * TS + TS / 2, py = point.y * TS + TS / 2;
    const sprite = this.add.rectangle(px, py, 8, 8, 0x8a9a4a).setDepth(3);
    this.scavengeSprites.set(point.id, sprite);
    this.interactables.push({
      x: px, y: py, radius: 24, label: 'Collect ♻️',
      prompt: new InteractionPrompt(this, px, py, '♻️', () => this.collectScavenge(point)),
      trigger: () => this.collectScavenge(point),
    });
  }

  private collectScavenge(point: RegionScavengePointPlacement): void {
    collectMaterial(point.id, point.material, point.amount);
    this.scavengeSprites.get(point.id)?.destroy();
    this.scavengeSprites.delete(point.id);
    const entry = this.interactables.find(i => i.label === 'Collect ♻️' && Math.hypot(i.x - (point.x * TS + TS / 2), i.y - (point.y * TS + TS / 2)) < 1);
    if (entry) {
      entry.prompt.destroy();
      this.interactables = this.interactables.filter(i => i !== entry);
    }
  }

  private talkTo(dialogueKey: string, name: string): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    const tree = DIALOGUES[dialogueKey];
    if (!uiRoot || !tree) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    const playerTrust = useGameStore.getState().player.socialTrust;
    new DialogueOverlay(
      uiRoot, tree, dialogueKey, name,
      () => { this.modalOpen = false; },
      playerTrust,
      (recipeId) => learnRecipe(recipeId as RecipeId),
    );
  }

  update(): void {
    inputManager.update();
    this.player.update();

    if (this.modalOpen) {
      this.interactables.forEach(i => i.prompt.hide());
      WorldScene.getHud()?.hideAction();
      return;
    }

    const pressed = Phaser.Input.Keyboard.JustDown(this.actionKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey);

    let nearest: Interactable | null = null;
    let nearestDist = Infinity;
    for (const i of this.interactables) {
      const dist = Math.hypot(this.player.x - i.x, this.player.y - i.y);
      const inRange = dist <= i.radius;
      if (inRange) i.prompt.show(); else i.prompt.hide();
      if (inRange && dist < nearestDist) { nearest = i; nearestDist = dist; }
    }

    if (nearest) {
      WorldScene.getHud()?.setAction(nearest.label, nearest.trigger);
      if (pressed) nearest.trigger();
    } else {
      WorldScene.getHud()?.hideAction();
    }
  }

  private returnHome(): void {
    WorldScene.getHud()?.hideAction();
    travelToRegion('REGION_COMMON_GROUND');
    this.scene.wake('WorldScene', {
      returnX: this.returnX, returnY: this.returnY, returnFacing: this.returnFacing,
    });
    this.scene.stop();
  }
}
