// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ShopItem } from '@district-cg/shared-types';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

const { getCatalog, getWallet, getInventory, purchaseItem } = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getWallet: vi.fn(),
  getInventory: vi.fn(),
  purchaseItem: vi.fn(),
}));
vi.mock('../api/endpoints/shop', () => ({ getCatalog, getWallet, getInventory, purchaseItem }));

import { ShopModal } from './ShopModal';
import { ApiError } from '../api/client';
import { playSolidarityChime } from '../core/audio/SoundSynth';

const CATALOG: ShopItem[] = [
  { id: 'facade-1', title: 'Brick Facade', description: 'A brick front.', category: 'facade', priceST: 10, priceCAB: 0 },
  { id: 'cosmetic-1', title: 'Neon Sign', description: 'Glows at night.', category: 'cosmetic', priceST: 25, priceCAB: 0 },
];

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

describe('ShopModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('shows a loading state, then the full catalog once wallet/inventory resolve', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockResolvedValueOnce({ userId: 'u1', solidarityTokens: 50, civicBadges: 0 });
    getInventory.mockResolvedValueOnce({ userId: 'u1', ownedItemIds: [] });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/Loading/i);
    await flush();

    expect(root.querySelectorAll('.shop-card')).toHaveLength(2);
    expect(root.querySelector('.shop-wallet-chip')!.textContent).toContain('50 ST');
  });

  it('filters items by tab', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockResolvedValueOnce({ userId: 'u1', solidarityTokens: 50, civicBadges: 0 });
    getInventory.mockResolvedValueOnce({ userId: 'u1', ownedItemIds: [] });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-tab="cosmetic"]')!.click();

    const cards = root.querySelectorAll('.shop-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.textContent).toContain('Neon Sign');
  });

  it('shows a guest note and disables buying when the wallet fetch 401s', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    getInventory.mockRejectedValueOnce(new ApiError(401, 'unauthorized'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);
    await flush();

    expect(root.querySelector('.shop-guest-note')).not.toBeNull();
    expect(root.querySelector<HTMLButtonElement>('[data-buy="facade-1"]')!.disabled).toBe(true);
  });

  it('buy -> confirm -> purchase flow updates the wallet/owned set and plays the chime', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockResolvedValueOnce({ userId: 'u1', solidarityTokens: 50, civicBadges: 0 });
    getInventory.mockResolvedValueOnce({ userId: 'u1', ownedItemIds: [] });
    purchaseItem.mockResolvedValueOnce({
      wallet: { userId: 'u1', solidarityTokens: 40, civicBadges: 0 },
      inventory: { userId: 'u1', ownedItemIds: ['facade-1'] },
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-buy="facade-1"]')!.click();
    expect(root.querySelector('.shop-confirm-yes')).not.toBeNull();

    root.querySelector<HTMLButtonElement>('.shop-confirm-yes')!.click();
    await flush();

    expect(purchaseItem).toHaveBeenCalledWith('facade-1');
    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.shop-wallet-chip')!.textContent).toContain('40 ST');
    expect(root.querySelector('[data-buy="facade-1"]')).toBeNull();
    expect(root.querySelector('.shop-card')!.textContent).toContain('Owned');
  });

  it('cancelling the confirm step returns to the buy button without purchasing', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockResolvedValueOnce({ userId: 'u1', solidarityTokens: 50, civicBadges: 0 });
    getInventory.mockResolvedValueOnce({ userId: 'u1', ownedItemIds: [] });
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-buy="facade-1"]')!.click();
    root.querySelector<HTMLButtonElement>('.shop-confirm-cancel')!.click();

    expect(purchaseItem).not.toHaveBeenCalled();
    expect(root.querySelector('[data-buy="facade-1"]')).not.toBeNull();
  });

  it('shows an "already owned" message on a 409 conflict', async () => {
    getCatalog.mockResolvedValueOnce(CATALOG);
    getWallet.mockResolvedValueOnce({ userId: 'u1', solidarityTokens: 50, civicBadges: 0 });
    getInventory.mockResolvedValueOnce({ userId: 'u1', ownedItemIds: [] });
    purchaseItem.mockRejectedValueOnce(new ApiError(409, 'item already owned'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new ShopModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('[data-buy="facade-1"]')!.click();
    root.querySelector<HTMLButtonElement>('.shop-confirm-yes')!.click();
    await flush();

    expect(root.querySelector('.shop-status')!.textContent).toMatch(/already own/i);
  });
});
