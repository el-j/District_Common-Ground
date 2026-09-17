import type { DistrictParcelState, DistrictBuildingType } from '@district-cg/shared-types';
import { BUILDING_BLUEPRINTS, type BuildingBlueprint, type StageDefinition } from './ConstructionStages';
import { TactileEffects } from './TactileEffects';
import { useGameStore } from '../core/state/useGameStore';
import { spendCash, spendEnergy, addTrust, updateCommonsProgress } from '../core/state/actions';
import { recordAction } from '../core/offline/offlineRuntime';

export interface DistrictGridCallbacks {
  onParcelUpdated?: (parcel: DistrictParcelState) => void;
  onHarvest?: (parcel: DistrictParcelState, resource: string, amount: number) => void;
}

export class DistrictGrid {
  private parcels: DistrictParcelState[] = [];
  private container: HTMLElement | null = null;
  private selectedPlotId: string | null = null;
  private callbacks: DistrictGridCallbacks;

  constructor(container: HTMLElement | null = null, callbacks: DistrictGridCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.initParcels();
  }

  private initParcels(): void {
    // 12 plots in a 4x3 neighborhood grid
    const totalPlots = 12;
    const initialBuildingTypes: (DistrictBuildingType | null)[] = [
      'community_kitchen', 'solar_cooperative', 'urban_garden', 'tool_library',
      null, 'clinic', null, null,
      null, null, null, null,
    ];

    this.parcels = Array.from({ length: totalPlots }, (_, i) => ({
      plotId: `plot_${i + 1}`,
      position: { x: i % 4, y: Math.floor(i / 4) },
      buildingType: initialBuildingTypes[i] ?? null,
      stage: (initialBuildingTypes[i] ? 1 : 0) as 0 | 1 | 2 | 3,
      progress: initialBuildingTypes[i] ? 25 : 0,
      lastHarvestDay: null,
    }));
  }

  getParcels(): DistrictParcelState[] {
    return this.parcels;
  }

  setParcels(parcels: DistrictParcelState[]): void {
    this.parcels = parcels;
    this.render();
  }

  getParcel(plotId: string): DistrictParcelState | undefined {
    return this.parcels.find(p => p.plotId === plotId);
  }

  /**
   * Assign a building blueprint to an empty lot
   */
  assignBuilding(plotId: string, buildingType: DistrictBuildingType): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel) return false;

    parcel.buildingType = buildingType;
    parcel.stage = 0;
    parcel.progress = 0;

    TactileEffects.playHammerHit();
    this.render();
    this.callbacks.onParcelUpdated?.(parcel);
    return true;
  }

  /**
   * Attempt to advance a parcel to the next construction stage
   */
  upgradeParcel(plotId: string, plotElement?: HTMLElement): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel || !parcel.buildingType) return false;

    if (parcel.stage >= 3) {
      console.info(`Parcel ${plotId} is already at max solarpunk tier!`);
      return false;
    }

    const blueprint = BUILDING_BLUEPRINTS[parcel.buildingType];
    const nextStageDef: StageDefinition = blueprint.stages[parcel.stage + 1];

    const state = useGameStore.getState();
    if (state.player.energy < nextStageDef.energyCost || state.player.cash < nextStageDef.cashCost) {
      console.warn('Insufficient cash or energy to upgrade plot.');
      return false;
    }

    // Deduct resources
    spendEnergy(nextStageDef.energyCost);
    spendCash(nextStageDef.cashCost);

    // Apply progression
    parcel.stage = (parcel.stage + 1) as 0 | 1 | 2 | 3;
    parcel.progress = Math.min(100, (parcel.stage / 3) * 100);

    // M18 — records this stage advance as a local signed LWW delta so it
    // resolves deterministically (see CRDTSyncEngine.resolveLwwParcels) if
    // this plot was also advanced on another of this player's devices.
    recordAction('PARCEL_STAGE_ADVANCE', { plotId, stage: parcel.stage });

    // Grant rewards
    addTrust(nextStageDef.resilienceReward);
    updateCommonsProgress('resilienceScore', nextStageDef.resilienceReward);

    // Sound & visual celebrations
    TactileEffects.playHammerHit();
    setTimeout(() => TactileEffects.playStageCompleteChime(), 120);

    if (plotElement) {
      TactileEffects.spawnCelebrationParticles(plotElement);
    }

    this.render();
    this.callbacks.onParcelUpdated?.(parcel);
    return true;
  }

  /**
   * Harvest production from an operational parcel
   */
  harvestParcel(plotId: string): boolean {
    const parcel = this.getParcel(plotId);
    if (!parcel || !parcel.buildingType || parcel.stage < 2) return false;

    const currentDay = useGameStore.getState().meta.day;
    if (parcel.lastHarvestDay === currentDay) {
      return false; // Already harvested today
    }

    const blueprint = BUILDING_BLUEPRINTS[parcel.buildingType];
    parcel.lastHarvestDay = currentDay;

    TactileEffects.playHarvestSparkle();
    this.callbacks.onHarvest?.(parcel, blueprint.dailyProduction.resource, blueprint.dailyProduction.amount);
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
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 16px;
    `;

    const currentDay = useGameStore.getState().meta.day;

    this.parcels.forEach(parcel => {
      const card = document.createElement('div');
      card.className = `district-plot-card ${this.selectedPlotId === parcel.plotId ? 'selected' : ''}`;
      card.dataset.plotId = parcel.plotId;

      const blueprint: BuildingBlueprint | null = parcel.buildingType ? BUILDING_BLUEPRINTS[parcel.buildingType] : null;
      const stageDef = blueprint ? blueprint.stages[parcel.stage] : null;

      const canHarvest = parcel.stage >= 2 && parcel.lastHarvestDay !== currentDay;

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
        harvestBtn.innerHTML = `🧺 Harvest (${blueprint.dailyProduction.resource})`;
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
            this.assignBuilding(parcel.plotId, 'community_kitchen');
          };
          card.appendChild(buildBtn);
        }
      }

      gridEl.appendChild(card);
    });

    this.container.appendChild(gridEl);
  }
}
