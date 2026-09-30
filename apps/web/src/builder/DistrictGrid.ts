import type { DistrictParcelState, DistrictBuildingType } from '@district-cg/shared-types';
import { BUILDING_BLUEPRINTS, type BuildingBlueprint, type StageDefinition } from './ConstructionStages';
import { TactileEffects } from './TactileEffects';
import { useGameStore } from '../core/state/useGameStore';
import { spendCash, spendEnergy, addTrust, adjustResilience, gainCash, regenEnergy, reduceStress } from '../core/state/actions';
import type { MaterialToken } from '../core/simulation/Materials';

export interface HarvestYield {
  energy?: number;
  cash?: number;
  stress?: number;
  materials?: Partial<Record<MaterialToken, number>>;
}

/** What one daily harvest gives, by building type and tier (2026-09-29
 *  launch audit §1.7 — harvest used to only log to the console). Each type
 *  can be harvested once a day across all parcels, so building twelve
 *  kitchens doesn't multiply the yield. */
export const HARVEST_YIELDS: Record<DistrictBuildingType, { stage2: HarvestYield; stage3: HarvestYield }> = {
  community_kitchen: { stage2: { energy: 3 }, stage3: { energy: 5 } },
  solar_cooperative: { stage2: { cash: 3 }, stage3: { cash: 5 } },
  urban_garden: { stage2: { materials: { MATERIAL_MUSHROOM: 1 } }, stage3: { materials: { MATERIAL_MUSHROOM: 2, MATERIAL_WOOD: 1 } } },
  tool_library: { stage2: { materials: { MATERIAL_SCRAP_METAL: 1 } }, stage3: { materials: { MATERIAL_SCRAP_METAL: 2, MATERIAL_WIRE: 1 } } },
  clinic: { stage2: { stress: 2 }, stage3: { stress: 3 } },
};

export function describeYield(y: HarvestYield): string {
  const parts: string[] = [];
  if (y.energy) parts.push(`+${y.energy}⚡`);
  if (y.cash) parts.push(`+$${y.cash}`);
  if (y.stress) parts.push(`−${y.stress}% stress`);
  for (const [m, n] of Object.entries(y.materials ?? {})) {
    parts.push(`+${n} ${m.replace('MATERIAL_', '').replace(/_/g, ' ').toLowerCase()}`);
  }
  return parts.join(', ');
}

function defaultParcels(): DistrictParcelState[] {
  // 12 plots in a 4x3 neighborhood grid
  const initialBuildingTypes: (DistrictBuildingType | null)[] = [
    'community_kitchen', 'solar_cooperative', 'urban_garden', 'tool_library',
    null, 'clinic', null, null,
    null, null, null, null,
  ];
  return initialBuildingTypes.map((type, i) => ({
    plotId: `plot_${i + 1}`,
    position: { x: i % 4, y: Math.floor(i / 4) },
    buildingType: type,
    stage: (type ? 1 : 0) as 0 | 1 | 2 | 3,
    progress: type ? 25 : 0,
    lastHarvestDay: null,
  }));
}
import { recordAction } from '../core/offline/offlineRuntime';

export interface DistrictGridCallbacks {
  onParcelUpdated?: (parcel: DistrictParcelState) => void;
  onHarvest?: (parcel: DistrictParcelState, resource: string, amount: number) => void;
}

export class DistrictGrid {
  private container: HTMLElement | null = null;
  private selectedPlotId: string | null = null;
  private callbacks: DistrictGridCallbacks;

  constructor(container: HTMLElement | null = null, callbacks: DistrictGridCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    if (useGameStore.getState().district.parcels.length === 0) {
      this.setParcels(defaultParcels());
    }
  }

  /** Parcels always come from game state, so they're saved and survive
   *  closing and re-opening the builder. */
  getParcels(): DistrictParcelState[] {
    return useGameStore.getState().district.parcels;
  }

  setParcels(parcels: DistrictParcelState[]): void {
    useGameStore.setState(s => ({ district: { ...s.district, parcels } }));
    this.render();
  }

  getParcel(plotId: string): DistrictParcelState | undefined {
    return this.getParcels().find(p => p.plotId === plotId);
  }

  private updateParcel(plotId: string, patch: Partial<DistrictParcelState>): DistrictParcelState {
    let updated!: DistrictParcelState;
    const parcels = this.getParcels().map(p => {
      if (p.plotId !== plotId) return p;
      updated = { ...p, ...patch };
      return updated;
    });
    useGameStore.setState(s => ({ district: { ...s.district, parcels } }));
    return updated;
  }

