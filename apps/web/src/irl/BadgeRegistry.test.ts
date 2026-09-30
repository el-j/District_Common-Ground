import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
	get: (key: string) => Promise.resolve(store.get(key)),
	set: (key: string, value: unknown) => {
		store.set(key, value);
		return Promise.resolve();
	},
}));

const logDeedMock = vi.fn();
vi.mock('../api/endpoints/irl', () => ({
	logDeed: (...args: unknown[]) => logDeedMock(...args),
}));

let tokenValue: string | null = 'signed-in-token';
vi.mock('../core/state/persistence', () => ({
	getToken: () => tokenValue,
}));

import { awardForDeed, flushOutbox, getOutboxCount } from './BadgeRegistry';
import { ApiError } from '../api/client';

beforeEach(() => {
	store.clear();
	logDeedMock.mockReset();
	tokenValue = 'signed-in-token';
});

describe('BadgeRegistry', () => {
	it('credits immediately when signed in and the request succeeds', async () => {
		logDeedMock.mockResolvedValue({
			deed: { id: '1', category: 'eldercare', note: '', verificationMethod: 'honor_system', stAwarded: 25, cabAwarded: 1, createdAt: '' },
			wallet: { userId: 'u1', solidarityTokens: 25, civicBadges: 1 },
		});

		const result = await awardForDeed('eldercare', 'Helped carry groceries', 'honor_system');
		expect(result.synced).toBe(true);
		expect(result.wallet?.solidarityTokens).toBe(25);
		expect(await getOutboxCount()).toBe(0);
	});

	it('queues offline when signed out, without losing the deed', async () => {
		tokenValue = null;
		const result = await awardForDeed('park_greening', 'Watered street trees', 'honor_system');
		expect(result.synced).toBe(false);
		expect(logDeedMock).not.toHaveBeenCalled();
		expect(await getOutboxCount()).toBe(1);
	});

	it('queues offline when signed in but the request fails (network error)', async () => {
		logDeedMock.mockRejectedValue(new Error('network down'));
		const result = await awardForDeed('community_repair', 'Fixed a bike', 'peer_verified');
		expect(result.synced).toBe(false);
		expect(await getOutboxCount()).toBe(1);
	});

	it('flushOutbox retries queued deeds and drains them on success', async () => {
		tokenValue = null;
		await awardForDeed('food_sharing', 'Shared extra bread', 'honor_system');
		expect(await getOutboxCount()).toBe(1);

		tokenValue = 'signed-in-token';
		logDeedMock.mockResolvedValue({
			deed: { id: '2', category: 'food_sharing', note: '', verificationMethod: 'honor_system', stAwarded: 25, cabAwarded: 1, createdAt: '' },
			wallet: { userId: 'u1', solidarityTokens: 25, civicBadges: 1 },
		});

		const flush = await flushOutbox();
		expect(flush).toEqual({ flushed: 1, remaining: 0 });
		expect(await getOutboxCount()).toBe(0);
	});

	it('flushOutbox leaves still-failing deeds queued instead of dropping them', async () => {
		tokenValue = null;
		await awardForDeed('eldercare', 'a', 'honor_system');
		await awardForDeed('eldercare', 'b', 'honor_system');

		tokenValue = 'signed-in-token';
		logDeedMock.mockRejectedValueOnce(new Error('still down')).mockResolvedValueOnce({
			deed: { id: '3', category: 'eldercare', note: '', verificationMethod: 'honor_system', stAwarded: 25, cabAwarded: 1, createdAt: '' },
			wallet: { userId: 'u1', solidarityTokens: 25, civicBadges: 1 },
		});

		const flush = await flushOutbox();
		expect(flush).toEqual({ flushed: 1, remaining: 1 });
		expect(await getOutboxCount()).toBe(1);
	});

	// 2026-09-29 launch audit §1.8 — the server now rejects a 4th deed a day
	// with 429. A rejection must not be queued and retried forever.
	it('does not queue a deed the server rejected (daily limit)', async () => {
		logDeedMock.mockRejectedValueOnce(new ApiError(429, 'daily deed limit reached'));
		const result = await awardForDeed('eldercare', 'x', 'honor_system');
		expect(result).toEqual({ synced: false, rejected: 'daily-limit' });
		expect(await getOutboxCount()).toBe(0);
	});

	it('flushOutbox drops queued deeds the server rejects instead of retrying forever', async () => {
		tokenValue = null;
		await awardForDeed('eldercare', 'a', 'honor_system');
		tokenValue = 'signed-in-token';
		logDeedMock.mockRejectedValueOnce(new ApiError(429, 'limit'));
		expect(await flushOutbox()).toEqual({ flushed: 0, remaining: 0 });
	});
});
