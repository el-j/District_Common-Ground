import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { getDeedHistory } from '../api/endpoints/irl';
import { awardForDeed, flushOutbox, getOutboxCount } from './BadgeRegistry';
import { generateHandshakeToken, verifyHandshakeToken, secondsRemaining, type HandshakeToken } from './PeerVerification';
import type { IrlDeedCategory, IrlDeed } from '@district-cg/shared-types';
import { bindEscapeClose } from '../ui/modalDismiss';

const CATEGORY_LABELS: Record<IrlDeedCategory, string> = {
	food_sharing: '🍞 Food Sharing',
	eldercare: '👵 Eldercare',
	park_greening: '🌳 Park Greening',
	community_repair: '🔧 Community Repair',
};

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Step = 'form' | 'handshake' | 'result';

/**
 * "Civic Journal" — log a real-world mutual-aid deed and earn Solidarity
 * Tokens / Civic Action Badges. Two verification paths: an honour-system
 * log (trusted, lower reward) or a local peer handshake — a 4-word code
 * shown on this device and re-entered by whoever is confirming, standing
 * in for the planning doc's QR handshake without needing camera access.
 */
export class CivicJournal {
	private readonly el: HTMLElement;
	private readonly disposeEscape: () => void;
	private step: Step = 'form';
	private category: IrlDeedCategory = 'food_sharing';
	private note = '';
	private handshake: HandshakeToken | null = null;
	private handshakeError = '';
	private tickInterval: ReturnType<typeof setInterval> | null = null;
	private resultMessage = '';
	private synced = true;
	private history: IrlDeed[] = [];
	private outboxCount = 0;

