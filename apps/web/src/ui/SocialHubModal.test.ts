// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FriendProfile, MyProfile, SolidarityCaravan, TradeOffer } from '@district-cg/shared-types';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));
vi.mock('../core/state/persistence', () => ({ saveToDB: vi.fn().mockResolvedValue(undefined) }));
const { FriendDistrictViewerCtor } = vi.hoisted(() => ({ FriendDistrictViewerCtor: vi.fn() }));
vi.mock('./FriendDistrictViewer', () => ({ FriendDistrictViewer: FriendDistrictViewerCtor }));

const {
  getMe, getFriends, addFriend, dispatchCaravan, getCaravanInbox, claimCaravan,
  proposeTrade, getTradeInbox, getTradeOutbox, acceptTrade, declineTrade, cancelTrade, settleTrade,
} = vi.hoisted(() => ({
  getMe: vi.fn(), getFriends: vi.fn(), addFriend: vi.fn(), dispatchCaravan: vi.fn(),
  getCaravanInbox: vi.fn(), claimCaravan: vi.fn(), proposeTrade: vi.fn(), getTradeInbox: vi.fn(),
  getTradeOutbox: vi.fn(), acceptTrade: vi.fn(), declineTrade: vi.fn(), cancelTrade: vi.fn(), settleTrade: vi.fn(),
}));
vi.mock('../api/endpoints/social', () => ({
  getMe, getFriends, addFriend, dispatchCaravan, getCaravanInbox, claimCaravan,
  proposeTrade, getTradeInbox, getTradeOutbox, acceptTrade, declineTrade, cancelTrade, settleTrade,
}));

import { SocialHubModal } from './SocialHubModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { ApiError } from '../api/client';
import { playSolidarityChime } from '../core/audio/SoundSynth';

function resetStore(overrides: Partial<typeof INITIAL_STATE> = {}) {
  useGameStore.setState({ ...INITIAL_STATE, ...overrides });
}

function flush() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve());
}

const ME: MyProfile = { handle: 'you', inviteCode: 'ABC123' };
const FRIEND: FriendProfile = { userId: 'friend-1', handle: 'river', districtName: "River's District", day: 5, resilienceScore: 40, activeCrisis: null };

function mockLoad(overrides: {
  me?: MyProfile; friends?: FriendProfile[]; inbox?: SolidarityCaravan[];
  tradeInbox?: TradeOffer[]; tradeOutbox?: TradeOffer[];
} = {}) {
  getMe.mockResolvedValueOnce(overrides.me ?? ME);
  getFriends.mockResolvedValueOnce(overrides.friends ?? [FRIEND]);
  getCaravanInbox.mockResolvedValueOnce(overrides.inbox ?? []);
  getTradeInbox.mockResolvedValueOnce(overrides.tradeInbox ?? []);
  getTradeOutbox.mockResolvedValueOnce(overrides.tradeOutbox ?? []);
}

