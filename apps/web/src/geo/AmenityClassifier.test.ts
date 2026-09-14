import { describe, it, expect } from 'vitest';
import { classifyAmenities } from './AmenityClassifier';
import type { GeoJsonFeatureCollection } from './GeoJsonToTilemap';

describe('AmenityClassifier (Test 16.2)', () => {
	it('spawns a Tool Library node at the real coordinate of an amenity=library tag', () => {
		const fc: GeoJsonFeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', properties: { amenity: 'library' }, geometry: { type: 'Point', coordinates: [13.4321, 52.4812] } },
			],
		};
		const markers = classifyAmenities(fc);
		expect(markers).toHaveLength(1);
		expect(markers[0]).toMatchObject({
			nodeType: 'tool_hub',
			lat: 52.4812,
			lon: 13.4321,
			sourceTag: 'amenity=library',
		});
	});

	it('maps bakeries/supermarkets to Community Kitchen and parks to Commons Garden', () => {
		const fc: GeoJsonFeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', properties: { shop: 'bakery' }, geometry: { type: 'Point', coordinates: [0, 0] } },
				{
					type: 'Feature',
					properties: { leisure: 'park' },
					geometry: { type: 'Polygon', coordinates: [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]] },
				},
			],
		};
		const markers = classifyAmenities(fc);
		expect(markers.map(m => m.nodeType)).toEqual(['community_kitchen', 'commons_garden']);
	});

	it('ignores features with no recognized civic tag', () => {
		const fc: GeoJsonFeatureCollection = {
			type: 'FeatureCollection',
			features: [
				{ type: 'Feature', properties: { highway: 'primary' }, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } },
			],
		};
		expect(classifyAmenities(fc)).toEqual([]);
	});
});
