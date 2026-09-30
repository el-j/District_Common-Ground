import { describe, it, expect, beforeEach } from 'vitest';
import { DistrictGrid, HARVEST_YIELDS } from './DistrictGrid';
import { BUILDING_BLUEPRINTS } from './ConstructionStages';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';

function reset(player: Partial<typeof INITIAL_STATE.player> = {}) {
  const s = structuredClone(INITIAL_STATE);
  s.meta.phase = 'playing';
  s.player = { ...s.player, classRole: 'pip', cash: 200, energy: 100, socialTrust: 20, stressLevel: 30, ...player };
  useGameStore.setState(s, true);
}

describe('Living District Builder (DistrictGrid)', () => {
  beforeEach(() => reset());

  it('initializes 12 parcels in the grid', () => {
    const grid = new DistrictGrid();
    const parcels = grid.getParcels();

    expect(parcels.length).toBe(12);
    expect(parcels[0].plotId).toBe('plot_1');
    expect(parcels[0].buildingType).toBe('community_kitchen');
  });

  it('assigns a blueprint to an empty plot', () => {
    const grid = new DistrictGrid();

    const emptyPlot = grid.getParcels().find(p => p.buildingType === null)!;
    const ok = grid.assignBuilding(emptyPlot.plotId, 'solar_cooperative');
    expect(ok).toBe(true);
    expect(grid.getParcel(emptyPlot.plotId)!.buildingType).toBe('solar_cooperative');
    expect(grid.getParcel(emptyPlot.plotId)!.stage).toBe(0);
  });

  it('upgrades parcel to next tier when player has sufficient resources', () => {
    const grid = new DistrictGrid();
    const initialStage = grid.getParcel('plot_1')!.stage;
    expect(grid.upgradeParcel('plot_1')).toBe(true);
    expect(grid.getParcel('plot_1')!.stage).toBe(initialStage + 1);
  });
});

// 2026-09-29 launch audit §2.2 — parcels were rebuilt from defaults every
// time the modal opened: upgrades were charged, then lost, and could be
// bought again for more trust (a repeatable trust farm). Harvest did nothing.
describe('District Builder persistence and harvest', () => {
  beforeEach(() => reset());

  it('parcels live in game state and survive re-opening the builder', () => {
    new DistrictGrid().upgradeParcel('plot_1');
    const stage = useGameStore.getState().district.parcels.find(p => p.plotId === 'plot_1')!.stage;
    expect(new DistrictGrid().getParcel('plot_1')!.stage).toBe(stage);
  });

  it('re-opening does not let the same upgrade be bought again', () => {
    const first = new DistrictGrid();
    first.upgradeParcel('plot_1');
    const trustAfterOne = useGameStore.getState().player.socialTrust;
    const second = new DistrictGrid();
    const stageBefore = second.getParcel('plot_1')!.stage;
    second.upgradeParcel('plot_1');
    expect(second.getParcel('plot_1')!.stage).toBe(stageBefore + 1);
    expect(useGameStore.getState().player.socialTrust).toBeGreaterThan(trustAfterOne);
    // stage 3 is the cap — upgrades eventually stop
    reset({ cash: 10_000, energy: 100 });
    const g = new DistrictGrid();
    for (let i = 0; i < 10; i += 1) {
      useGameStore.setState(s => ({ player: { ...s.player, energy: 100 } }));
      g.upgradeParcel('plot_2');
    }
    expect(g.getParcel('plot_2')!.stage).toBe(3);
  });

  it('upgrade rewards are modest (trust and resilience equal to the new stage)', () => {
    const grid = new DistrictGrid();
    const before = useGameStore.getState();
    grid.upgradeParcel('plot_1'); // stage 1 → 2
    const after = useGameStore.getState();
    expect(after.player.socialTrust - before.player.socialTrust).toBe(2);
    expect(after.commons.resilienceModifier - before.commons.resilienceModifier).toBe(2);
  });

  it('harvest grants a real resource', () => {
    const grid = new DistrictGrid();
    grid.upgradeParcel('plot_1'); // kitchen to stage 2 (operational)
    const energyBefore = useGameStore.getState().player.energy;
    expect(grid.harvestParcel('plot_1')).toBe(true);
    expect(useGameStore.getState().player.energy).toBe(energyBefore + HARVEST_YIELDS.community_kitchen.stage2.energy!);
  });

  it('each building type can be harvested once per day, however many parcels have it', () => {
    const grid = new DistrictGrid();
    grid.assignBuilding('plot_5', 'community_kitchen');
    for (const plot of ['plot_1', 'plot_5', 'plot_5', 'plot_5']) {
      useGameStore.setState(s => ({ player: { ...s.player, energy: 100, cash: 500 } }));
      grid.upgradeParcel(plot);
    }
    expect(grid.harvestParcel('plot_1')).toBe(true);
    expect(grid.harvestParcel('plot_5')).toBe(false);
    useGameStore.setState(s => ({ meta: { ...s.meta, day: s.meta.day + 1 } }));
    expect(grid.harvestParcel('plot_5')).toBe(true);
  });

  it('every blueprint has a harvest yield', () => {
    for (const type of Object.keys(BUILDING_BLUEPRINTS)) {
      expect(HARVEST_YIELDS[type as keyof typeof HARVEST_YIELDS], type).toBeDefined();
    }
  });
});
