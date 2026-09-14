import { describe, it, expect } from 'vitest';
import { rasterize, GeoTile, type GeoJsonFeatureCollection } from './GeoJsonToTilemap';

/** Mock GeoJSON for a small 4-block neighborhood: two crossing streets,
 *  a park, and a building — the fixture for M16 Test 16.1. */
const CENTER_LAT = 52.48;
const CENTER_LON = 13.43;
const RADIUS_KM = 0.5;

function fourBlockMock(): GeoJsonFeatureCollection {
	return {
		type: 'FeatureCollection',
		features: [
			{
				type: 'Feature',
				properties: { highway: 'primary' },
				geometry: { type: 'LineString', coordinates: [[CENTER_LON - 0.005, CENTER_LAT], [CENTER_LON + 0.005, CENTER_LAT]] },
			},
			{
				type: 'Feature',
				properties: { highway: 'residential' },
				geometry: { type: 'LineString', coordinates: [[CENTER_LON, CENTER_LAT - 0.005], [CENTER_LON, CENTER_LAT + 0.005]] },
			},
			{
				type: 'Feature',
				properties: { leisure: 'park' },
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[CENTER_LON + 0.001, CENTER_LAT + 0.001],
						[CENTER_LON + 0.003, CENTER_LAT + 0.001],
						[CENTER_LON + 0.003, CENTER_LAT + 0.003],
						[CENTER_LON + 0.001, CENTER_LAT + 0.003],
						[CENTER_LON + 0.001, CENTER_LAT + 0.001],
					]],
				},
			},
			{
				type: 'Feature',
				properties: { building: 'yes' },
				geometry: {
					type: 'Polygon',
					coordinates: [[
						[CENTER_LON - 0.003, CENTER_LAT - 0.003],
						[CENTER_LON - 0.001, CENTER_LAT - 0.003],
						[CENTER_LON - 0.001, CENTER_LAT - 0.001],
						[CENTER_LON - 0.003, CENTER_LAT - 0.001],
						[CENTER_LON - 0.003, CENTER_LAT - 0.003],
					]],
				},
			},
		],
	};
}

describe('GeoJsonToTilemap (Test 16.1)', () => {
	it('rasterizes a 4-block mock into walls, roads, and walkable tiles', () => {
		const fc = fourBlockMock();
		const result = rasterize(fc, CENTER_LAT, CENTER_LON, RADIUS_KM);

		expect(result.gridSize).toBe(50);
		expect(result.tiles).toHaveLength(50);
		expect(result.tiles[0]).toHaveLength(50);

		const flat = result.tiles.flat();
		expect(flat).toContain(GeoTile.ROAD);
		expect(flat).toContain(GeoTile.WALL);
		expect(flat).toContain(GeoTile.GRASS); // walkable default tile

		// The building polygon must produce at least one solid WALL tile —
		// confirms the vector-to-raster path actually ran, not just defaults.
		const wallCount = flat.filter(t => t === GeoTile.WALL).length;
		expect(wallCount).toBeGreaterThan(0);
	});

	it('marks pedestrian/footway highways as sidewalk, not vehicle road', () => {
		const fc: GeoJsonFeatureCollection = {
			type: 'FeatureCollection',
			features: [{
				type: 'Feature',
				properties: { highway: 'footway' },
				geometry: { type: 'LineString', coordinates: [[CENTER_LON - 0.004, CENTER_LAT], [CENTER_LON + 0.004, CENTER_LAT]] },
			}],
		};
		const result = rasterize(fc, CENTER_LAT, CENTER_LON, RADIUS_KM);
		expect(result.tiles.flat()).toContain(GeoTile.SIDEWALK);
	});

	it('building footprints take precedence over an overlapping road', () => {
		const fc: GeoJsonFeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{
					type: 'Feature',
					properties: { highway: 'primary' },
					geometry: { type: 'LineString', coordinates: [[CENTER_LON - 0.005, CENTER_LAT], [CENTER_LON + 0.005, CENTER_LAT]] },
				},
				{
					type: 'Feature',
					properties: { building: 'yes' },
					geometry: {
						type: 'Polygon',
						coordinates: [[
							[CENTER_LON - 0.001, CENTER_LAT - 0.001],
							[CENTER_LON + 0.001, CENTER_LAT - 0.001],
							[CENTER_LON + 0.001, CENTER_LAT + 0.001],
							[CENTER_LON - 0.001, CENTER_LAT + 0.001],
							[CENTER_LON - 0.001, CENTER_LAT - 0.001],
						]],
					},
				},
			],
		};
		const result = rasterize(fc, CENTER_LAT, CENTER_LON, RADIUS_KM);
		// Center tile sits under both the road line and the building polygon.
		const center = Math.floor(result.gridSize / 2);
		expect(result.tiles[center][center]).toBe(GeoTile.WALL);
	});
});
