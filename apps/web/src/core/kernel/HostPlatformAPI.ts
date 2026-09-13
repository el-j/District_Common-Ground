import type { GameSessionHostAPI, ResourceGrant } from '@district-cg/shared-types';
import { gainCash, spendCash, addTrust, loseTrust, spendEnergy, regenEnergy, updateCommonsProgress } from '../state/actions';

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

  async grantRewards(rewards: Partial<ResourceGrant>): Promise<void> {
    if (rewards.cashDelta) {
      if (rewards.cashDelta > 0) gainCash(rewards.cashDelta);
      else spendCash(Math.abs(rewards.cashDelta));
    }
    if (rewards.trustDelta) {
      if (rewards.trustDelta > 0) addTrust(rewards.trustDelta);
      else loseTrust(Math.abs(rewards.trustDelta));
    }
    if (rewards.energyDelta) {
      if (rewards.energyDelta > 0) regenEnergy(rewards.energyDelta);
      else spendEnergy(Math.abs(rewards.energyDelta));
    }
    if (rewards.resilienceDelta) {
      updateCommonsProgress('resilienceScore', rewards.resilienceDelta);
    }
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