  /**
   * Assign a building blueprint to an empty lot
   */
  assignBuilding(plotId: string, buildingType: DistrictBuildingType): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel || parcel.buildingType) return false;

    const updated = this.updateParcel(plotId, { buildingType, stage: 0, progress: 0 });

    TactileEffects.playHammerHit();
    this.render();
    this.callbacks.onParcelUpdated?.(updated);
    return true;
  }

  /**
   * Attempt to advance a parcel to the next construction stage
   */
  upgradeParcel(plotId: string, plotElement?: HTMLElement): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel || !parcel.buildingType) return false;
    if (parcel.stage >= 3) return false;

    const blueprint = BUILDING_BLUEPRINTS[parcel.buildingType];
    const nextStageDef: StageDefinition = blueprint.stages[parcel.stage + 1];

    const state = useGameStore.getState();
    if (state.player.energy < nextStageDef.energyCost || state.player.cash < nextStageDef.cashCost) {
      return false;
    }

    spendEnergy(nextStageDef.energyCost);
    spendCash(nextStageDef.cashCost);

    const stage = (parcel.stage + 1) as 0 | 1 | 2 | 3;
    const updated = this.updateParcel(plotId, { stage, progress: Math.min(100, (stage / 3) * 100) });

    // M18 — records this stage advance as a local signed LWW delta so it
    // resolves deterministically (see CRDTSyncEngine.resolveLwwParcels) if
    // this plot was also advanced on another of this player's devices.
    recordAction('PARCEL_STAGE_ADVANCE', { plotId, stage });

    // Modest rewards: +stage trust and resilience (2026-09-29 launch audit —
    // the old 5–25 trust per stage made trust meaningless).
    addTrust(stage);
    adjustResilience(stage);

    TactileEffects.playHammerHit();
    setTimeout(() => TactileEffects.playStageCompleteChime(), 120);
    if (plotElement) {
      TactileEffects.spawnCelebrationParticles(plotElement);
    }

    this.render();
    this.callbacks.onParcelUpdated?.(updated);
    return true;
  }

  private harvestedTypeToday(type: DistrictBuildingType): boolean {
    const { district, meta } = useGameStore.getState();
    return district.harvestedToday.day === meta.day && district.harvestedToday.types.includes(type);
  }

  /**
   * Harvest today's production from an operational parcel (stage 2+).
   */
  harvestParcel(plotId: string): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel || !parcel.buildingType || parcel.stage < 2) return false;
    if (this.harvestedTypeToday(parcel.buildingType)) return false;

    const day = useGameStore.getState().meta.day;
    const yields = HARVEST_YIELDS[parcel.buildingType];
    const y = parcel.stage >= 3 ? yields.stage3 : yields.stage2;

    if (y.energy) regenEnergy(y.energy);
    if (y.cash) gainCash(y.cash);
    if (y.stress) reduceStress(y.stress);
    useGameStore.setState(s => {
      const types = s.district.harvestedToday.day === day ? s.district.harvestedToday.types : [];
      const materials = { ...s.inventory.materials };
      for (const [m, n] of Object.entries(y.materials ?? {}) as [MaterialToken, number][]) {
        materials[m] = (materials[m] ?? 0) + n;
      }
      return {
        inventory: { ...s.inventory, materials },
        district: { ...s.district, harvestedToday: { day, types: [...types, parcel.buildingType!] } },
      };
    });
    const updated = this.updateParcel(plotId, { lastHarvestDay: day });

    TactileEffects.playHarvestSparkle();
    this.callbacks.onHarvest?.(updated, BUILDING_BLUEPRINTS[parcel.buildingType].dailyProduction.resource, 1);
    this.render();
    return true;
  }

  /**
   * Render the 12-plot tactile isometric/card grid into the DOM container
   */
  render(): void {
    if (!this.container || typeof document === 'undefined') return;
    this.container.innerHTML = '';
    this.container.className = 'district-grid-wrapper';

    const gridEl = document.createElement('div');
    gridEl.className = 'district-grid-layout';
    gridEl.style.cssText = `
      display: grid;
      /* 4 columns on desktop, 2 on a phone (was a fixed 4 that overflowed, audit §3.2) */
      grid-template-columns: repeat(auto-fill, minmax(min(150px, 100%), 1fr));
      gap: 12px;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 8px 0;
    `;

    this.getParcels().forEach(parcel => {
      const card = document.createElement('div');
      card.className = `district-plot-card ${this.selectedPlotId === parcel.plotId ? 'selected' : ''}`;
      card.dataset.plotId = parcel.plotId;

      const blueprint: BuildingBlueprint | null = parcel.buildingType ? BUILDING_BLUEPRINTS[parcel.buildingType] : null;
      const stageDef = blueprint ? blueprint.stages[parcel.stage] : null;

      const canHarvest = !!parcel.buildingType && parcel.stage >= 2 && !this.harvestedTypeToday(parcel.buildingType);

      // M28: colors read the active skin's CSS custom properties (with
      // these original hex values kept as the fallback, so an un-skinned
      // DEFAULT_UI_KIT game — retro_gb/labor_woodcut — renders identically
      // to before). This was the visually-dominant hardcoded content inside
      // DistrictBuilderModal, which never picked up any skin's colors even
      // though its wrapper chrome (title/close button) already did.
      card.style.cssText = `
        position: relative;
        background: var(--ui-gradient-panel, rgba(30, 41, 59, 0.85));
        border: 2px solid ${this.selectedPlotId === parcel.plotId ? 'var(--skin-accent, #10b981)' : 'var(--skin-hud-border, rgba(255, 255, 255, 0.1))'};
        border-radius: 12px;
        padding: 14px;
        color: var(--skin-hud-text, #f8fafc);
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        user-select: none;
      `;

      card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; };
      card.onmouseleave = () => { card.style.transform = 'translateY(0)'; };

      card.onclick = () => {
        this.selectedPlotId = parcel.plotId;
        this.render();
      };

      // Icon & Stage Badge
      const iconEl = document.createElement('div');
      iconEl.style.fontSize = '2.4rem';
      iconEl.textContent = stageDef ? stageDef.icon : '🌱';
      card.appendChild(iconEl);

      const titleEl = document.createElement('div');
      titleEl.style.cssText = `font-weight: 600; font-size: 0.95rem; margin-top: 6px;`;
      titleEl.textContent = blueprint ? blueprint.title : 'Unclaimed Lot';
      card.appendChild(titleEl);

      const stageNameEl = document.createElement('div');
      stageNameEl.style.cssText = `font-size: 0.75rem; color: #94a3b8; margin-top: 2px;`;
      stageNameEl.textContent = stageDef ? `Tier ${parcel.stage}: ${stageDef.name}` : 'Empty Ground';
      card.appendChild(stageNameEl);

      // Progress bar
      const progressContainer = document.createElement('div');
      progressContainer.style.cssText = `
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin-top: 10px;
        overflow: hidden;
      `;
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        width: ${parcel.progress}%;
        height: 100%;
        background: var(--skin-accent, #10b981);
        transition: width 0.4s ease-out;
      `;
      progressContainer.appendChild(progressBar);
      card.appendChild(progressContainer);

      // Harvest action button if ready
      if (canHarvest && blueprint) {
        const harvestBtn = document.createElement('button');
        harvestBtn.className = 'harvest-action-btn';
        const y = parcel.stage >= 3 ? HARVEST_YIELDS[blueprint.type].stage3 : HARVEST_YIELDS[blueprint.type].stage2;
        harvestBtn.innerHTML = `🧺 Harvest (${describeYield(y)})`;
        harvestBtn.style.cssText = `
          margin-top: 10px;
          background: #f59e0b;
          color: #000;
          font-weight: 700;
          font-size: 0.72rem;
          padding: 4px 8px;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          animation: pulse 1.5s infinite;
        `;
        harvestBtn.onclick = (e) => {
          e.stopPropagation();
          this.harvestParcel(parcel.plotId);
        };
        card.appendChild(harvestBtn);
      }

      // Upgrade action button if selected
      if (this.selectedPlotId === parcel.plotId) {
        if (blueprint && parcel.stage < 3) {
          const nextStage = blueprint.stages[parcel.stage + 1];
          const upgradeBtn = document.createElement('button');
          upgradeBtn.className = 'upgrade-action-btn';
          upgradeBtn.innerHTML = `🔨 Upgrade ($${nextStage.cashCost}, ⚡${nextStage.energyCost})`;
          upgradeBtn.style.cssText = `
            margin-top: 10px;
            background: #10b981;
            color: #fff;
            font-weight: 600;
            font-size: 0.72rem;
            padding: 5px 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
          `;
          upgradeBtn.onclick = (e) => {
            e.stopPropagation();
            this.upgradeParcel(parcel.plotId, card);
          };
          card.appendChild(upgradeBtn);
        } else if (!blueprint) {
          // Blueprint selector dropdown/buttons
          const buildBtn = document.createElement('button');
          buildBtn.textContent = '🏗️ Claim Parcel';
          buildBtn.style.cssText = `
            margin-top: 10px;
            background: #3b82f6;
            color: #fff;
            font-weight: 600;
            font-size: 0.72rem;
            padding: 5px 10px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
          `;
          buildBtn.onclick = (e) => {
            e.stopPropagation();
            this.assignBuilding(parcel.plotId, nextUnbuiltType(this.getParcels()));
          };
          card.appendChild(buildBtn);
        }
      }

      gridEl.appendChild(card);
    });

    this.container.appendChild(gridEl);
  }
}

/** Claiming a lot starts the building type the district has least of, so
 *  claimed lots aren't all kitchens. */
function nextUnbuiltType(parcels: DistrictParcelState[]): DistrictBuildingType {
  const types = Object.keys(BUILDING_BLUEPRINTS) as DistrictBuildingType[];
  const count = (t: DistrictBuildingType) => parcels.filter(p => p.buildingType === t).length;
  return types.reduce((best, t) => (count(t) < count(best) ? t : best), types[0]!);
}
