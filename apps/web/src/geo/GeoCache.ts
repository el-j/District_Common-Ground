import { get, set } from 'idb-keyval';
import type { TilemapResult } from './GeoJsonToTilemap';
import type { AmenityMarker } from './AmenityClassifier';

export interface CachedNeighborhood {
	tilemap: TilemapResult;
	amenities: AmenityMarker[];
	source: 'live' | 'offline-sample';
	cachedAt: number;
}

const CACHE_PREFIX = 'district-cg-geo-';

/** Stable cache key for a generated neighborhood, rounded so tiny GPS jitter
 *  reuses the same cached tilemap instead of re-fetching. */
export function neighborhoodCacheKey(lat: number, lon: number, radiusKm: number): string {
	return `${CACHE_PREFIX}${lat.toFixed(3)}_${lon.toFixed(3)}_${radiusKm.toFixed(1)}`;
}

export async function cacheNeighborhood(key: string, data: Omit<CachedNeighborhood, 'cachedAt'>): Promise<void> {
	await set(key, { ...data, cachedAt: Date.now() });
}

export async function loadCachedNeighborhood(key: string): Promise<CachedNeighborhood | undefined> {
	return get<CachedNeighborhood>(key);
}
