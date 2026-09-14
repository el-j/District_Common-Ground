import { describe, it, expect, vi } from 'vitest';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
	get: (key: string) => Promise.resolve(store.get(key)),
	set: (key: string, value: unknown) => {
		store.set(key, value);
		return Promise.resolve();
	},
}));

import { neighborhoodCacheKey, cacheNeighborhood, loadCachedNeighborhood } from './GeoCache';
import { GeoTile } from './GeoJsonToTilemap';

describe('GeoCache', () => {
	it('produces a stable key that tolerates tiny GPS jitter', () => {
		const a = neighborhoodCacheKey(52.47961, 13.43589, 1.5);
		const b = neighborhoodCacheKey(52.47962, 13.43591, 1.5);
		expect(a).toBe(b);
	});

	it('round-trips a generated neighborhood through the cache', async () => {
		const key = neighborhoodCacheKey(52.48, 13.43, 1.0);
		await cacheNeighborhood(key, {
			tilemap: { tiles: [[GeoTile.GRASS]], gridSize: 1, centerLat: 52.48, centerLon: 13.43, radiusKm: 1.0 },
			amenities: [],
			source: 'offline-sample',
		});
		const loaded = await loadCachedNeighborhood(key);
		expect(loaded?.tilemap.gridSize).toBe(1);
		expect(loaded?.source).toBe('offline-sample');
		expect(typeof loaded?.cachedAt).toBe('number');
	});

	it('returns undefined for a neighborhood that was never cached', async () => {
		const loaded = await loadCachedNeighborhood(neighborhoodCacheKey(0, 0, 1));
		expect(loaded).toBeUndefined();
	});
});
