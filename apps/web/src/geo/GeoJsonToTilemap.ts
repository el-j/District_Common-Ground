/**
 * M16 Real-World Geo-Mode — rasterizes plain GeoJSON vector data (roads,
 * buildings, parks) into a fixed-size top-down tile grid. Deliberately
 * decoupled from OverpassClient.ts: this module only ever sees GeoJSON, so
 * it can be fed live OSM data or a hand-authored mock in tests.
 */

export type GeoJsonGeometry =
	| { type: 'Point'; coordinates: [number, number] }
	| { type: 'LineString'; coordinates: [number, number][] }
	| { type: 'Polygon'; coordinates: [number, number][][] };

export interface GeoJsonFeature {
	type: 'Feature';
	geometry: GeoJsonGeometry;
	properties: Record<string, string>;
}

export interface GeoJsonFeatureCollection {
	type: 'FeatureCollection';
	features: GeoJsonFeature[];
}

export enum GeoTile {
	GRASS = 0,
	ROAD = 1,
	SIDEWALK = 2,
	WALL = 3,
}

export const GEO_GRID_SIZE = 50;

export interface TilemapResult {
	tiles: GeoTile[][]; // [row][col], GEO_GRID_SIZE x GEO_GRID_SIZE, row 0 = north edge
	gridSize: number;
	centerLat: number;
	centerLon: number;
	radiusKm: number;
}

const METERS_PER_DEG_LAT = 110_540;
const METERS_PER_DEG_LON_AT_EQUATOR = 111_320;

/** Equirectangular projection, accurate enough at the 1-2km PoC radius. */
function toLocalMeters(lat: number, lon: number, centerLat: number, centerLon: number): { dx: number; dy: number } {
	const metersPerDegLon = METERS_PER_DEG_LON_AT_EQUATOR * Math.cos((centerLat * Math.PI) / 180);
	const dx = (lon - centerLon) * metersPerDegLon;
	const dy = (centerLat - lat) * METERS_PER_DEG_LAT; // north is up => smaller row index
	return { dx, dy };
}

function toTileCoords(
	lat: number,
	lon: number,
	centerLat: number,
	centerLon: number,
	radiusKm: number,
	gridSize: number,
): { col: number; row: number } {
	const { dx, dy } = toLocalMeters(lat, lon, centerLat, centerLon);
	const metersPerTile = (radiusKm * 2 * 1000) / gridSize;
	const col = Math.floor(gridSize / 2 + dx / metersPerTile);
	const row = Math.floor(gridSize / 2 + dy / metersPerTile);
	return { col, row };
}

function inBounds(v: number, gridSize: number): boolean {
	return v >= 0 && v < gridSize;
}

function paintLine(
	tiles: GeoTile[][],
	coords: [number, number][],
	tile: GeoTile,
	centerLat: number,
	centerLon: number,
	radiusKm: number,
	gridSize: number,
): void {
	for (let i = 0; i < coords.length - 1; i++) {
		const [lon1, lat1] = coords[i];
		const [lon2, lat2] = coords[i + 1];
		const a = toTileCoords(lat1, lon1, centerLat, centerLon, radiusKm, gridSize);
		const b = toTileCoords(lat2, lon2, centerLat, centerLon, radiusKm, gridSize);
		// Simple Bresenham-ish line walk — sufficient resolution for 16px tiles.
		const steps = Math.max(Math.abs(b.col - a.col), Math.abs(b.row - a.row), 1);
		for (let s = 0; s <= steps; s++) {
			const col = Math.round(a.col + ((b.col - a.col) * s) / steps);
			const row = Math.round(a.row + ((b.row - a.row) * s) / steps);
			if (inBounds(col, gridSize) && inBounds(row, gridSize)) {
				tiles[row][col] = tile;
			}
		}
	}
}

/** Rasterizes a polygon's bounding box — a deliberate v1 simplification
 *  (true point-in-polygon fill is future work; see docs/tasks/M16). */
function paintPolygonBounds(
	tiles: GeoTile[][],
	rings: [number, number][][],
	tile: GeoTile,
	centerLat: number,
	centerLon: number,
	radiusKm: number,
	gridSize: number,
): void {
	const outerRing = rings[0];
	if (!outerRing || outerRing.length === 0) return;
	let minCol = Infinity, maxCol = -Infinity, minRow = Infinity, maxRow = -Infinity;
	for (const [lon, lat] of outerRing) {
		const { col, row } = toTileCoords(lat, lon, centerLat, centerLon, radiusKm, gridSize);
		minCol = Math.min(minCol, col);
		maxCol = Math.max(maxCol, col);
		minRow = Math.min(minRow, row);
		maxRow = Math.max(maxRow, row);
	}
	for (let row = Math.max(0, minRow); row <= Math.min(gridSize - 1, maxRow); row++) {
		for (let col = Math.max(0, minCol); col <= Math.min(gridSize - 1, maxCol); col++) {
			tiles[row][col] = tile;
		}
	}
}

function roadTileFor(tags: Record<string, string>): GeoTile {
	const highway = tags['highway'];
	if (highway === 'footway' || highway === 'pedestrian' || highway === 'path') return GeoTile.SIDEWALK;
	return GeoTile.ROAD;
}

export function rasterize(
	fc: GeoJsonFeatureCollection,
	centerLat: number,
	centerLon: number,
	radiusKm: number,
	gridSize: number = GEO_GRID_SIZE,
): TilemapResult {
	const tiles: GeoTile[][] = Array.from({ length: gridSize }, () =>
		Array.from<GeoTile>({ length: gridSize }).fill(GeoTile.GRASS),
	);

	// Roads first (thin lines), then buildings on top (solid obstacles) so a
	// building footprint always wins over a road that happens to graze it.
	for (const feature of fc.features) {
		if (feature.geometry.type === 'LineString' && feature.properties['highway']) {
			paintLine(tiles, feature.geometry.coordinates, roadTileFor(feature.properties), centerLat, centerLon, radiusKm, gridSize);
		}
	}
	// Green spaces are explicit (not just left at the GRASS default) so parks
	// still read correctly if the default tile ever changes.
	for (const feature of fc.features) {
		const tags = feature.properties;
		const isGreenSpace = tags['leisure'] === 'park' || tags['leisure'] === 'garden' || tags['landuse'] === 'grass';
		if (feature.geometry.type === 'Polygon' && isGreenSpace) {
			paintPolygonBounds(tiles, feature.geometry.coordinates, GeoTile.GRASS, centerLat, centerLon, radiusKm, gridSize);
		}
	}
	for (const feature of fc.features) {
		if (feature.geometry.type === 'Polygon' && feature.properties['building']) {
			paintPolygonBounds(tiles, feature.geometry.coordinates, GeoTile.WALL, centerLat, centerLon, radiusKm, gridSize);
		}
	}

	return { tiles, gridSize, centerLat, centerLon, radiusKm };
}
