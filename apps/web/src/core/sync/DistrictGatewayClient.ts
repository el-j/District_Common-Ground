// M18 — Tier 2 (grid/internet) sync transport: same-account, multi-device
// reconciliation against apps/api's `/api/v1/sync/deltas` gateway, auth-gated
// exactly like the existing GET/PUT /api/v1/save (see
// apps/web/src/api/endpoints/save.ts). Implements SyncQueueService's
// SyncTransport contract so the queue doesn't need to know this is HTTP.
//
// Scoping note: Tier 1 (off-grid peer mesh — Bluetooth/LoRa/WebRTC) is not
// this class's job. CRDTSyncEngine's resolvers are transport-agnostic on
// purpose, so a future M19 mesh transport can satisfy the same
// SyncTransport interface without any change here.
import type { SignedActionDelta, VectorClock } from '@district-cg/shared-types';
import type { SyncTransport } from './SyncQueueService';
import { exchangeDeltas } from '../../api/endpoints/sync';
import { getToken } from '../state/persistence';

export class DistrictGatewayClient implements SyncTransport {
  constructor(private readonly deviceId: string) {}

  async send(deltas: SignedActionDelta[], vectorClock: VectorClock): Promise<{ deltas: SignedActionDelta[]; vectorClock: VectorClock }> {
    const token = getToken();
    if (!token) {
      // Not authenticated — nothing to sync against yet. Report success with
      // nothing learned so SyncQueueService doesn't burn a retry/backoff cycle
      // on a condition that isn't actually a transport failure.
      return { deltas: [], vectorClock: {} };
    }
    const response = await exchangeDeltas(token, { deviceId: this.deviceId, vectorClock, deltas });
    return response;
  }
}
