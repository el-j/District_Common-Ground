import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, ApiError } from '../client';
import { register, login } from './auth';
import { loadFromServer, uploadToServer } from './save';
import { listThemes } from './themes';
import { listGames } from './games';
import { listBuiltinKernelPlugins } from './kernelPlugins';
import { fetchPulseEconomy, fetchPulseClimate } from './pulse';
import { getCivicTicker, getLocalChapters } from './civic';
import { recordCrisisChoice, recordEconomicSnapshot } from './district';
import { getCatalog, getWallet, getInventory, purchaseItem } from './shop';
import {
  getMe, getFriends, addFriend, getFriendDistrict,
  dispatchCaravan, getCaravanInbox, claimCaravan,
  proposeTrade, getTradeInbox, getTradeOutbox, acceptTrade, declineTrade, cancelTrade, settleTrade
} from './social';
import { logDeed, getDeedHistory } from './irl';
import { exchangeDeltas } from './sync';
import {
  submitVerificationRequest, listVerificationRequests, reviewVerificationRequest
} from './plugins';

describe('API Client (request & ApiError)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles 204 No Content returning undefined', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await request<void>('PUT', '/api/v1/test', { a: 1 }, 'test-token');
    expect(res).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/test', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token',
      },
      body: JSON.stringify({ a: 1 }),
    });
  });

  it('throws ApiError on non-ok responses with response text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('item not found'),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('GET', '/api/v1/missing')).rejects.toThrow(ApiError);
  });

  it('throws ApiError with statusText when text() rejects', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      text: () => Promise.reject(new Error('stream closed')),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(request('GET', '/api/v1/fail')).rejects.toThrow('Server Error');
  });
});

describe('API Endpoints Wrappers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, id: '123' }),
      text: () => Promise.resolve('{"success":true}'),
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('localStorage', {
      // signed in and opted in to telemetry (see district.test.ts for the gating)
      getItem: vi.fn((key: string) => (key === 'dcg-telemetry-consent' ? 'granted' : 'mock-token-xyz')),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      localStorage.removeItem('dcg-token');
    } catch {
      // ignore
    }
  });

  it('auth endpoints invoke register and login', async () => {
    await register('test@test.com', 'password123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/register'),
      expect.objectContaining({ method: 'POST' }),
    );

    await login('test@test.com', 'password123');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('save endpoints invoke loadFromServer and uploadToServer', async () => {
    await loadFromServer('tok');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/save'),
      expect.objectContaining({ method: 'GET' }),
    );

    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 });
    await uploadToServer('tok', {} as any);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/save'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('themes and games endpoints', async () => {
    await listThemes();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/themes'),
      expect.objectContaining({ method: 'GET' }),
    );

    await listGames();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/games'),
      expect.objectContaining({ method: 'GET' }),
    );

    await listBuiltinKernelPlugins();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/kernel-plugins'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('pulse endpoints handle success and failure gracefully', async () => {
    const eco = await fetchPulseEconomy();
    expect(eco).toBeDefined();

    const cli = await fetchPulseClimate();
    expect(cli).toBeDefined();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const failedEco = await fetchPulseEconomy();
    expect(failedEco).toBeNull();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const failedCli = await fetchPulseClimate();
    expect(failedCli).toBeNull();
  });

  it('civic endpoints fetch ticker and chapters', async () => {
    await getCivicTicker('BERLIN');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/civic/ticker?region=BERLIN'),
      expect.objectContaining({ method: 'GET' }),
    );

    await getLocalChapters('BERLIN');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/civic/chapters?region=BERLIN'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('district crisis and economic snapshot recording', () => {
    recordCrisisChoice('crisis-1', 3, 'solidarity');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/district/crisis-log'),
      expect.objectContaining({ method: 'POST' }),
    );

    recordEconomicSnapshot(3, 'pip', 50, 80);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/district/economic-snapshot'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('shop endpoints', async () => {
    await getCatalog();
    await getWallet();
    await getInventory();
    await purchaseItem('item-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/shop/purchase'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('social endpoints', async () => {
    await getMe();
    await getFriends();
    await addFriend('friend-id');
    await getFriendDistrict('friend-id');
    await dispatchCaravan('friend-id', 'cash', 10, 'gift');
    await getCaravanInbox();
    await claimCaravan('caravan-id');
    await proposeTrade('friend-id', 'cash', 10, 'energy', 20, 'trade');
    await getTradeInbox();
    await getTradeOutbox();
    await acceptTrade('trade-1');
    await declineTrade('trade-1');
    await cancelTrade('trade-1');
    await settleTrade('trade-1');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/social/trade/trade-1/settle'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('irl endpoints', async () => {
    await logDeed('food_sharing', 'shared pantry items', 'honor_system');
    await getDeedHistory();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/irl/deeds'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sync endpoints', async () => {
    await exchangeDeltas('tok', {
      deviceId: 'dev-1',
      vectorClock: { 'dev-1': 1 },
      deltas: [],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/sync/deltas'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('plugin verification endpoints', async () => {
    await submitVerificationRequest({
      sourceKind: 'url',
      bundleSha256: 'hash-abc',
      pluginMetadata: {
        id: 'plug-1',
        title: 'Plug One',
        version: '1.0.0',
        description: 'Desc',
        category: 'delivery',
        thumbnailUrl: '',
        entrypointUrl: '',
        permissions: [],
        targetHardware: 'canvas',
      },
    });
    await listVerificationRequests();
    await reviewVerificationRequest('req-1', true, 'approved');
  });

  it('handles missing or throwing localStorage auth tokens gracefully', async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockImplementation(() => { throw new Error('security error'); }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    // Fire calls where token is optional or checked
    recordCrisisChoice('crisis-1', 1, 'solidarity');
    recordEconomicSnapshot(1, 'pip', 10, 10);
    await getMe();
    await logDeed('food_sharing', 'note', 'honor_system');
    await getCatalog();
    await listVerificationRequests();
  });
});
