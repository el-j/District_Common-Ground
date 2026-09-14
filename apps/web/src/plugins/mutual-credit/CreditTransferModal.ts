import { inputManager } from '../../world/InputManager';
import { playUIClick, playSolidarityChime } from '../../core/audio/SoundSynth';
import {
	loadOrCreateKeypair, createTransaction, verifyTransactionSignature,
	exportPublicKeyBase64, MutualCreditLedger,
	type MutualCreditTransaction,
} from './CryptoLedger';
import { encodeTradeOfferText, decodeTradeOfferText, type TradeOffer } from './QrTradeScanner';

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type Step = 'form' | 'offer-code' | 'redeem' | 'result';

/**
 * Neighbor trade & balance-clearing terminal for the decentralized mutual
 * credit ledger. Every transaction is signed locally (CryptoLedger.ts) and
 * relayed as a pasteable "scan-to-pay" text code (QrTradeScanner.ts) — no
 * server, no bank, no fees.
 */
export class CreditTransferModal {
	private readonly el: HTMLElement;
	private readonly ledger = new MutualCreditLedger();
	private step: Step = 'form';
	private toPeerId = '';
	private amount = 0;
	private memo = '';
	private offerCode = '';
	private redeemInput = '';
	private resultMessage = '';
	private myPeerId = 'you';
	private publicKeyBase64 = '';

