import { describe, it, expect, beforeEach } from 'vitest';
import { HostPlatformAPI } from './HostPlatformAPI';
import { useGameStore, INITIAL_STATE } from '../state/useGameStore';
import { MINIGAME_LIMITS } from '../simulation/EconomyRules';
import { BASE_RESILIENCE } from '../simulation/EconomyMath';

// 2026-09-29 launch audit §1.3/§1.4 — a minigame (first-party or a
// sandboxed third-party plugin) used to be able to grant unlimited cash,
// trust and energy, and its resilience reward was silently discarded.
describe('HostPlatformAPI.grantRewards', () => {
  beforeEach(() => {
    const fresh = structuredClone(INITIAL_STATE);
    fresh.player = { ...fresh.player, cash: 10, energy: 40, socialTrust: 20 };
    useGameStore.setState(fresh, true);
  });

  it('applies a normal reward and returns what was actually granted', async () => {
    const host = new HostPlatformAPI();
    const granted = await host.grantRewards({ cashDelta: 12, trustDelta: 2 });
    expect(granted).toEqual({ cashDelta: 12, trustDelta: 2, energyDelta: 0, resilienceDelta: 0 });
    expect(useGameStore.getState().player.cash).toBe(22);
    expect(useGameStore.getState().player.socialTrust).toBe(22);
  });

  it('caps what a single run can grant', async () => {
    const host = new HostPlatformAPI();
    await host.grantRewards({ cashDelta: 10_000, trustDelta: 500 });
    expect(useGameStore.getState().player.cash).toBe(10 + MINIGAME_LIMITS.maxCash);
    expect(useGameStore.getState().player.socialTrust).toBe(20 + MINIGAME_LIMITS.maxTrust);
  });

  it('only pays out once per session', async () => {
    const host = new HostPlatformAPI();
    await host.grantRewards({ cashDelta: 10 });
    const second = await host.grantRewards({ cashDelta: 10 });
    expect(useGameStore.getState().player.cash).toBe(20);
    expect(second).toEqual({ cashDelta: 0, trustDelta: 0, energyDelta: 0, resilienceDelta: 0 });
  });

  it('ignores energy requests (the run was charged at launch)', async () => {
    const host = new HostPlatformAPI();
    await host.grantRewards({ energyDelta: 60 });
    expect(useGameStore.getState().player.energy).toBe(40);
  });

  it('applies resilience rewards through the persisted modifier instead of discarding them', async () => {
    const host = new HostPlatformAPI();
    await host.grantRewards({ resilienceDelta: 2 });
    expect(useGameStore.getState().commons.resilienceScore).toBe(BASE_RESILIENCE + 2);
  });
});
