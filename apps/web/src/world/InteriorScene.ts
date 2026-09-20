import Phaser from 'phaser';
import { inputManager, type Facing } from './InputManager';
import { PlayerEntity } from './entities/PlayerEntity';
import { InteractionPrompt } from './InteractionPrompt';
import { INTERIORS, type InteriorId, type PropToken, type PropPlacement, type InteriorCookbookPickup } from './InteriorProps';
import { WorldScene } from './WorldScene';
import { useGameStore } from '../core/state/useGameStore';
import { collectCookbook, learnRecipe } from '../core/state/actions';
import { DIALOGUES } from './NpcDialogues';
import { DialogueOverlay } from '../ui/DialogueOverlay';
import { CraftingModal } from '../ui/CraftingModal';
import type { RecipeId, CraftingStation, ItemToken } from '../core/simulation/Recipes';
import type { MaterialCategory } from '../core/simulation/Materials';
import { housingOptionsForInterior } from '../core/simulation/HousingOptions';
import { getFamilyTemplate } from '../core/simulation/FamilyTemplates';
import { resolvePropColor } from '../skins/resolvePropColor';

const TS = 16;

// M41 §3 / M42 — EPIC-34. The same drawSpec WorldScene.ts's old
// renderInteriorProps() used, moved here since props now render inside the
// isolated interior scene, not painted onto the shared exterior tilemap.
// M42 adds 10 more tokens for the 5 new workshop/retail/library interiors.
// Dimensions only — color is resolved live at lookup time (propDrawSpec()/
// furnitureDrawSpec() below), not baked in here. These are module-level
// `const`s evaluated once at import time; calling resolvePropColor() here
// directly would freeze every prop's color to whatever skin happened to be
// active at that first module load and never update again on a later skin
// switch, so the color lookup has to happen per-call instead.
const PROP_DIMENSIONS: Record<PropToken, { w: number; h: number }> = {
  PROP_BIKE_RACK: { w: 12, h: 6 },
  PROP_COT: { w: 14, h: 8 },
  PROP_BOXES: { w: 10, h: 10 },
  PROP_LAMP: { w: 4, h: 8 },
  PROP_TABLE: { w: 20, h: 8 },
  PROP_STOVE: { w: 10, h: 10 },
  PROP_CRATES: { w: 10, h: 8 },
  PROP_BENCH: { w: 14, h: 5 },
  PROP_CHALKBOARD: { w: 12, h: 10 },
  PROP_BANNER: { w: 14, h: 4 },
  PROP_ANVIL: { w: 10, h: 8 },
  PROP_FORGE: { w: 12, h: 10 },
  PROP_SAWHORSE: { w: 14, h: 6 },
  PROP_LUMBER_STACK: { w: 12, h: 8 },
  PROP_SHELF_HARDWARE: { w: 14, h: 10 },
  PROP_TOOL_RACK: { w: 10, h: 10 },
  PROP_SHELF_GOODS: { w: 14, h: 10 },
  PROP_CASH_REGISTER: { w: 8, h: 8 },
  PROP_BOOKSHELF: { w: 10, h: 12 },
  PROP_READING_TABLE: { w: 12, h: 6 },
  PROP_SCRAP_PILE: { w: 14, h: 10 },
  PROP_CRANE_ARM: { w: 6, h: 16 },
  PROP_CRUSHED_CAR: { w: 16, h: 10 },
};

function propDrawSpec(token: PropToken): { w: number; h: number; color: number } {
  const { w, h } = PROP_DIMENSIONS[token];
  return { w, h, color: resolvePropColor(token) };
}

// M43 §2/§3 — EPIC-34. Only the 4 'furniture'-kind ItemTokens ever need a
// draw spec here (the rest of the catalog is sold/used, never placed in a
// room) — a `Partial` map, not a full `Record<ItemToken, ...>`.
const FURNITURE_DIMENSIONS: Partial<Record<ItemToken, { w: number; h: number }>> = {
  ITEM_SCRAP_STOOL: { w: 8, h: 8 },
  ITEM_PLANTER_BOX: { w: 12, h: 6 },
  ITEM_WIRED_LAMP: { w: 5, h: 9 },
  ITEM_UPCYCLED_WORKBENCH: { w: 16, h: 8 },
};

