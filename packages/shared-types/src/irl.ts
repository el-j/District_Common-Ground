export type IrlDeedCategory = 'food_sharing' | 'eldercare' | 'park_greening' | 'community_repair';

export type IrlVerificationMethod = 'honor_system' | 'peer_verified';

export interface IrlDeed {
  id: string;
  category: IrlDeedCategory;
  note: string;
  verificationMethod: IrlVerificationMethod;
  stAwarded: number;
  cabAwarded: number;
  createdAt: string;
}

export interface IrlWallet {
  userId: string;
  solidarityTokens: number;
  civicBadges: number;
}

export interface LogDeedResult {
  deed: IrlDeed;
  wallet: IrlWallet;
}
