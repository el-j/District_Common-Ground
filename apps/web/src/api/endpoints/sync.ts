import { request } from '../client';
import type { SyncDeltasRequest, SyncDeltasResponse } from '@district-cg/shared-types';

/** POSTs this device's new deltas + vector clock, receiving back any deltas from the account's other devices it hasn't seen. */
export function exchangeDeltas(token: string, body: SyncDeltasRequest): Promise<SyncDeltasResponse> {
  return request<SyncDeltasResponse>('POST', '/api/v1/sync/deltas', body, token);
}