function furnitureDrawSpec(item: ItemToken): { w: number; h: number; color: number } | undefined {
  const dims = FURNITURE_DIMENSIONS[item];
  if (!dims) return undefined;
  return { w: dims.w, h: dims.h, color: resolvePropColor(item) };
}

export interface InteriorSceneData {
  interiorId: InteriorId;
  returnX: number;
  returnY: number;
  returnFacing: Facing;
  /** M45 — EPIC-35 §3. Which scene to `scene.wake()` on exit — 'WorldScene'
   *  for a Common Ground interior, 'RegionScene' for one entered from
   *  another region (e.g. the Scrapyard Depot). Defaults to 'WorldScene'
   *  for backward compatibility with every pre-M45 call site. */
  returnSceneKey?: 'WorldScene' | 'RegionScene';
}

interface Interactable {
  x: number;
  y: number;
  radius: number;
  label: string;
  prompt: InteractionPrompt;
  trigger: () => void;
}

/**
 * M41 — EPIC-34 §1/§3. Real interior isolation, resolving M33/this epic's
 * own flagged design question: a dedicated `Phaser.Scene`, launched over a
 * *slept* (not just camera-panned-away-from) `WorldScene`, so the exterior
 * tilemap is genuinely not rendered while inside — verified by
 * `WorldScene.scene.isSleeping()` in the live check, not just visually
 * inferred. Reuses the exact same `INTERIORS`/`PropPlacement` data model
 * M21 already established (no coordinate remapping needed) — this scene
 * just draws that same rect in isolation instead of overlaying it onto the
 * shared exterior tilemap.
 *
 * Section 3's redraw/destroy capability: `propSprites` is a stored,
 * destroyable reference array (the same `dressingSprites`-array pattern
 * `updateWorldDressing()` already uses), and `redrawProps()` can be called
 * again after a mutation — required by M42's shop stock and M43's furniture
 * editor, built once here rather than each needing its own workaround.
 *
 * M42 — generalized to a real `Interactable[]` list (exit + optional
 * crafting station / cookbook pickups / NPC), the nearest one in range
 * winning the single shared HUD action slot each frame — the same
 * "compute distances, pick nearest, show its prompt" shape
 * `WorldScene.handleInteractions()` already uses, just scoped to one room
 * instead of the whole map.
 */
export class InteriorScene extends Phaser.Scene {
  private interiorId!: InteriorId;
  private returnX = 0;
  private returnY = 0;
  private returnFacing: Facing = 'down';
  private returnSceneKey: 'WorldScene' | 'RegionScene' = 'WorldScene';

  private player!: PlayerEntity;
  private propSprites: Phaser.GameObjects.Rectangle[] = [];
  private furnitureSprites: Phaser.GameObjects.Rectangle[] = [];
  private interactables: Interactable[] = [];
  private actionKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private modalOpen = false;

  constructor() {
    super('InteriorScene');
  }

  init(data: InteriorSceneData): void {
    this.interiorId = data.interiorId;
    this.returnX = data.returnX;
    this.returnY = data.returnY;
    this.returnFacing = data.returnFacing;
    this.returnSceneKey = data.returnSceneKey ?? 'WorldScene';
    this.propSprites = [];
    this.furnitureSprites = [];
    this.interactables = [];
    this.modalOpen = false;
  }

