import type { GameSessionHostAPI, ResourceGrant } from '@district-cg/shared-types';
import { gainCash, addTrust, adjustResilience } from '../state/actions';
import { clampMinigameGrant, type MinigameGrant } from '../simulation/EconomyRules';

export interface HostPlatformCallbacks {
  onPlaySFX?: (sfxId: string) => void;
  onNotify?: (message: string, type: 'info' | 'success' | 'warning') => void;
  onClose?: (result?: { score: number; completed: boolean }) => void;
}

export class HostPlatformAPI implements GameSessionHostAPI {
  private callbacks: HostPlatformCallbacks;

  constructor(callbacks: HostPlatformCallbacks = {}) {
    this.callbacks = callbacks;
  }

  playSFX(sfxId: string): void {
    if (this.callbacks.onPlaySFX) {
      this.callbacks.onPlaySFX(sfxId);
    }
  }

  private rewardsGranted = false;

  /** One HostPlatformAPI instance = one minigame run. The run's energy was
   *  already charged at launch (`startMinigameRun()`), so the plugin can
   *  only add a capped reward, once (see `clampMinigameGrant()`). Returns
   *  what was actually granted so the plugin can show the real numbers. */
  async grantRewards(rewards: Partial<ResourceGrant>): Promise<MinigameGrant> {
    const none: MinigameGrant = { cashDelta: 0, trustDelta: 0, energyDelta: 0, resilienceDelta: 0 };
    if (this.rewardsGranted) return none;
    this.rewardsGranted = true;
    const grant = clampMinigameGrant(rewards ?? {});
    if (grant.cashDelta > 0) gainCash(grant.cashDelta);
    if (grant.trustDelta > 0) addTrust(grant.trustDelta);
    if (grant.resilienceDelta > 0) adjustResilience(grant.resilienceDelta);
    return grant;
  }

  notify(message: string, type: 'info' | 'success' | 'warning' = 'info'): void {
    if (this.callbacks.onNotify) {
      this.callbacks.onNotify(message, type);
    } else {
      console.info(`[HostPlatformAPI:${type}] ${message}`);
    }
  }

  closeMinigame(result?: { score: number; completed: boolean }): void {
    if (this.callbacks.onClose) {
      this.callbacks.onClose(result);
    }
  }
}