	constructor(root: HTMLElement, private readonly onClose?: () => void) {
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		this.el.setAttribute('role', 'dialog');
		this.el.setAttribute('aria-modal', 'true');
		this.el.setAttribute('aria-labelledby', 'civic-journal-title');
		root.appendChild(this.el);

		inputManager.setLocked(true);
		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();
		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});

		this.disposeEscape = bindEscapeClose(() => this.close());

		void this.loadHistory();
	}

	private async loadHistory(): Promise<void> {
		this.outboxCount = await getOutboxCount();
		try {
			this.history = await getDeedHistory();
		} catch {
			this.history = [];
		}
		this.render();
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel civic-journal-panel interactive">
				<div class="settings-header">
					<span class="settings-title" id="civic-journal-title">📓 Civic Journal — Log a Real-World Deed</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-body">
					${this.step === 'form' ? this.renderForm() : ''}
					${this.step === 'handshake' ? this.renderHandshake() : ''}
					${this.step === 'result' ? this.renderResult() : ''}
					${this.renderHistory()}
				</div>
			</div>
		`;
		this.bindEvents();
	}

	private renderForm(): string {
		const categoryButtons = (Object.keys(CATEGORY_LABELS) as IrlDeedCategory[])
			.map(
				c => `<button class="civic-journal-category${c === this.category ? ' civic-journal-category--active' : ''}"
				data-category="${c}" type="button">${CATEGORY_LABELS[c]}</button>`,
			)
			.join('');

		return `
			<p class="civic-directory-status">
				Did some real-world mutual aid today? Log it here to earn Solidarity Tokens (ST)
				and a Civic Action Badge (CAB) in your account.
			</p>
			<div class="civic-journal-categories">${categoryButtons}</div>
			<textarea class="civic-journal-note" placeholder="Optional note: what did you do?" rows="2">${escapeHtml(this.note)}</textarea>
			${this.outboxCount > 0 ? `<p class="civic-directory-status">${this.outboxCount} deed(s) saved locally, waiting to sync. <button class="civic-journal-sync-btn" type="button">Sync now</button></p>` : ''}
			<div class="civic-journal-actions">
				<button class="civic-journal-submit" data-method="honor_system" type="button">✅ Log on Honour System (25 ST)</button>
				<button class="civic-journal-submit" data-method="peer_verified" type="button">🤝 Verify With a Neighbor (50 ST)</button>
			</div>
		`;
	}

	private renderHandshake(): string {
		if (!this.handshake) return '';
		const remaining = secondsRemaining(this.handshake);
		return `
			<p class="civic-directory-status">Show this code to the neighbor confirming with you. It expires in ${remaining}s.</p>
			<p class="civic-journal-code">${this.handshake.code}</p>
			<input class="civic-journal-code-input" type="text" placeholder="Neighbor re-enters the code here" aria-label="Confirmation code" />
			${this.handshakeError ? `<p class="civic-directory-status">${escapeHtml(this.handshakeError)}</p>` : ''}
			<div class="civic-journal-actions">
				<button class="civic-journal-confirm" type="button">Confirm Handshake</button>
				<button class="civic-journal-cancel" type="button">Cancel</button>
			</div>
		`;
	}

	private renderResult(): string {
		return `
			<p class="civic-directory-status">${escapeHtml(this.resultMessage)}</p>
			${!this.synced ? '<p class="civic-directory-status">No connection right now — this deed is saved on your device and will sync automatically once you\'re signed in with connectivity.</p>' : ''}
			<div class="civic-journal-actions">
				<button class="civic-journal-log-another" type="button">Log Another Deed</button>
			</div>
		`;
	}

	private renderHistory(): string {
		if (this.history.length === 0) return '';
		const rows = this.history
			.slice(0, 5)
			.map(d => `<li>${CATEGORY_LABELS[d.category as IrlDeedCategory] ?? d.category} — +${d.stAwarded} ST / +${d.cabAwarded} CAB</li>`)
			.join('');
		return `<ul class="civic-journal-history">${rows}</ul>`;
	}

	private bindEvents(): void {
		this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());

		this.el.querySelectorAll<HTMLButtonElement>('.civic-journal-category').forEach(btn => {
			btn.addEventListener('click', () => {
				this.category = btn.dataset['category'] as IrlDeedCategory;
				this.render();
			});
		});

		const note = this.el.querySelector<HTMLTextAreaElement>('.civic-journal-note');
		note?.addEventListener('input', e => {
			this.note = (e.target as HTMLTextAreaElement).value;
		});

		this.el.querySelector<HTMLButtonElement>('.civic-journal-sync-btn')?.addEventListener('click', () => {
			void this.syncOutbox();
		});

		this.el.querySelectorAll<HTMLButtonElement>('.civic-journal-submit').forEach(btn => {
			btn.addEventListener('click', () => {
				playUIClick();
				const method = btn.dataset['method'];
				if (method === 'peer_verified') {
					this.handshake = generateHandshakeToken();
					this.handshakeError = '';
					this.step = 'handshake';
					this.startHandshakeTicker();
					this.render();
				} else {
					void this.submit('honor_system');
				}
			});
		});

		this.el.querySelector<HTMLButtonElement>('.civic-journal-confirm')?.addEventListener('click', () => {
			const input = this.el.querySelector<HTMLInputElement>('.civic-journal-code-input');
			const entered = input?.value ?? '';
			if (this.handshake && verifyHandshakeToken(this.handshake, entered)) {
				this.stopHandshakeTicker();
				void this.submit('peer_verified');
			} else {
				this.handshakeError = 'Code did not match (or expired). Ask your neighbor to try again.';
				this.render();
			}
		});

		this.el.querySelector<HTMLButtonElement>('.civic-journal-cancel')?.addEventListener('click', () => {
			this.stopHandshakeTicker();
			this.step = 'form';
			this.handshake = null;
			this.render();
		});

		this.el.querySelector<HTMLButtonElement>('.civic-journal-log-another')?.addEventListener('click', () => {
			this.step = 'form';
			this.note = '';
			this.render();
		});
	}

	private startHandshakeTicker(): void {
		this.stopHandshakeTicker();
		this.tickInterval = setInterval(() => {
			if (this.step === 'handshake') this.render();
		}, 1000);
	}

	private stopHandshakeTicker(): void {
		if (this.tickInterval !== null) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}
	}

	private async submit(method: 'honor_system' | 'peer_verified'): Promise<void> {
		const result = await awardForDeed(this.category, this.note, method);
		this.synced = result.synced;
		if (result.synced && result.wallet) {
			this.resultMessage = `Logged! You earned ${result.deed?.stAwarded ?? 0} ST and ${result.deed?.cabAwarded ?? 0} CAB. New balance: ${result.wallet.solidarityTokens} ST.`;
			playSolidarityChime();
		} else {
			this.resultMessage = 'Deed logged and saved for sync.';
		}
		this.handshake = null;
		this.step = 'result';
		await this.loadHistory();
		this.render();
	}

	private async syncOutbox(): Promise<void> {
		await flushOutbox();
		await this.loadHistory();
	}

	private close(): void {
		this.stopHandshakeTicker();
		this.el.classList.remove('settings-overlay--visible');
		inputManager.setLocked(false);
		this.disposeEscape();
		setTimeout(() => {
			this.el.remove();
			this.onClose?.();
		}, 200);
	}
}
