import { describe, it, expect, vi } from 'vitest';
import { bboxFromCenter, buildQuery, toGeoJson, fetchNeighborhood } from './OverpassClient';

describe('OverpassClient', () => {
	it('computes a bounding box roughly radiusKm around the center point', () => {
		const bbox = bboxFromCenter(52.48, 13.43, 1.0);
		expect(bbox.north).toBeGreaterThan(52.48);
		expect(bbox.south).toBeLessThan(52.48);
		expect(bbox.east).toBeGreaterThan(13.43);
		expect(bbox.west).toBeLessThan(13.43);
		// ~1km at this latitude is roughly 0.009 degrees of latitude.
		expect(bbox.north - 52.48).toBeCloseTo(0.009, 2);
	});

	it('builds an Overpass QL query containing the bbox and required element filters', () => {
		const query = buildQuery(bboxFromCenter(52.48, 13.43, 1.0));
		expect(query).toContain('highway');
		expect(query).toContain('building');
		expect(query).toContain('leisure');
		expect(query).toContain('amenity');
		expect(query).toContain('shop');
	});

	it('converts Overpass node/way elements into plain GeoJSON features', () => {
		const geojson = toGeoJson({
			elements: [
				{ type: 'node', tags: { amenity: 'library' }, lat: 1, lon: 2 },
				{ type: 'way', tags: { highway: 'residential' }, geometry: [{ lat: 0, lon: 0 }, { lat: 1, lon: 1 }] },
				{
					type: 'way',
					tags: { building: 'yes' },
					geometry: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }, { lat: 1, lon: 1 }, { lat: 0, lon: 0 }],
				},
			],
		});
		expect(geojson.features).toHaveLength(3);
		expect(geojson.features[0].geometry.type).toBe('Point');
		expect(geojson.features[1].geometry.type).toBe('LineString');
		expect(geojson.features[2].geometry.type).toBe('Polygon');
	});

	it('falls back to the offline sample neighborhood when the network fetch fails', async () => {
		const failingFetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
		const result = await fetchNeighborhood(52.48, 13.43, 1.0, 'berlin-neukolln', failingFetch);
		expect(result.source).toBe('offline-sample');
		expect(result.geojson.features.length).toBeGreaterThan(0);
	});

	it('falls back to the offline sample when Overpass responds with a non-OK status', async () => {
		const badFetch = vi.fn(() => Promise.resolve(new Response('', { status: 503 }))) as unknown as typeof fetch;
		const result = await fetchNeighborhood(51.545, -0.0553, 1.0, 'london-hackney', badFetch);
		expect(result.source).toBe('offline-sample');
	});
});
