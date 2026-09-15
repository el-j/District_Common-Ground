// Offline-First Device Storage & Delayed CRDT Sync — shared contracts (M18)
// See docs/planning/18-OFFLINE-FIRST-DEVICE-STORAGE-AND-DELAYED-SYNC.md

/** Dictionary of deviceId -> highest known sequence number for that device. */
export type VectorClock = Record<string, number>;

export type SyncActionType =
  | 'PARCEL_STAGE_ADVANCE'
  | 'COMMONS_RESOURCE_CONTRIBUTION'
  | 'MINIGAME_SCORE_COMMITTED'
  | 'IRL_DEED_LOGGED'
  | 'PEER_MUTUAL_CREDIT_TRANSFER'
  | 'SHOP_ITEM_ACQUIRED'
  // M13 — zero-PII civic telemetry events, resolved as an OR-Set (add-only,
  // never revoked) by CRDTSyncEngine.resolveOrSet() exactly like IRL_DEED_LOGGED.
  | 'CRISIS_RESOLVED'
  | 'COMMONS_MILESTONE'
  | 'LAND_TRUST_RATIFIED';

export interface SignedActionDelta {
  id: string;
  deviceId: string;
  sequence: number;
  timestamp: number;
  vectorClock: VectorClock;
  actionType: SyncActionType;
  payload: Record<string, unknown>;
  prevHash: string | null;
  hash: string;
  signature: string;
}

export interface SyncDeltasRequest {
  deviceId: string;
  vectorClock: VectorClock;
  deltas: SignedActionDelta[];
}

export interface SyncDeltasResponse {
  deltas: SignedActionDelta[];
  vectorClock: VectorClock;
}
