import { describe, it, expect } from 'vitest';
import { DistrictGrid } from './DistrictGrid';
import { useGameStore } from '../core/state/useGameStore';

describe('Living District Builder (DistrictGrid)', () => {
  it('initializes 12 parcels in the grid', () => {
    const grid = new DistrictGrid();
    const parcels = grid.getParcels();

    expect(parcels.length).toBe(12);
    expect(parcels[0].plotId).toBe('plot_1');
    expect(parcels[0].buildingType).toBe('community_kitchen');
  });

  it('assigns a blueprint to an empty plot', () => {
    const grid = new DistrictGrid();

    const emptyPlot = grid.getParcels().find(p => p.buildingType === null);
    expect(emptyPlot).toBeDefined();

    if (emptyPlot) {
      const ok = grid.assignBuilding(emptyPlot.plotId, 'solar_cooperative');
      expect(ok).toBe(true);
      expect(emptyPlot.buildingType).toBe('solar_cooperative');
      expect(emptyPlot.stage).toBe(0);
    }
  });

  it('upgrades parcel to next tier when player has sufficient resources', () => {
    const grid = new DistrictGrid();

    useGameStore.setState({
      player: {
        classRole: 'pip',
        cash: 100,
        energy: 100,
        maxEnergy: 100,
        socialTrust: 20,
        stressLevel: 30,
        position: { x: 0, y: 0 },
        facing: 'down',
      },
    });

    const plot = grid.getParcel('plot_1');
    expect(plot).toBeDefined();
    if (plot) {
      const initialStage = plot.stage;
      const ok = grid.upgradeParcel(plot.plotId);
      expect(ok).toBe(true);
      expect(plot.stage).toBe(initialStage + 1);
    }
  });
});
