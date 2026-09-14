import type { GeoJsonFeature, GeoJsonFeatureCollection } from './GeoJsonToTilemap';

export type CommonsNodeType = 'tool_hub' | 'community_kitchen' | 'commons_garden' | 'town_hall' | 'care_center';

export interface AmenityMarker {
	nodeType: CommonsNodeType;
	label: string;
	lat: number;
	lon: number;
	sourceTag: string; // e.g. "amenity=library" — kept for player-facing "real place" flavor text
}

interface ClassifierRule {
	tagKey: string;
	tagValues: string[];
	nodeType: CommonsNodeType;
	label: string;
}

// Order matters: first match wins. Mirrors the semantic mapping table in
// docs/planning/16-REAL-WORLD-GEO-MODE-AND-UNIVERSAL-SOLIDARITY.md §2.3.
const RULES: ClassifierRule[] = [
	{ tagKey: 'amenity', tagValues: ['library'], nodeType: 'tool_hub', label: 'Community Tool & Knowledge Library' },
	{ tagKey: 'shop', tagValues: ['bakery', 'supermarket'], nodeType: 'community_kitchen', label: "Community Kitchen & Pantry" },
	{ tagKey: 'amenity', tagValues: ['community_centre', 'social_facility'], nodeType: 'town_hall', label: 'Town Hall Assembly & Rally Ground' },
	{ tagKey: 'amenity', tagValues: ['school', 'kindergarten'], nodeType: 'care_center', label: 'Community Care Center' },
	{ tagKey: 'leisure', tagValues: ['park', 'garden'], nodeType: 'commons_garden', label: 'Commons Garden & Seed Beds' },
	{ tagKey: 'landuse', tagValues: ['grass'], nodeType: 'commons_garden', label: 'Commons Garden & Seed Beds' },
];

function representativePoint(feature: GeoJsonFeature): { lat: number; lon: number } {
	const geom = feature.geometry;
	if (geom.type === 'Point') {
		const [lon, lat] = geom.coordinates;
		return { lat, lon };
	}
	const coords = geom.type === 'LineString' ? geom.coordinates : geom.coordinates[0];
	let sumLat = 0, sumLon = 0;
	for (const [lon, lat] of coords) {
		sumLat += lat;
		sumLon += lon;
	}
	return { lat: sumLat / coords.length, lon: sumLon / coords.length };
}

/** Maps OSM amenity/shop/leisure tags to interactable in-game commons nodes,
 *  each anchored at its real geographic coordinate (Test 16.2). */
export function classifyAmenities(fc: GeoJsonFeatureCollection): AmenityMarker[] {
	const markers: AmenityMarker[] = [];
	for (const feature of fc.features) {
		const tags = feature.properties;
		for (const rule of RULES) {
			const value = tags[rule.tagKey];
			if (value && rule.tagValues.includes(value)) {
				const { lat, lon } = representativePoint(feature);
				markers.push({ nodeType: rule.nodeType, label: rule.label, lat, lon, sourceTag: `${rule.tagKey}=${value}` });
				break;
			}
		}
	}
	return markers;
}