  create(): void {
    const def = INTERIORS[this.interiorId];
    const { rect } = def;
    const x1px = rect.x1 * TS, y1px = rect.y1 * TS;
    const x2px = (rect.x2 + 1) * TS, y2px = (rect.y2 + 1) * TS;
    const wpx = x2px - x1px, hpx = y2px - y1px;

    // Floor + wall border — a small hand-drawn room, same primitive
    // technique the rest of this codebase's dressing layers use.
    const g = this.add.graphics();
    g.fillStyle(0x2a2018, 1);
    g.fillRect(x1px, y1px, wpx, hpx);
    g.lineStyle(4, 0x4a3a28, 1);
    g.strokeRect(x1px, y1px, wpx, hpx);
    g.setDepth(0);

    this.add.text(x1px + 6, y1px + 4, def.label, { fontSize: '9px', color: '#e8d9b8' }).setDepth(2);

    this.physics.world.setBounds(x1px, y1px, wpx, hpx);

    const cx = x1px + wpx / 2, cy = y1px + hpx / 2;
    const sprite = this.physics.add.sprite(cx, cy, 'player', 0);
    sprite.setCollideWorldBounds(true);
    this.player = new PlayerEntity(sprite);

    const zoom = Math.min(3, this.scale.width / wpx, this.scale.height / hpx);
    this.cameras.main.setZoom(Math.max(1, zoom));

    // Bugfix: Phaser's camera-bounds clamp (clampX/clampY in BaseCamera.js)
    // pins scroll to a fixed, off-center value whenever the bounds are
    // narrower than the display — it does NOT auto-center them — so a
    // startFollow()+setBounds() camera on a room smaller than the viewport
    // (true for every interior in this game, most severely the 2-tile-wide
    // Library) rendered badly off-center. Every room here is small enough
    // to fit the viewport at the zoom just computed (that's what the
    // Math.min above guarantees), so the camera can simply be centered once
    // and left there — no follow needed, and none of Phaser's clamp math
    // gets a chance to mis-center it.
    this.cameras.main.centerOn(cx, cy);

    inputManager.init(this);
    this.actionKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.renderProps();

    // Exit interactable, roughly where the door that got the player in here sits.
    const exitPoint = { x: cx, y: y2px - TS / 2 };
    this.interactables.push({
      x: exitPoint.x, y: exitPoint.y, radius: 20, label: 'Exit 🚪',
      prompt: new InteractionPrompt(this, exitPoint.x, exitPoint.y, '🚪', () => this.exitInterior()),
      trigger: () => this.exitInterior(),
    });

    // M42 §1 — crafting station.
    if (def.craftingStation) {
      const station = def.craftingStation;
      this.interactables.push({
        x: cx, y: y1px + TS, radius: 24, label: 'Craft here 🛠',
        prompt: new InteractionPrompt(this, cx, y1px + TS, '🛠', () => this.openCrafting(station)),
        trigger: () => this.openCrafting(station),
      });
    }

    // M42 §2/§3 — retail (Baumarkt/Supermarket) or Library entry point.
    if (def.retailCategory) {
      const category = def.retailCategory;
      this.interactables.push({
        x: cx, y: y1px + TS, radius: 24, label: `Browse ${def.label} 🏪`,
        prompt: new InteractionPrompt(this, cx, y1px + TS, '🏪', () => this.openRetail(category, def.label)),
        trigger: () => this.openRetail(category, def.label),
      });
    }

    // M42 §3 — cookbook pickups.
    (def.cookbookPickups ?? []).forEach(pickup => this.addCookbookInteractable(pickup));

    // M43 §1/§2 — housing (rent selection) + furniture editor, absorbing
    // EPIC-32's M36/M37 scope. Present only at the 2 apartment interiors.
    if (def.housingOptionIds && def.housingOptionIds.length > 0) {
      this.interactables.push({
        x: cx, y: y1px + TS, radius: 24, label: 'Housing 🏠',
        prompt: new InteractionPrompt(this, cx, y1px + TS, '🏠', () => this.openHousing()),
        trigger: () => this.openHousing(),
      });
    }
    if (def.furnitureSlots && this.isCurrentFlat()) {
      this.interactables.push({
        x: cx, y: y2px - TS * 1.5, radius: 24, label: 'Furnish 🪑',
        prompt: new InteractionPrompt(this, cx, y2px - TS * 1.5, '🪑', () => this.openFurnitureEditor()),
        trigger: () => this.openFurnitureEditor(),
      });
    }
    this.renderFurniture();

    // M42 §1/§3 — static flavor NPC.
    if (def.npc) {
      const npc = def.npc;
      const px = npc.x * TS + TS / 2, py = npc.y * TS + TS / 2;
      this.add.circle(px, py, 7, 0x4a6a8a).setDepth(4);
      this.add.text(px, py - 14, npc.name, { fontSize: '8px', color: '#dfe8ff' }).setOrigin(0.5, 1).setDepth(4);
      this.interactables.push({
        x: px, y: py, radius: 24, label: `Talk to ${npc.name} 💬`,
        prompt: new InteractionPrompt(this, px, py, '💬', () => this.talkTo(npc.dialogueKey, npc.name)),
        trigger: () => this.talkTo(npc.dialogueKey, npc.name),
      });
    }

    // M49 — EPIC-36 §2. The *current player's* chosen FamilyTemplate.members
    // spawn here — player-state-dependent, unlike def.npc above (always
    // the same regardless of which player is playing), so this reads
    // FamilyTemplates.ts at render time rather than being static
    // InteriorProps.ts content. Requires both a chosen template and a real
    // home for it — the template's homeInteriorId matching this interior.
    if (def.familyNpcSlots) {
      const familyTemplateId = useGameStore.getState().origin.familyTemplateId;
      const template = familyTemplateId ? getFamilyTemplate(familyTemplateId) : undefined;
      if (template && template.homeInteriorId === this.interiorId) {
        template.members.forEach((member, i) => {
          const slot = def.familyNpcSlots![i];
          if (!slot) return;
          const px = slot.x * TS + TS / 2, py = slot.y * TS + TS / 2;
          this.add.circle(px, py, 7, 0x8a5a6a).setDepth(4);
          this.add.text(px, py - 14, member.name, { fontSize: '8px', color: '#f0d9e8' }).setOrigin(0.5, 1).setDepth(4);
          this.interactables.push({
            x: px, y: py, radius: 24, label: `Talk to ${member.name} 💬`,
            prompt: new InteractionPrompt(this, px, py, '💬', () => this.talkTo(member.dialogueKey, member.name)),
            trigger: () => this.talkTo(member.dialogueKey, member.name),
          });
        });
      }
    }
  }

