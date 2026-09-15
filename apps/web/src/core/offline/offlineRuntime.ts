// M18 — the single shared SignedEventLog instance for this device, lazily
// initialized on first use. Call sites (actions.ts, BadgeRegistry.ts,
// DistrictGrid.ts) call `recordAction()` fire-and-forget, exactly like
// persistence.ts's `saveToDB()` never blocks gameplay on IndexedDB/network —
// a failed local signing/append must never break the interaction that
// triggered it.
//
// Scoping note: this module only produces the local signed log — it does not
// enqueue onto SyncQueueService or activate DistrictGatewayClient. Both are
// built and unit-tested (apps/web/src/core/sync/) and ready to consume this
// log's deltas, but wiring background sync into main.ts's boot sequence is a
// follow-up, not claimed here.
import type { SyncActionType } from '@district-cg/shared-types';
import { SignedEventLog, loadOrCreateDeviceIdentity } from './SignedEventLog';

let logPromise: Promise<SignedEventLog> | null = null;

async function getLog(): Promise<SignedEventLog> {
  if (!logPromise) {
    logPromise = (async () => {
      const { keyPair, deviceId } = await loadOrCreateDeviceIdentity();
      const log = new SignedEventLog(deviceId, keyPair);
      await log.hydrate();
      return log;
    })();
  }
  return logPromise;
}

/** Fire-and-forget: signs and appends an action delta to this device's local event log. */
export function recordAction(actionType: SyncActionType, payload: Record<string, unknown>): void {
  void getLog()
    .then(log => log.append(actionType, payload))
    .catch(() => {
      // best effort — never block the gameplay action that triggered this
    });
}

/** Test-only: resets the cached singleton so each test starts from a clean log. */
export function resetOfflineRuntimeForTests(): void {
  logPromise = null;
}
