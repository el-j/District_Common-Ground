import Phaser from 'phaser';
import { TS } from './DefaultTextureRenderer';
import { useGameStore } from '../core/state/useGameStore';
import { collectMaterial, collectCookbook } from '../core/state/actions';
import { SCAVENGE_POINTS, type ScavengePointPlacement } from './ScavengePoints';
import { COOKBOOK_PICKUPS, type CookbookPickupPlacement } from './CookbookPickups';
import { RECIPES } from '../core/simulation/Recipes';
import { InteractionPrompt } from './InteractionPrompt';

/**
 * WorldScene De-escalation — the two deterministic-pickup renderers (M38 §2
 * scavenge points, M39 §2 cookbook pickups), previously inline
 * fields/methods on WorldScene. Each still owns just its own render/collect
 * lifecycle (spawn on create(), destroy on collect()); WorldScene keeps
 * reading `.entries` directly for the proximity-prompt show/hide sweep and
 * the nearest-pickup [E]-action lookup in handleInteractions(), same as it
 * already does for construction nodes/NPCs — that orchestration is left in
 * place rather than pulled in here.
 */

// M38 §2 — a picked-up point is destroyed and removed from `entries` exactly
// the way WorldScene's tearDownFlyer() already handles FlyerObject, plus an
// InteractionPrompt bounce-bubble (flyers never got one).
export interface ScavengePointEntry {
  data: ScavengePointPlacement;
  sprite: Phaser.GameObjects.Rectangle;
  prompt: InteractionPrompt;
}

// M39 §2 — EPIC-33. Same removable-pickup shape as ScavengePointEntry, one
// level up (grants a known recipe instead of a material stack).
export interface CookbookPickupEntry {
  data: CookbookPickupPlacement;
  sprite: Phaser.GameObjects.Rectangle;
  prompt: InteractionPrompt;
}

/** M38 §2 — EPIC-33. Deterministic material pickups, same hand-drawn-
 *  primitive technique as WorldDressingRenderer's renderOutdoorDressing(),
 *  but interactive (proximity prompt + [E]/click to collect) and
 *  removable, so it's tracked in `entries` rather than drawn and forgotten. */
export class ScavengePickupRenderer {
  entries: ScavengePointEntry[] = [];

  /** `onPromptTap` mirrors every other InteractionPrompt in WorldScene
   *  (bike portal, travel node, ...): the bubble tap doesn't collect
   *  directly, it triggers the HUD's currently-set [E]-action button —
   *  whatever handleInteractions() most recently wired up via setAction(). */
  constructor(private readonly scene: Phaser.Scene, private readonly onPromptTap: () => void) {}

  render(): void {
    const collected = new Set(useGameStore.getState().inventory.collectedScavengePoints);
    SCAVENGE_POINTS.forEach(point => {
      if (collected.has(point.id)) return;
      const px = point.x * TS + TS / 2, py = point.y * TS + TS / 2;
      const sprite = this.scene.add.rectangle(px, py, 8, 8, 0x8a9a4a).setDepth(3);
      const entry: ScavengePointEntry = {
        data: point,
        sprite,
        prompt: new InteractionPrompt(this.scene, px, py, '♻️', () => this.onPromptTap()),
      };
      this.entries.push(entry);
    });
  }

  collect(entry: ScavengePointEntry): void {
    collectMaterial(entry.data.id, entry.data.material, entry.data.amount);
    entry.sprite.destroy();
    entry.prompt.destroy();
    this.entries = this.entries.filter(e => e !== entry);

    const label = entry.data.material.replace('MATERIAL_', '').replace(/_/g, ' ').toLowerCase();
    const txt = this.scene.add.text(entry.data.x * TS + TS / 2, entry.data.y * TS + TS / 2 - 12, `+${entry.data.amount} ${label}`, {
      fontSize: '9px', color: '#dfffb0', backgroundColor: '#1a2a1a', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(20);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 20, alpha: 0, duration: 900,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
  }
}

/** M39 §2 — EPIC-33. Same technique as ScavengePickupRenderer, a distinct
 *  color/icon so the two pickup types read as different things in the
 *  world (recipe cookbook vs. raw material). */
export class CookbookPickupRenderer {
  entries: CookbookPickupEntry[] = [];

  constructor(private readonly scene: Phaser.Scene, private readonly onPromptTap: () => void) {}

  render(): void {
    const collected = new Set(useGameStore.getState().crafting.collectedCookbookPoints);
    COOKBOOK_PICKUPS.forEach(point => {
      if (collected.has(point.id)) return;
      const px = point.x * TS + TS / 2, py = point.y * TS + TS / 2;
      const sprite = this.scene.add.rectangle(px, py, 8, 8, 0xd8a13a).setDepth(3);
      const entry: CookbookPickupEntry = {
        data: point,
        sprite,
        prompt: new InteractionPrompt(this.scene, px, py, '📖', () => this.onPromptTap()),
      };
      this.entries.push(entry);
    });
  }

  collect(entry: CookbookPickupEntry): void {
    collectCookbook(entry.data.id, entry.data.recipe);
    entry.sprite.destroy();
    entry.prompt.destroy();
    this.entries = this.entries.filter(e => e !== entry);

    const label = RECIPES[entry.data.recipe]?.label ?? entry.data.recipe;
    const txt = this.scene.add.text(entry.data.x * TS + TS / 2, entry.data.y * TS + TS / 2 - 12, `📖 Learned: ${label}`, {
      fontSize: '9px', color: '#ffe9b0', backgroundColor: '#2a2214', padding: { x: 3, y: 2 },
    }).setOrigin(0.5, 1).setDepth(20);
    this.scene.tweens.add({
      targets: txt, y: txt.y - 20, alpha: 0, duration: 1200,
      ease: 'Power2', onComplete: () => txt.destroy(),
    });
  }
}