  private addCookbookInteractable(pickup: InteriorCookbookPickup): void {
    const collected = new Set(useGameStore.getState().crafting.collectedCookbookPoints);
    if (collected.has(pickup.id)) return;
    const px = pickup.x * TS + TS / 2, py = pickup.y * TS + TS / 2;
    const sprite = this.add.rectangle(px, py, 8, 8, 0xd8a13a).setDepth(3);
    const entry: Interactable = {
      x: px, y: py, radius: 20, label: 'Read cookbook 📖',
      prompt: new InteractionPrompt(this, px, py, '📖', () => this.collectCookbook(pickup, sprite, entry)),
      trigger: () => this.collectCookbook(pickup, sprite, entry),
    };
    this.interactables.push(entry);
  }

  private collectCookbook(pickup: InteriorCookbookPickup, sprite: Phaser.GameObjects.Rectangle, entry: Interactable): void {
    collectCookbook(pickup.id, pickup.recipe);
    sprite.destroy();
    entry.prompt.destroy();
    this.interactables = this.interactables.filter(i => i !== entry);
  }

  private openCrafting(station: CraftingStation): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    new CraftingModal(uiRoot, () => { this.modalOpen = false; }, station);
  }

  private openRetail(category: MaterialCategory, storeLabel: string): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    void import('../ui/RetailModal').then(({ RetailModal }) => {
      new RetailModal(uiRoot, category, storeLabel, () => { this.modalOpen = false; });
    });
  }

  private isCurrentFlat(): boolean {
    const currentFlatId = useGameStore.getState().housing.currentFlatId;
    if (!currentFlatId) return false;
    return (INTERIORS[this.interiorId].housingOptionIds ?? []).includes(currentFlatId);
  }

  private openHousing(): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    if (!uiRoot) return;
    const options = housingOptionsForInterior(this.interiorId);
    if (options.length === 0) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    void import('../ui/HousingModal').then(({ HousingModal }) => {
      new HousingModal(uiRoot, options, () => { this.modalOpen = false; this.refreshHousingInteractables(); });
    });
  }

  private openFurnitureEditor(): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    const slots = INTERIORS[this.interiorId].furnitureSlots;
    if (!uiRoot || !slots) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    void import('../ui/FurnitureEditorModal').then(({ FurnitureEditorModal }) => {
      new FurnitureEditorModal(uiRoot, slots.length, () => { this.modalOpen = false; this.redrawFurniture(); });
    });
  }

  /** After renting/moving out elsewhere in this same room (Housing modal
   *  closed), the "Furnish" interactable's availability can change —
   *  cheapest correct fix is re-deriving the whole interactable list from
   *  scene state, same as a full `create()` would, without re-entering the
   *  scene. */
  private refreshHousingInteractables(): void {
    const hasFurnish = this.interactables.some(i => i.label === 'Furnish 🪑');
    if (this.isCurrentFlat() && !hasFurnish) {
      const def = INTERIORS[this.interiorId];
      const x1px = def.rect.x1 * TS, y2px = (def.rect.y2 + 1) * TS;
      const cx = x1px + ((def.rect.x2 - def.rect.x1 + 1) * TS) / 2;
      this.interactables.push({
        x: cx, y: y2px - TS * 1.5, radius: 24, label: 'Furnish 🪑',
        prompt: new InteractionPrompt(this, cx, y2px - TS * 1.5, '🪑', () => this.openFurnitureEditor()),
        trigger: () => this.openFurnitureEditor(),
      });
    } else if (!this.isCurrentFlat() && hasFurnish) {
      const entry = this.interactables.find(i => i.label === 'Furnish 🪑');
      entry?.prompt.destroy();
      this.interactables = this.interactables.filter(i => i.label !== 'Furnish 🪑');
    }
    this.redrawFurniture();
  }

  /** M43 §2 — the live-redraw requirement, built on M41 §3's stored-sprite
   *  capability: destroys every placed-furniture sprite and re-renders from
   *  the current `housing.furniture`/`furnitureSlots` pairing. */
  private redrawFurniture(): void {
    this.furnitureSprites.forEach(s => s.destroy());
    this.furnitureSprites = [];
    this.renderFurniture();
  }

  private renderFurniture(): void {
    const slots = INTERIORS[this.interiorId].furnitureSlots;
    if (!slots) return;
    const furniture = useGameStore.getState().housing.furniture;
    furniture.forEach(placed => {
      const slot = slots[placed.slotIndex];
      const spec = furnitureDrawSpec(placed.item);
      if (!slot || !spec) return;
      const px = slot.x * TS + TS / 2, py = slot.y * TS + TS / 2;
      this.furnitureSprites.push(this.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3));
    });
  }

  /** M49 — EPIC-36 §2. Takes `displayName` explicitly rather than
   *  re-deriving it from `INTERIORS[this.interiorId].npc?.name` (the old
   *  behavior) — that lookup only ever worked for the single static
   *  workshop/library NPC and would have silently shown the wrong title
   *  (or a generic "Talk" fallback) for a family member, who isn't that
   *  field. Both call sites now pass their own real name. */
  private talkTo(dialogueKey: string, displayName: string): void {
    if (this.modalOpen) return;
    const uiRoot = document.getElementById('ui-root');
    const tree = DIALOGUES[dialogueKey];
    if (!uiRoot || !tree) return;
    this.modalOpen = true;
    WorldScene.getHud()?.hideAction();
    const playerTrust = useGameStore.getState().player.socialTrust;
    new DialogueOverlay(
      uiRoot, tree, dialogueKey, displayName,
      () => { this.modalOpen = false; },
      playerTrust,
      (recipeId) => learnRecipe(recipeId as RecipeId),
    );
  }

  /** M41 §3 — destroys every stored prop sprite and re-renders from
   *  `propsOverride` (defaults to the static `INTERIORS` definition) — the
   *  general capability M42/M43 need for shop stock / player furniture,
   *  built once here rather than each needing its own workaround. */
  redrawProps(propsOverride?: PropPlacement[]): void {
    this.propSprites.forEach(s => s.destroy());
    this.propSprites = [];
    this.renderProps(propsOverride);
  }

  private renderProps(propsOverride?: PropPlacement[]): void {
    const props = propsOverride ?? INTERIORS[this.interiorId].props;
    props.forEach(prop => {
      const spec = propDrawSpec(prop.token);
      const px = prop.x * TS + TS / 2, py = prop.y * TS + TS / 2;
      const rect = this.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3);
      this.propSprites.push(rect);
    });
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

  private exitInterior(): void {
    WorldScene.getHud()?.hideAction();
    this.scene.wake(this.returnSceneKey, {
      returnX: this.returnX, returnY: this.returnY, returnFacing: this.returnFacing,
    });
    this.scene.stop();
  }
}
