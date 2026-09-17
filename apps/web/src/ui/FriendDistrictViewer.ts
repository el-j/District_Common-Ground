import { getFriendDistrict } from '../api/endpoints/social';
import type { DistrictSnapshot } from '@district-cg/shared-types';
import { bindEscapeClose } from './modalDismiss';

const PROGRESS_LABELS: { key: keyof DistrictSnapshot['commons']; label: string }[] = [
	{ key: 'solarGridProgress', label: 'Rooftop Solar Co-op' },
	{ key: 'kitchenProgress', label: 'Community Kitchen' },
	{ key: 'legalFundProgress', label: 'Legal Defense Fund' },
	{ key: 'toolLibraryProgress', label: 'Tool Library' },
	{ key: 'landTrustProgress', label: 'Land Trust' },
];

/**
 * Read-only overlay rendering a friend's district parcels and status.
 * Always opened on top of an already-locked modal (SocialHubModal), so it
 * does not manage InputManager's lock itself — the parent modal owns that.
 */
export class FriendDistrictViewer {
	private readonly el: HTMLElement;
	private readonly disposeEscape: () => void;
	private snapshot: DistrictSnapshot | null = null;
	private error = '';

	constructor(root: HTMLElement, private readonly friendHandle: string, private readonly friendUserId: string) {
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		root.appendChild(this.el);

		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();

		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});

		this.disposeEscape = bindEscapeClose(() => this.close());

		void this.load();
	}

	private async load(): Promise<void> {
		try {
			this.snapshot = await getFriendDistrict(this.friendUserId);
		} catch {
			this.error = `Could not load ${this.friendHandle}'s district right now.`;
		}
		this.render();
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel district-viewer-panel interactive">
				<div class="settings-header">
					<span class="settings-title">🏘️ ${this.friendHandle}'s District</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-body">
					${this.error ? `<p class="shop-status">${this.error}</p>` : this.snapshot ? this.renderSnapshot(this.snapshot) : '<p class="shop-status">Loading district...</p>'}
				</div>
			</div>
		`;
		this.el.querySelector<HTMLButtonElement>('.settings-close')
			?.addEventListener('click', () => this.close());
	}

	private renderSnapshot(s: DistrictSnapshot): string {
		return `
			<div class="district-viewer-summary">
				<span>Day ${s.day}</span>
				<span>Resilience ${Math.round(s.resilienceScore)}</span>
				${s.activeCrisis ? `<span class="district-viewer-crisis">⚠ ${s.activeCrisis}</span>` : ''}
			</div>
			<div class="district-viewer-bars">
				${PROGRESS_LABELS.map(({ key, label }) => `
					<div class="district-viewer-bar-row">
						<span class="district-viewer-bar-label">${label}</span>
						<div class="district-viewer-bar-track">
							<div class="district-viewer-bar-fill" style="width: ${Math.min(100, Math.max(0, s.commons[key]))}%"></div>
						</div>
					</div>
				`).join('')}
			</div>
		`;
	}

	private close(): void {
		this.el.classList.remove('settings-overlay--visible');
		this.disposeEscape();
		setTimeout(() => this.el.remove(), 200);
	}
}
