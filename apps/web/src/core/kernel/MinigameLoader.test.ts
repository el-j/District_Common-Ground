// @vitest-environment jsdom
// The default project environment is 'node' (no DOM); MinigameContainer's
// mount/unmount lifecycle test below genuinely needs one, so this file alone
// opts into jsdom rather than changing the environment for the whole suite.
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

  // M14 follow-up (audit 2026-09-15) Test 14.2 — Zero Memory Leaks.
  it('mounting and unmounting a minigame 10 times leaves no leaked DOM nodes or listeners', async () => {
    useGameStore.setState({
      player: {
        classRole: 'pip', cash: 10, energy: 50, maxEnergy: 100,
        socialTrust: 20, stressLevel: 30, position: { x: 0, y: 0 }, facing: 'down',
      },
    });

    const manifest: MinigameManifest = {
      id: 'leak-test-game',
      version: '1.0.0',
      title: 'Leak Test Minigame',
      description: 'Testing mount/unmount lifecycle cleanup',
      category: 'puzzle',
      thumbnailUrl: '/test.png',
      entrypointUrl: 'minigames/leak-test/index.ts',
      targetHardware: 'canvas',
    };

    let mountCalls = 0;
    let unmountCalls = 0;
    const instance: MinigameInstance = {
      mount: vi.fn(async (el: HTMLElement) => {
        mountCalls += 1;
        // A well-behaved minigame that adds its own DOM node + listener on
        // mount, and must remove both on unmount — exactly what a leak looks
        // like if unmount() is never called or is a no-op.
        const child = document.createElement('div');
        child.className = 'leak-test-child';
        const handler = () => {};
        child.addEventListener('click', handler);
        el.appendChild(child);
      }),
      unmount: vi.fn(async () => {
        unmountCalls += 1;
      }),
    };

    MinigameLoader.registerLocalMinigame('leak-test-game', manifest, async () => ({
      createMinigame: () => instance,
    }));

    const parent = document.createElement('div');
    document.body.appendChild(parent);

    for (let i = 0; i < 10; i++) {
      const { container } = await MinigameLoader.launchMinigame('leak-test-game', {}, parent);
      await container.unmount();
    }

    expect(mountCalls).toBe(10);
    expect(unmountCalls).toBe(10);
    // No minigame-container-root nodes (or anything else) should remain under
    // the parent once every launch has been unmounted.
    expect(parent.querySelectorAll('.minigame-container-root').length).toBe(0);
    expect(parent.children.length).toBe(0);

    document.body.removeChild(parent);
    MinigameLoader.unregisterMinigame('leak-test-game');
  });

  // M20 follow-up (audit 2026-09-15) — remote dynamic-loading path.
  describe('loadRemoteMinigame', () => {
    it('loads and registers a real same-origin fixture module', async () => {
      const manifest: MinigameManifest = {
        id: 'remote-fixture-game',
        version: '1.0.0',
        title: 'Remote Fixture Game',
        description: 'A same-origin fixture standing in for a remote plugin bundle',
        category: 'puzzle',
        thumbnailUrl: '/test.png',
        entrypointUrl: './__fixtures__/remoteMinigameFixture.ts',
        targetHardware: 'canvas',
      };

      expect(MinigameLoader.hasMinigame('remote-fixture-game')).toBe(false);
      await MinigameLoader.loadRemoteMinigame(manifest);
      expect(MinigameLoader.hasMinigame('remote-fixture-game')).toBe(true);

      const parent = document.createElement('div');
      document.body.appendChild(parent);
      const { container } = await MinigameLoader.launchMinigame('remote-fixture-game', {}, parent);
      await container.unmount();
      document.body.removeChild(parent);

      MinigameLoader.unregisterMinigame('remote-fixture-game');
    });

    it('rejects a malformed remote module without crashing the loader', async () => {
      const manifest: MinigameManifest = {
        id: 'malformed-fixture-game',
        version: '1.0.0',
        title: 'Malformed Fixture Game',
        description: 'A module missing createMinigame() — must fail gracefully',
        category: 'puzzle',
        thumbnailUrl: '/test.png',
        entrypointUrl: './__fixtures__/malformedMinigameFixture.ts',
        targetHardware: 'canvas',
      };

      await expect(MinigameLoader.loadRemoteMinigame(manifest)).rejects.toThrow('does not export a createMinigame');
      expect(MinigameLoader.hasMinigame('malformed-fixture-game')).toBe(false);
    });

    it('throws a clear error when the manifest has no entrypointUrl', async () => {
      const manifest: MinigameManifest = {
        id: 'no-entrypoint-game',
        version: '1.0.0',
        title: 'No Entrypoint Game',
        description: 'Missing entrypointUrl',
        category: 'puzzle',
        thumbnailUrl: '/test.png',
        entrypointUrl: '',
        targetHardware: 'canvas',
      };

      await expect(MinigameLoader.loadRemoteMinigame(manifest)).rejects.toThrow('no entrypointUrl');
    });

    it('is a no-op when the id is already registered locally', async () => {
      const manifest: MinigameManifest = {
        id: 'test-game', // registered by the first test in this file
        version: '1.0.0',
        title: 'Test Minigame',
        description: 'Already registered locally',
        category: 'puzzle',
        thumbnailUrl: '/test.png',
        entrypointUrl: './__fixtures__/remoteMinigameFixture.ts',
        targetHardware: 'canvas',
      };
      await expect(MinigameLoader.loadRemoteMinigame(manifest)).resolves.toBeUndefined();
    });
  });
});
