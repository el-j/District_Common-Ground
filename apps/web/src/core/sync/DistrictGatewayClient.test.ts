import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/endpoints/sync', () => ({ exchangeDeltas: vi.fn() }));
vi.mock('../state/persistence', () => ({ getToken: vi.fn() }));

import { exchangeDeltas } from '../../api/endpoints/sync';
import { getToken } from '../state/persistence';
import { DistrictGatewayClient } from './DistrictGatewayClient';

describe('DistrictGatewayClient', () => {
  beforeEach(() => {
    vi.mocked(exchangeDeltas).mockReset();
    vi.mocked(getToken).mockReset();
  });

  it('exchanges deltas + vector clock with the gateway when authenticated', async () => {
    vi.mocked(getToken).mockReturnValue('jwt-token');
    vi.mocked(exchangeDeltas).mockResolvedValue({ deltas: [], vectorClock: { 'device-b': 2 } });

    const client = new DistrictGatewayClient('device-a');
    const result = await client.send([], { 'device-a': 1 });

    expect(exchangeDeltas).toHaveBeenCalledWith('jwt-token', { deviceId: 'device-a', vectorClock: { 'device-a': 1 }, deltas: [] });
    expect(result).toEqual({ deltas: [], vectorClock: { 'device-b': 2 } });
  });

  it('short-circuits to an empty, successful result when unauthenticated (no wasted retry cycle)', async () => {
    vi.mocked(getToken).mockReturnValue(null);
    const client = new DistrictGatewayClient('device-a');
    const result = await client.send([], {});
    expect(exchangeDeltas).not.toHaveBeenCalled();
    expect(result).toEqual({ deltas: [], vectorClock: {} });
  });
});
