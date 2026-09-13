export type ShopItemCategory = 'facade' | 'cosmetic' | 'blueprint';

export interface ShopItem {
  id: string;
  title: string;
  description: string;
  category: ShopItemCategory;
  priceST: number;
  priceCAB: number;
  unlockCriteria?: string;
  previewUrl?: string;
}

export interface UserWallet {
  userId: string;
  solidarityTokens: number;
  civicBadges: number;
}

export interface UserInventory {
  userId: string;
  ownedItemIds: string[];
}

export interface PurchaseResult {
  wallet: UserWallet;
  inventory: UserInventory;
}
