import { inputManager } from '../world/InputManager';
import { playUIClick } from '../core/audio/SoundSynth';
import { fetchNeighborhood, type SampleNeighborhood } from '../geo/OverpassClient';
import { rasterize, GeoTile } from '../geo/GeoJsonToTilemap';
import { classifyAmenities, type AmenityMarker } from '../geo/AmenityClassifier';
import { neighborhoodCacheKey, cacheNeighborhood, loadCachedNeighborhood } from '../geo/GeoCache';

const NEIGHBORHOODS: { id: SampleNeighborhood; label: string; lat: number; lon: number }[] = [
	{ id: 'berlin-neukolln', label: 'Berlin-Neukölln', lat: 52.4796, lon: 13.4359 },
	{ id: 'london-hackney', label: 'London-Hackney', lat: 51.5450, lon: -0.0553 },
];

const RADIUS_KM = 1.0;
const TILE_PX = 6;

const TILE_COLORS: Record<GeoTile, string> = {
	[GeoTile.GRASS]: '#2c4a2e',
	[GeoTile.ROAD]: '#4a4a52',
	[GeoTile.SIDEWALK]: '#7a7a6a',
	[GeoTile.WALL]: '#8a6b45',
};

/**
 * PoC preview of the Real-World Geo-Mode ingestion pipeline: fetches (or
 * falls back to an offline sample of) OpenStreetMap data around a chosen
 * neighborhood, rasterizes it, classifies amenities, and renders the result
 * as a canvas grid. This is a data-pipeline preview, not the full playable
 * mode — see docs/tasks/M16-real-world-geo-mode.md for the scoping note.
 */
export class GeoPreviewModal {
	private readonly el: HTMLElement;
	private loading = false;
	private source: 'live' | 'offline-sample' | null = null;
	private amenities: AmenityMarker[] = [];
	private tiles: GeoTile[][] | null = null;
	private gridSize = 0;

	constructor(root: HTMLElement, private readonly onClose?: () => void) {
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		this.el.setAttribute('role', 'dialog');
		this.el.setAttribute('aria-modal', 'true');
		this.el.setAttribute('aria-labelledby', 'geo-preview-title');
		root.appendChild(this.el);

		inputManager.setLocked(true);
		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();
		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel geo-preview-panel interactive">
				<div class="settings-header">
					<span class="settings-title" id="geo-preview-title">🗺️ Real-World Geo-Mode — Neighborhood Preview (PoC)</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-body">
					<p class="civic-directory-status">
						Generate a playable-preview tilemap from real OpenStreetMap data around a neighborhood.
						Roads, buildings, and green space become tiles; libraries, bakeries, and parks become
						interactable commons nodes at their real coordinates.
					</p>
					<div class="civic-journal-categories">
						${NEIGHBORHOODS.map(n => `<button class="civic-journal-category geo-preview-pick" data-id="${n.id}" type="button">${n.label}</button>`).join('')}
					</div>
					${this.loading ? '<p class="civic-directory-status">Generating neighborhood…</p>' : ''}
					${this.source ? `<p class="civic-directory-status">Source: ${this.source === 'live' ? 'live OpenStreetMap (Overpass API)' : 'offline sample (no connection, or Overpass unreachable)'}</p>` : ''}
					<canvas class="geo-preview-canvas" width="300" height="300"></canvas>
					${this.amenities.length > 0 ? `
						<ul class="civic-journal-history">
							${this.amenities.map(a => `<li>📍 ${a.label} <span class="geo-preview-tag">(${a.sourceTag})</span></li>`).join('')}
						</ul>
					` : ''}
				</div>
			</div>
		`;
		this.bindEvents();
		this.drawCanvas();
	}

	private bindEvents(): void {
		this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());
		this.el.querySelectorAll<HTMLButtonElement>('.geo-preview-pick').forEach(btn => {
			btn.addEventListener('click', () => {
				playUIClick();
				void this.generate(btn.dataset['id'] as SampleNeighborhood);
			});
		});
	}

	private async generate(id: SampleNeighborhood): Promise<void> {
		const spot = NEIGHBORHOODS.find(n => n.id === id);
		if (!spot) return;

		this.loading = true;
		this.render();

		const cacheKey = neighborhoodCacheKey(spot.lat, spot.lon, RADIUS_KM);
		const cached = await loadCachedNeighborhood(cacheKey);
		if (cached) {
			this.tiles = cached.tilemap.tiles;
			this.gridSize = cached.tilemap.gridSize;
			this.amenities = cached.amenities;
			this.source = cached.source;
			this.loading = false;
			this.render();
			return;
		}

		const { geojson, source } = await fetchNeighborhood(spot.lat, spot.lon, RADIUS_KM, id);
		const tilemap = rasterize(geojson, spot.lat, spot.lon, RADIUS_KM);
		const amenities = classifyAmenities(geojson);

		this.tiles = tilemap.tiles;
		this.gridSize = tilemap.gridSize;
		this.amenities = amenities;
		this.source = source;
		this.loading = false;
		this.render();

		await cacheNeighborhood(cacheKey, { tilemap, amenities, source });
	}

	private drawCanvas(): void {
		const canvas = this.el.querySelector<HTMLCanvasElement>('.geo-preview-canvas');
		if (!canvas || !this.tiles) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		for (let row = 0; row < this.gridSize; row++) {
			for (let col = 0; col < this.gridSize; col++) {
				ctx.fillStyle = TILE_COLORS[this.tiles[row][col]];
				ctx.fillRect(col * TILE_PX, row * TILE_PX, TILE_PX, TILE_PX);
			}
		}
	}

	private close(): void {
		this.el.classList.remove('settings-overlay--visible');
		inputManager.setLocked(false);
		setTimeout(() => {
			this.el.remove();
			this.onClose?.();
		}, 200);
	}
}