describe('SocialHubModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    resetStore();
  });

  it('shows loading, then the Friends tab with invite code and friend list', async () => {
    mockLoad();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Loading Common Grounds/i);
    await flush();

    expect(root.querySelector('.social-invite-row')!.textContent).toContain('ABC123');
    expect(root.querySelector('.social-friend-row')!.textContent).toContain('river');
  });

  it('shows a guest note and skips loading friend data on a 401', async () => {
    getMe.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    getFriends.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    getCaravanInbox.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    getTradeInbox.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    getTradeOutbox.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    expect(root.querySelector('.shop-guest-note')).not.toBeNull();
    expect(root.querySelector('.social-invite-row')).toBeNull();
  });

  it('adding a friend by handle appends them to the list and plays the chime', async () => {
    mockLoad();
    addFriend.mockResolvedValueOnce({ userId: 'friend-2', handle: 'sam', districtName: "Sam's", day: 2, resilienceScore: 20, activeCrisis: null });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    const input = root.querySelector<HTMLInputElement>('.social-add-input')!;
    input.value = 'sam';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('.social-add-btn')!.click();
    await flush();

    expect(addFriend).toHaveBeenCalledWith('sam');
    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    expect(root.querySelectorAll('.social-friend-row')).toHaveLength(2);
  });

  it('shows a specific message when adding an already-existing friend (409)', async () => {
    mockLoad();
    addFriend.mockRejectedValueOnce(new ApiError(409, 'already friends'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    const input = root.querySelector<HTMLInputElement>('.social-add-input')!;
    input.value = 'river';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('.social-add-btn')!.click();
    await flush();

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/already friends/i);
  });

  it('opens a FriendDistrictViewer when visiting a friend', async () => {
    mockLoad();
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-visit="friend-1"]')!.click();

    expect(FriendDistrictViewerCtor).toHaveBeenCalledWith(root, 'river', 'friend-1');
  });

  it('dispatching a caravan spends the local resource and shows a confirmation', async () => {
    mockLoad();
    resetStore({ player: { ...INITIAL_STATE.player, energy: 50 } });
    dispatchCaravan.mockResolvedValueOnce({ id: 'car-1', senderHandle: 'you', resourceType: 'energy', amount: 10, note: '', claimed: false });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="caravans"]')!.click();
    const targetSelect = root.querySelector<HTMLSelectElement>('.social-dispatch-target')!;
    targetSelect.value = 'river';
    targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('.social-dispatch-btn')!.click();
    await flush();

    expect(dispatchCaravan).toHaveBeenCalledWith('river', 'energy', 10, '');
    expect(useGameStore.getState().player.energy).toBe(40);
    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Caravan dispatched/i);
  });

  it('refuses to dispatch more of a resource than the player has', async () => {
    mockLoad();
    resetStore({ player: { ...INITIAL_STATE.player, energy: 5 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="caravans"]')!.click();
    const targetSelect = root.querySelector<HTMLSelectElement>('.social-dispatch-target')!;
    targetSelect.value = 'river';
    targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('.social-dispatch-btn')!.click(); // default amount 10 > 5 available

    expect(dispatchCaravan).not.toHaveBeenCalled();
    expect(root.querySelector('.shop-status')!.textContent).toMatch(/only have 5 energy/i);
  });

  it('claiming a caravan grants the resource and removes it from the inbox', async () => {
    mockLoad({ inbox: [{ id: 'car-2', senderHandle: 'river', resourceType: 'cash', amount: 20, note: '', claimed: false }] });
    resetStore({ player: { ...INITIAL_STATE.player, cash: 0 } });
    claimCaravan.mockResolvedValueOnce({ resourceType: 'cash', amount: 20 });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="caravans"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-claim="car-2"]')!.click();
    await flush();

    expect(useGameStore.getState().player.cash).toBe(20);
    expect(root.querySelector('[data-claim="car-2"]')).toBeNull();
  });

  it('proposing a trade spends the offered resource and lists it as pending-sent', async () => {
    mockLoad();
    resetStore({ player: { ...INITIAL_STATE.player, cash: 100 } });
    proposeTrade.mockResolvedValueOnce({
      id: 'trade-1', proposerHandle: 'you', recipientHandle: 'river',
      offerResourceType: 'cash', offerAmount: 10, requestResourceType: 'energy', requestAmount: 5,
      note: '', status: 'pending',
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="trade"]')!.click();
    const targetSelect = root.querySelector<HTMLSelectElement>('.social-trade-target')!;
    targetSelect.value = 'river';
    targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const offerAmount = root.querySelector<HTMLInputElement>('.social-trade-offer-amount')!;
    offerAmount.value = '10';
    offerAmount.dispatchEvent(new Event('input', { bubbles: true }));
    const offerResource = root.querySelector<HTMLSelectElement>('.social-trade-offer-resource')!;
    offerResource.value = 'cash';
    offerResource.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('.social-trade-propose-btn')!.click();
    await flush();

    expect(proposeTrade).toHaveBeenCalledWith('river', 'cash', 10, 'energy', 10, '');
    expect(useGameStore.getState().player.cash).toBe(90);
    expect(root.querySelector('.social-trade-cancel-btn')).not.toBeNull();
  });

  it('accepting an inbox trade grants the offered resource and spends the requested one', async () => {
    mockLoad({
      tradeInbox: [{
        id: 'trade-2', proposerHandle: 'river', recipientHandle: 'you',
        offerResourceType: 'cash', offerAmount: 15, requestResourceType: 'energy', requestAmount: 5,
        note: '', status: 'pending',
      }],
    });
    resetStore({ player: { ...INITIAL_STATE.player, cash: 0, energy: 20 } });
    acceptTrade.mockResolvedValueOnce({});
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="trade"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-accept="trade-2"]')!.click();
    await flush();

    expect(acceptTrade).toHaveBeenCalledWith('trade-2');
    const { player } = useGameStore.getState();
    expect(player.cash).toBe(15);
    expect(player.energy).toBe(15);
    expect(root.querySelector('[data-accept="trade-2"]')).toBeNull();
  });

  it('declining an inbox trade removes it without granting anything', async () => {
    mockLoad({
      tradeInbox: [{
        id: 'trade-3', proposerHandle: 'river', recipientHandle: 'you',
        offerResourceType: 'cash', offerAmount: 15, requestResourceType: 'energy', requestAmount: 5,
        note: '', status: 'pending',
      }],
    });
    declineTrade.mockResolvedValueOnce({});
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="trade"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-decline="trade-3"]')!.click();
    await flush();

    expect(declineTrade).toHaveBeenCalledWith('trade-3');
    expect(useGameStore.getState().player.cash).toBe(INITIAL_STATE.player.cash);
    expect(root.querySelector('[data-decline="trade-3"]')).toBeNull();
  });

  it('cancelling an outbox trade refunds the offered resource', async () => {
    mockLoad({
      tradeOutbox: [{
        id: 'trade-4', proposerHandle: 'you', recipientHandle: 'river',
        offerResourceType: 'cash', offerAmount: 12, requestResourceType: 'energy', requestAmount: 5,
        note: '', status: 'pending',
      }],
    });
    resetStore({ player: { ...INITIAL_STATE.player, cash: 0 } });
    cancelTrade.mockResolvedValueOnce({ resourceType: 'cash', amount: 12 });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="trade"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-cancel="trade-4"]')!.click();
    await flush();

    expect(cancelTrade).toHaveBeenCalledWith('trade-4');
    expect(useGameStore.getState().player.cash).toBe(12);
    expect(root.querySelector('[data-cancel="trade-4"]')).toBeNull();
  });

  it('auto-settles a resolved outbox offer on load and shows the result', async () => {
    getMe.mockResolvedValueOnce(ME);
    getFriends.mockResolvedValueOnce([FRIEND]);
    getCaravanInbox.mockResolvedValueOnce([]);
    getTradeInbox.mockResolvedValueOnce([]);
    getTradeOutbox.mockResolvedValueOnce([{
      id: 'trade-5', proposerHandle: 'you', recipientHandle: 'river',
      offerResourceType: 'cash', offerAmount: 10, requestResourceType: 'energy', requestAmount: 5,
      note: '', status: 'accepted',
    }]);
    settleTrade.mockResolvedValueOnce({ resourceType: 'energy', amount: 5, status: 'accepted' });
    resetStore({ player: { ...INITIAL_STATE.player, energy: 10 } });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new SocialHubModal(root);
    await flush();
    await flush();

    expect(settleTrade).toHaveBeenCalledWith('trade-5');
    expect(useGameStore.getState().player.energy).toBe(15);
    expect(root.querySelector('.shop-status')!.textContent).toMatch(/accepted your trade/i);
  });
});
