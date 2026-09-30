import Phaser from 'phaser';
import { TS } from './DefaultTextureRenderer';
import { resilienceTier, dressingTierFor, dressingPropsForTier, type DressingTier, type DressingPropToken } from './ResilienceDressing';
import { OUTDOOR_DRESSING_PROPS, type OutdoorPropToken } from './OutdoorDressing';
import { resolvePropColor } from '../skins/resolvePropColor';

/**
 * WorldScene De-escalation — the three resilience/decoration rendering
 * passes (CSS filter tier, street-front dressing prop swap, one-shot
 * outdoor decoration) previously inline methods on WorldScene, now grouped
 * here since all three are pure "read resilience state, draw/adjust static
 * decoration" concerns with no interaction/collection behaviour, unlike the
 * scavenge/cookbook pickups (see PickupRenderers.ts).
 */
export class WorldDressingRenderer {
  private dressingSprites: Phaser.GameObjects.Rectangle[] = [];
  private currentDressingTier: DressingTier | null = null;

  constructor(private readonly scene: Phaser.Scene) {}

  /** M21 §4 — toggles the CSS filter class on the game container for the
   *  current resilience tier (thriving/stabilising/crisis/emergency). */
  applyResilienceTier(score: number): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    container.classList.remove('world--thriving', 'world--stabilising', 'world--crisis', 'world--emergency');
    container.classList.add(`world--${resilienceTier(score)}`);
  }

  /** M21 §4 — swaps the small, fixed set of street-front dressing props (boarded
   * shopfronts / market stalls / flower planters) for the current resilience tier. */
  updateWorldDressing(score: number): void {
    const tier = dressingTierFor(score);
    if (tier === this.currentDressingTier) return;
    this.currentDressingTier = tier;

    this.dressingSprites.forEach(s => s.destroy());
    this.dressingSprites = [];

    const drawSpec: Record<DressingPropToken, { w: number; h: number; color: number }> = {
      PROP_BOARDED_WINDOW: { w: 12, h: 10, color: resolvePropColor('PROP_BOARDED_WINDOW') },
      PROP_CRACKED_ASPHALT: { w: 14, h: 4, color: resolvePropColor('PROP_CRACKED_ASPHALT') },
      PROP_MARKET_STALL: { w: 16, h: 10, color: resolvePropColor('PROP_MARKET_STALL') },
      PROP_FLOWER_PLANTER: { w: 10, h: 6, color: resolvePropColor('PROP_FLOWER_PLANTER') },
      PROP_BUNTING: { w: 16, h: 4, color: resolvePropColor('PROP_BUNTING') },
    };
    dressingPropsForTier(tier).forEach(placement => {
      const spec = drawSpec[placement.token];
      const px = placement.x * TS + TS / 2, py = placement.y * TS + TS / 2;
      this.dressingSprites.push(this.scene.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3));
    });
  }

  /** M32 §3 — one-shot outdoor decoration pass (trees/bushes/benches/
   *  fences/parked cars), same hand-drawn-primitive technique as
   *  InteriorScene.ts's renderProps()/updateWorldDressing(). Fixed for the whole
   *  session — unlike updateWorldDressing()'s resilience-tier swap, this
   *  layer doesn't change and so needs no stored/destroyable references. */
  renderOutdoorDressing(): void {
    const drawSpec: Record<OutdoorPropToken, { w: number; h: number; color: number }> = {
      PROP_ACCENT_TREE: { w: 12, h: 14, color: resolvePropColor('PROP_ACCENT_TREE') },
      PROP_BUSH: { w: 10, h: 7, color: resolvePropColor('PROP_BUSH') },
      PROP_STREET_BENCH: { w: 14, h: 5, color: resolvePropColor('PROP_STREET_BENCH') },
      PROP_FENCE: { w: 16, h: 4, color: resolvePropColor('PROP_FENCE') },
      PROP_PARKED_CAR: { w: 15, h: 9, color: resolvePropColor('PROP_PARKED_CAR') },
      PROP_PARKED_BIKE: { w: 10, h: 6, color: resolvePropColor('PROP_PARKED_BIKE') },
    };
    OUTDOOR_DRESSING_PROPS.forEach(placement => {
      const spec = drawSpec[placement.token];
      const px = placement.x * TS + TS / 2, py = placement.y * TS + TS / 2;
      this.scene.add.rectangle(px, py, spec.w, spec.h, spec.color).setDepth(3);
    });
  }
}
