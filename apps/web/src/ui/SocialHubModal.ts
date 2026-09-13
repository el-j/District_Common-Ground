import {
	getMe,
	getFriends,
	addFriend,
	dispatchCaravan,
	getCaravanInbox,
	claimCaravan,
} from '../api/endpoints/social';
import { ApiError } from '../api/client';
import type { FriendProfile, SolidarityCaravan, CaravanResourceType, MyProfile } from '@district-cg/shared-types';
import { inputManager } from '../world/InputManager';
import { playUIClick, playSolidarityChime } from '../core/audio/SoundSynth';
import { useGameStore } from '../core/state/useGameStore';
import { gainCash, spendCash, regenEnergy, spendEnergy } from '../core/state/actions';
import { saveToDB } from '../core/state/persistence';
import { FriendDistrictViewer } from './FriendDistrictViewer';

const TAB_LABELS = { friends: 'Friends', caravans: 'Caravans' } as const;
type Tab = keyof typeof TAB_LABELS;

const RESOURCE_LABELS: Record<CaravanResourceType, string> = {
	energy: '⚡ Energy',
	food: '🍞 Food',
	cash: '💵 Cash',
};

export class SocialHubModal {
	private readonly el: HTMLElement;
	private readonly root: HTMLElement;
	private me: MyProfile | null = null;
	private friends: FriendProfile[] = [];
	private inbox: SolidarityCaravan[] = [];
	private activeTab: Tab = 'friends';
	private signedIn = true;
	private statusMessage = '';
	private loading = true;
	private addFriendInput = '';
	private dispatchTarget = '';
	private dispatchAmount = 10;
	private dispatchResource: CaravanResourceType = 'energy';
	private dispatchNote = '';

	constructor(root: HTMLElement, private readonly onClose?: () => void) {
		this.root = root;
		this.el = document.createElement('div');
		this.el.className = 'settings-overlay';
		root.appendChild(this.el);

		inputManager.setLocked(true);
		requestAnimationFrame(() => this.el.classList.add('settings-overlay--visible'));

		this.render();

		this.el.addEventListener('click', e => {
			if (e.target === this.el) this.close();
		});

		void this.load();
	}

	private async load(): Promise<void> {
		try {
			const [me, friends, inbox] = await Promise.all([getMe(), getFriends(), getCaravanInbox()]);
			this.me = me;
			this.friends = friends;
			this.inbox = inbox;
			this.signedIn = true;
		} catch (err) {
			this.signedIn = !(err instanceof ApiError && err.status === 401);
			if (this.signedIn) this.statusMessage = 'Could not reach the Common Grounds network. Try again later.';
		}
		this.loading = false;
		this.render();
	}

	private render(): void {
		this.el.innerHTML = `
			<div class="settings-panel social-hub-panel interactive">
				<div class="settings-header">
					<span class="settings-title">🤝 Common Grounds</span>
					<button class="settings-close" type="button" aria-label="Close">×</button>
				</div>
				<div class="settings-tabs">
					${(Object.keys(TAB_LABELS) as Tab[]).map(tab => `
						<button class="settings-tab ${tab === this.activeTab ? 'settings-tab--active' : ''}" data-tab="${tab}" type="button">
							${TAB_LABELS[tab]}
						</button>
					`).join('')}
				</div>
				<div class="settings-body">
					${!this.signedIn ? '<p class="shop-guest-note">Sign in to connect with neighbors.</p>' : ''}
					${this.statusMessage ? `<p class="shop-status">${this.statusMessage}</p>` : ''}
					${this.loading ? '<p class="shop-status">Loading Common Grounds...</p>' : this.signedIn ? this.renderTab() : ''}
				</div>
			</div>
		`;
		this.bindEvents();
	}

	private renderTab(): string {
		return this.activeTab === 'friends' ? this.renderFriendsTab() : this.renderCaravansTab();
	}

