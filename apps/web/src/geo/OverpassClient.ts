import type { GeoJsonFeatureCollection } from './GeoJsonToTilemap';

export interface OverpassBBox {
	south: number;
	west: number;
	north: number;
	east: number;
}

const METERS_PER_DEG_LAT = 110_540;

/** Converts a center point + radius (km) into a lat/lon bounding box. */
export function bboxFromCenter(lat: number, lon: number, radiusKm: number): OverpassBBox {
	const dLat = (radiusKm * 1000) / METERS_PER_DEG_LAT;
	const metersPerDegLon = 111_320 * Math.cos((lat * Math.PI) / 180);
	const dLon = (radiusKm * 1000) / metersPerDegLon;
	return { south: lat - dLat, west: lon - dLon, north: lat + dLat, east: lon + dLon };
}

/** Builds an Overpass QL query for the element classes the PoC cares about:
 *  highways, buildings, parks/grass, and civic amenities/shops. */
export function buildQuery(bbox: OverpassBBox): string {
	const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
	return `[out:json][timeout:15];(
    way["highway"](${bboxStr});
    way["building"](${bboxStr});
    way["leisure"~"^(park|garden)$"](${bboxStr});
    way["landuse"="grass"](${bboxStr});
    node["amenity"](${bboxStr});
    node["shop"](${bboxStr});
  );out geom;`;
}

interface OverpassElement {
	type: 'node' | 'way';
	tags?: Record<string, string>;
	lat?: number;
	lon?: number;
	geometry?: { lat: number; lon: number }[];
}

interface OverpassResponse {
	elements: OverpassElement[];
}

function isClosedWay(geometry: { lat: number; lon: number }[]): boolean {
	if (geometry.length < 3) return false;
	const first = geometry[0];
	const last = geometry[geometry.length - 1];
	return first.lat === last.lat && first.lon === last.lon;
}

/** Converts Overpass's node/way element shape into plain GeoJSON, so the
 *  rasterizer and classifier never need to know Overpass exists. */
export function toGeoJson(response: OverpassResponse): GeoJsonFeatureCollection {
	const features: GeoJsonFeatureCollection['features'] = [];
	for (const el of response.elements) {
		const tags = el.tags ?? {};
		if (el.type === 'node' && el.lat !== undefined && el.lon !== undefined) {
			features.push({ type: 'Feature', properties: tags, geometry: { type: 'Point', coordinates: [el.lon, el.lat] } });
		} else if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
			const coords: [number, number][] = el.geometry.map(p => [p.lon, p.lat]);
			if (tags['building'] || isClosedWay(el.geometry)) {
				features.push({ type: 'Feature', properties: tags, geometry: { type: 'Polygon', coordinates: [coords] } });
			} else {
				features.push({ type: 'Feature', properties: tags, geometry: { type: 'LineString', coordinates: coords } });
			}
		}
	}
	return { type: 'FeatureCollection', features };
}

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

export type SampleNeighborhood = 'berlin-neukolln' | 'london-hackney';

/**
 * Hand-authored, illustrative offline demo neighborhoods (not a live scrape)
 * used as the fallback when Overpass is unreachable, per the PoC's
 * "100% offline replay" requirement. Coordinates are approximate real-world
 * anchors, not surveyed data.
 */
function sampleNeighborhood(name: SampleNeighborhood): OverpassResponse {
	const centers: Record<SampleNeighborhood, { lat: number; lon: number }> = {
		'berlin-neukolln': { lat: 52.4796, lon: 13.4359 },
		'london-hackney': { lat: 51.5450, lon: -0.0553 },
	};
	const c = centers[name];
	const d = 0.006; // ~650m offsets, small illustrative block

	return {
		elements: [
			{ type: 'way', tags: { highway: 'primary' }, geometry: [
				{ lat: c.lat - d, lon: c.lon - d }, { lat: c.lat - d, lon: c.lon + d },
			] },
			{ type: 'way', tags: { highway: 'residential' }, geometry: [
				{ lat: c.lat - d, lon: c.lon }, { lat: c.lat + d, lon: c.lon },
			] },
			{ type: 'way', tags: { highway: 'footway' }, geometry: [
				{ lat: c.lat + d * 0.5, lon: c.lon - d }, { lat: c.lat + d * 0.5, lon: c.lon + d },
			] },
			{ type: 'way', tags: { leisure: 'park' }, geometry: [
				{ lat: c.lat + d * 0.2, lon: c.lon + d * 0.2 },
				{ lat: c.lat + d * 0.6, lon: c.lon + d * 0.2 },
				{ lat: c.lat + d * 0.6, lon: c.lon + d * 0.6 },
				{ lat: c.lat + d * 0.2, lon: c.lon + d * 0.6 },
				{ lat: c.lat + d * 0.2, lon: c.lon + d * 0.2 },
			] },
			{ type: 'way', tags: { building: 'yes' }, geometry: [
				{ lat: c.lat - d * 0.3, lon: c.lon - d * 0.6 },
				{ lat: c.lat - d * 0.1, lon: c.lon - d * 0.6 },
				{ lat: c.lat - d * 0.1, lon: c.lon - d * 0.4 },
				{ lat: c.lat - d * 0.3, lon: c.lon - d * 0.4 },
				{ lat: c.lat - d * 0.3, lon: c.lon - d * 0.6 },
			] },
			{ type: 'node', tags: { amenity: 'library' }, lat: c.lat - d * 0.2, lon: c.lon - d * 0.5 },
			{ type: 'node', tags: { shop: 'bakery' }, lat: c.lat + d * 0.1, lon: c.lon - d * 0.3 },
			{ type: 'node', tags: { amenity: 'community_centre' }, lat: c.lat - d * 0.5, lon: c.lon + d * 0.4 },
		],
	};
}

export interface FetchNeighborhoodResult {
	geojson: GeoJsonFeatureCollection;
	source: 'live' | 'offline-sample';
}

/**
 * Fetches real OSM elements within radiusKm of (lat, lon). On any network
 * failure, falls back to a bundled offline sample so the PoC still works
 * without connectivity — never throws.
 */
export async function fetchNeighborhood(
	lat: number,
	lon: number,
	radiusKm: number,
	fallback: SampleNeighborhood = 'berlin-neukolln',
	fetchImpl: typeof fetch = fetch,
): Promise<FetchNeighborhoodResult> {
	try {
		const query = buildQuery(bboxFromCenter(lat, lon, radiusKm));
		const res = await fetchImpl(OVERPASS_ENDPOINT, {
			method: 'POST',
			body: `data=${encodeURIComponent(query)}`,
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		});
		if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
		const data = (await res.json()) as OverpassResponse;
		return { geojson: toGeoJson(data), source: 'live' };
	} catch {
		return { geojson: toGeoJson(sampleNeighborhood(fallback)), source: 'offline-sample' };
	}
}
