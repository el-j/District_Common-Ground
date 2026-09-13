import { describe, it, expect, vi } from 'vitest';
import { MinigameLoader } from './MinigameLoader';
import { HostPlatformAPI } from './HostPlatformAPI';
import type { MinigameManifest, MinigameInstance } from '@district-cg/shared-types';
import { useGameStore } from '../state/useGameStore';

describe('Microkernel Minigame Engine', () => {
  it('registers local minigames and returns them in listMinigames', () => {
    const mockManifest: MinigameManifest = {
      id: 'test-game',
      version: '1.0.0',
      title: 'Test Minigame',
      description: 'Testing registration',
      category: 'puzzle',
      thumbnailUrl: '/test.png',
      entrypointUrl: 'minigames/test/index.ts',
      targetHardware: 'canvas',
    };

    const mockInstance: MinigameInstance = {
      mount: vi.fn().mockResolvedValue(undefined),
      unmount: vi.fn().mockResolvedValue(undefined),
    };

    MinigameLoader.registerLocalMinigame('test-game', mockManifest, async () => ({
      createMinigame: () => mockInstance,
    }));

    const list = MinigameLoader.listMinigames();
    expect(list.some(m => m.id === 'test-game')).toBe(true);
  });

  it('HostPlatformAPI correctly mutates Zustand store on grantRewards', async () => {
    useGameStore.setState({
      player: {
        classRole: 'pip',
        cash: 10,
        energy: 50,
        maxEnergy: 100,
        socialTrust: 20,
        stressLevel: 30,
        position: { x: 0, y: 0 },
        facing: 'down',
      },
    });

    const host = new HostPlatformAPI();
    await host.grantRewards({
      cashDelta: 25,
      trustDelta: 10,
      energyDelta: -5,
    });

    const updatedState = useGameStore.getState();
    expect(updatedState.player.cash).toBe(35);
    expect(updatedState.player.socialTrust).toBe(30);
    expect(updatedState.player.energy).toBe(45);
  });
});