	private renderFriendsTab(): string {
		return `
			${this.me ? `
				<div class="social-invite-row">
					<span>Your invite code: <strong>${this.me.inviteCode}</strong></span>
					<button class="social-copy-btn interactive" type="button">Copy</button>
				</div>
			` : ''}
			<div class="social-add-row">
				<input class="social-add-input" type="text" placeholder="Handle or invite code" value="${this.addFriendInput}" />
				<button class="social-add-btn interactive" type="button">Add Friend</button>
			</div>
			<div class="social-friend-list">
				${this.friends.length === 0
					? '<p class="shop-status">No friends yet — add one by handle or invite code above.</p>'
					: this.friends.map(f => this.renderFriendRow(f)).join('')}
			</div>
		`;
	}

	private renderFriendRow(f: FriendProfile): string {
		return `
			<div class="social-friend-row">
				<div class="social-friend-info">
					<span class="social-friend-handle">${f.handle}</span>
					<span class="social-friend-meta">Day ${f.day} · Resilience ${Math.round(f.resilienceScore)}</span>
					${f.activeCrisis ? `<span class="district-viewer-crisis">⚠ facing a crisis</span>` : ''}
				</div>
				<button class="social-visit-btn interactive" data-visit="${f.userId}" data-handle="${f.handle}" type="button">Visit</button>
			</div>
		`;
	}

	private renderCaravansTab(): string {
		return `
			<div class="social-dispatch-form">
				<select class="social-dispatch-target">
					<option value="">Send to...</option>
					${this.friends.map(f => `<option value="${f.handle}" ${f.handle === this.dispatchTarget ? 'selected' : ''}>${f.handle}</option>`).join('')}
				</select>
				<select class="social-dispatch-resource">
					${(Object.keys(RESOURCE_LABELS) as CaravanResourceType[]).map(r => `<option value="${r}" ${r === this.dispatchResource ? 'selected' : ''}>${RESOURCE_LABELS[r]}</option>`).join('')}
				</select>
				<input class="social-dispatch-amount" type="number" min="1" value="${this.dispatchAmount}" />
				<input class="social-dispatch-note" type="text" placeholder="Note (optional)" value="${this.dispatchNote}" />
				<button class="social-dispatch-btn interactive" type="button" ${this.friends.length === 0 ? 'disabled' : ''}>Dispatch Caravan</button>
			</div>
			<div class="social-inbox-list">
				${this.inbox.length === 0
					? '<p class="shop-status">No caravans waiting.</p>'
					: this.inbox.map(c => `
						<div class="social-inbox-row">
							<span>${RESOURCE_LABELS[c.resourceType]} ×${c.amount} from ${c.senderHandle}${c.note ? ` — "${c.note}"` : ''}</span>
							<button class="social-claim-btn interactive" data-claim="${c.id}" type="button">Claim</button>
						</div>
					`).join('')}
			</div>
		`;
	}

	private bindEvents(): void {
		this.el.querySelector<HTMLButtonElement>('.settings-close')
			?.addEventListener('click', () => this.close());

		this.el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(btn => {
			btn.addEventListener('click', () => {
				playUIClick();
				this.activeTab = btn.dataset['tab'] as Tab;
				this.statusMessage = '';
				this.render();
			});
		});

		this.el.querySelector<HTMLInputElement>('.social-add-input')?.addEventListener('input', e => {
			this.addFriendInput = (e.target as HTMLInputElement).value;
		});
		this.el.querySelector<HTMLButtonElement>('.social-add-btn')?.addEventListener('click', () => void this.handleAddFriend());

		this.el.querySelector<HTMLButtonElement>('.social-copy-btn')?.addEventListener('click', () => void this.copyInviteCode());

		this.el.querySelectorAll<HTMLButtonElement>('[data-visit]').forEach(btn => {
			btn.addEventListener('click', () => {
				const userId = btn.dataset['visit'];
				const handle = btn.dataset['handle'] ?? '';
				if (userId) new FriendDistrictViewer(this.root, handle, userId);
			});
		});

		this.el.querySelector<HTMLSelectElement>('.social-dispatch-target')?.addEventListener('change', e => {
			this.dispatchTarget = (e.target as HTMLSelectElement).value;
		});
		this.el.querySelector<HTMLSelectElement>('.social-dispatch-resource')?.addEventListener('change', e => {
			this.dispatchResource = (e.target as HTMLSelectElement).value as CaravanResourceType;
		});
		this.el.querySelector<HTMLInputElement>('.social-dispatch-amount')?.addEventListener('input', e => {
			this.dispatchAmount = Math.max(1, Number((e.target as HTMLInputElement).value) || 1);
		});
		this.el.querySelector<HTMLInputElement>('.social-dispatch-note')?.addEventListener('input', e => {
			this.dispatchNote = (e.target as HTMLInputElement).value;
		});
		this.el.querySelector<HTMLButtonElement>('.social-dispatch-btn')?.addEventListener('click', () => void this.handleDispatch());

		this.el.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach(btn => {
			btn.addEventListener('click', () => {
				const caravanId = btn.dataset['claim'];
				if (caravanId) void this.handleClaim(caravanId);
			});
		});
	}