	constructor(root: HTMLElement, private readonly onClose?: () => void) {
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		this.el.setAttribute('role', 'dialog');
		this.el.setAttribute('aria-modal', 'true');
		this.el.setAttribute('aria-labelledby', 'credit-transfer-title');
		root.appendChild(this.el);

		inputManager.setLocked(true);
		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();
		void this.initIdentity();
		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});
	}

	private async initIdentity(): Promise<void> {
		const keyPair = await loadOrCreateKeypair();
		this.publicKeyBase64 = await exportPublicKeyBase64(keyPair.publicKey);
		this.render();
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel credit-transfer-panel interactive">
				<div class="settings-header">
					<span class="settings-title" id="credit-transfer-title">🤝 Mutual Credit Trade</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-body">
					${this.step === 'form' ? this.renderForm() : ''}
					${this.step === 'offer-code' ? this.renderOfferCode() : ''}
					${this.step === 'redeem' ? this.renderRedeem() : ''}
					${this.step === 'result' ? this.renderResult() : ''}
					${this.renderLedgerHistory()}
				</div>
			</div>
		`;
		this.bindEvents();
	}

	private renderForm(): string {
		return `
			<p class="civic-directory-status">
				Trade with a neighbor — a tool loan, a repair hour, a basket of vegetables — without
				fees or a bank. Enter what you're crediting them for.
			</p>
			${this.publicKeyBase64 ? `<p class="civic-directory-status">Your signing identity: ${escapeHtml(this.publicKeyBase64.slice(0, 12))}…</p>` : ''}
			<input class="credit-transfer-to" type="text" placeholder="Neighbor's name or id" value="${escapeHtml(this.toPeerId)}" />
			<input class="credit-transfer-amount" type="number" min="0" step="0.5" placeholder="Credit amount" value="${this.amount || ''}" />
			<textarea class="credit-transfer-memo" rows="2" placeholder="What was traded?">${escapeHtml(this.memo)}</textarea>
			<div class="civic-journal-actions">
				<button class="credit-transfer-create-offer" type="button">Generate Trade Code</button>
				<button class="credit-transfer-open-redeem" type="button">Redeem a Code</button>
			</div>
		`;
	}

	private renderOfferCode(): string {
		return `
			<p class="civic-directory-status">Show or send this code to your neighbor to confirm the trade:</p>
			<textarea class="credit-transfer-out" rows="3" readonly>${escapeHtml(this.offerCode)}</textarea>
			<div class="civic-journal-actions">
				<button class="credit-transfer-back" type="button">Back</button>
			</div>
		`;
	}

	private renderRedeem(): string {
		return `
			<p class="civic-directory-status">Paste the trade code your neighbor sent you:</p>
			<textarea class="credit-transfer-redeem-input" rows="3" placeholder="dcg-trade:...">${escapeHtml(this.redeemInput)}</textarea>
			<div class="civic-journal-actions">
				<button class="credit-transfer-confirm-redeem" type="button">Confirm Trade</button>
				<button class="credit-transfer-back" type="button">Back</button>
			</div>
		`;
	}

	private renderResult(): string {
		return `
			<p class="civic-directory-status">${escapeHtml(this.resultMessage)}</p>
			<div class="civic-journal-actions">
				<button class="credit-transfer-back" type="button">Done</button>
			</div>
		`;
	}

	private renderLedgerHistory(): string {
		const transactions = this.ledger.getTransactions();
		if (transactions.length === 0) return '';
		const rows = transactions.slice(-5).reverse()
			.map((tx: MutualCreditTransaction) => `<li>${escapeHtml(tx.fromPeerId)} → ${escapeHtml(tx.toPeerId)}: ${tx.amount} — ${escapeHtml(tx.memo)}</li>`)
			.join('');
		return `<ul class="civic-journal-history">${rows}</ul>`;
	}

	private bindEvents(): void {
		this.el.querySelector<HTMLButtonElement>('.settings-close')?.addEventListener('click', () => this.close());
		this.el.querySelector<HTMLButtonElement>('.credit-transfer-back')?.addEventListener('click', () => {
			this.step = 'form';
			this.render();
		});

		this.el.querySelector<HTMLInputElement>('.credit-transfer-to')?.addEventListener('input', e => {
			this.toPeerId = (e.target as HTMLInputElement).value;
		});
		this.el.querySelector<HTMLInputElement>('.credit-transfer-amount')?.addEventListener('input', e => {
			this.amount = Number.parseFloat((e.target as HTMLInputElement).value) || 0;
		});
		this.el.querySelector<HTMLTextAreaElement>('.credit-transfer-memo')?.addEventListener('input', e => {
			this.memo = (e.target as HTMLTextAreaElement).value;
		});
		this.el.querySelector<HTMLTextAreaElement>('.credit-transfer-redeem-input')?.addEventListener('input', e => {
			this.redeemInput = (e.target as HTMLTextAreaElement).value;
		});

		this.el.querySelector<HTMLButtonElement>('.credit-transfer-create-offer')?.addEventListener('click', () => {
			playUIClick();
			this.createOffer();
		});
		this.el.querySelector<HTMLButtonElement>('.credit-transfer-open-redeem')?.addEventListener('click', () => {
			this.step = 'redeem';
			this.render();
		});
		this.el.querySelector<HTMLButtonElement>('.credit-transfer-confirm-redeem')?.addEventListener('click', () => {
			void this.confirmRedeem();
		});
	}

	private createOffer(): void {
		if (!this.toPeerId.trim() || this.amount <= 0) {
			this.resultMessage = 'Enter a neighbor and a positive amount first.';
			this.step = 'result';
			this.render();
			return;
		}
		const offer: TradeOffer = {
			fromPeerId: this.myPeerId,
			toPeerId: this.toPeerId.trim(),
			amount: this.amount,
			memo: this.memo,
			offeredAt: Date.now(),
		};
		this.offerCode = encodeTradeOfferText(offer);
		this.step = 'offer-code';
		this.render();
	}

	private async confirmRedeem(): Promise<void> {
		try {
			const offer = decodeTradeOfferText(this.redeemInput);
			const keyPair = await loadOrCreateKeypair();
			const tx = await createTransaction(offer.fromPeerId, offer.toPeerId, offer.amount, offer.memo, keyPair, this.ledger.lastHash);
			const valid = await verifyTransactionSignature(tx, keyPair.publicKey);
			if (!valid) {
				throw new Error('Signature did not validate');
			}
			this.ledger.append(tx);
			this.resultMessage = `Trade recorded: ${offer.fromPeerId} → ${offer.toPeerId} for ${offer.amount}.`;
			playSolidarityChime();
		} catch (err) {
			this.resultMessage = err instanceof Error ? err.message : 'Could not confirm this trade code.';
		}
		this.step = 'result';
		this.redeemInput = '';
		this.render();
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
