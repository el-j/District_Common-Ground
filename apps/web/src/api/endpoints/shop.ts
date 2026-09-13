import { request } from '../client';
import type { ShopItem, UserWallet, UserInventory, PurchaseResult } from '@district-cg/shared-types';

export function getCatalog(): Promise<ShopItem[]> {
	return request<ShopItem[]>('GET', '/api/v1/shop/catalog');
}

export function getWallet(): Promise<UserWallet> {
	return request<UserWallet>('GET', '/api/v1/shop/wallet', undefined, getAuthToken());
}

export function getInventory(): Promise<UserInventory> {
	return request<UserInventory>('GET', '/api/v1/shop/inventory', undefined, getAuthToken());
}

export function purchaseItem(itemId: string): Promise<PurchaseResult> {
	return request<PurchaseResult>('POST', '/api/v1/shop/purchase', { itemId }, getAuthToken());
}

function getAuthToken(): string | undefined {
	try {
		return localStorage.getItem('dcg-token') ?? undefined;
	} catch {
		return undefined;
	}
}