	private async copyInviteCode(): Promise<void> {
		if (!this.me) return;
		try {
			await navigator.clipboard.writeText(this.me.inviteCode);
			this.statusMessage = 'Invite code copied.';
		} catch {
			this.statusMessage = `Your invite code: ${this.me.inviteCode}`;
		}
		this.render();
	}

	private async handleAddFriend(): Promise<void> {
		const identifier = this.addFriendInput.trim();
		if (!identifier) return;
		this.statusMessage = '';
		try {
			const friend = await addFriend(identifier);
			this.friends.push(friend);
			this.addFriendInput = '';
			playSolidarityChime();
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				this.statusMessage = 'No neighbor found with that handle or invite code.';
			} else if (err instanceof ApiError && err.status === 409) {
				this.statusMessage = 'You are already friends with that neighbor.';
			} else if (err instanceof ApiError && err.status === 400) {
				this.statusMessage = "You can't add yourself as a friend.";
			} else {
				this.statusMessage = 'Could not add friend. Try again later.';
			}
		}
		this.render();
	}

	private async handleDispatch(): Promise<void> {
		if (!this.dispatchTarget) {
			this.statusMessage = 'Pick a friend to send the caravan to.';
			this.render();
			return;
		}
		const available = this.dispatchResource === 'cash'
			? useGameStore.getState().player.cash
			: useGameStore.getState().player.energy;
		if (this.dispatchAmount > available) {
			this.statusMessage = `You only have ${available} ${this.dispatchResource === 'cash' ? 'cash' : 'energy'} to send.`;
			this.render();
			return;
		}
		this.statusMessage = '';
		try {
			await dispatchCaravan(this.dispatchTarget, this.dispatchResource, this.dispatchAmount, this.dispatchNote);
			this.spendLocalResource(this.dispatchResource, this.dispatchAmount);
			this.dispatchNote = '';
			this.statusMessage = 'Caravan dispatched.';
			playSolidarityChime();
		} catch (err) {
			this.statusMessage = err instanceof ApiError ? 'Could not dispatch that caravan.' : 'Dispatch failed. Try again later.';
		}
		this.render();
	}

	private async handleClaim(caravanId: string): Promise<void> {
		this.statusMessage = '';
		try {
			const result = await claimCaravan(caravanId);
			this.grantLocalResource(result.resourceType, result.amount);
			this.inbox = this.inbox.filter(c => c.id !== caravanId);
			playSolidarityChime();
		} catch (err) {
			this.statusMessage = err instanceof ApiError && err.status === 409
				? 'That caravan was already claimed.'
				: 'Could not claim that caravan.';
		}
		this.render();
	}

	// Applies the resource delta through the same actions the rest of the
	// game uses (gainCash/regenEnergy), then persists — mirroring the
	// existing reward-settlement pattern so caravan claims don't invent a
	// second write path into game state.
	private grantLocalResource(resourceType: CaravanResourceType, amount: number): void {
		if (resourceType === 'cash') gainCash(amount);
		else regenEnergy(amount); // 'energy' and 'food' both restore player energy today — no separate food stat exists in GameState.
		void saveToDB(useGameStore.getState());
	}

	private spendLocalResource(resourceType: CaravanResourceType, amount: number): void {
		if (resourceType === 'cash') spendCash(amount);
		else spendEnergy(amount);
		void saveToDB(useGameStore.getState());
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
