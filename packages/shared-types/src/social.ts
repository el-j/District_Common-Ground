export interface FriendProfile {
  userId: string;
  handle: string;
  districtName: string;
  day: number;
  resilienceScore: number;
  activeCrisis: string | null;
}

export type CaravanResourceType = 'energy' | 'food' | 'cash';

export interface SolidarityCaravan {
  id: string;
  senderHandle: string;
  resourceType: CaravanResourceType;
  amount: number;
  note: string;
  claimed: boolean;
}

export interface DistrictSnapshot {
  handle: string;
  day: number;
  resilienceScore: number;
  activeCrisis: string | null;
  commons: {
    solarGridProgress: number;
    kitchenProgress: number;
    legalFundProgress: number;
    toolLibraryProgress: number;
    landTrustProgress: number;
  };
}

export interface FriendAddResult {
  friend: FriendProfile;
}

export interface MyProfile {
  handle: string;
  inviteCode: string;
}

export interface CaravanClaimResult {
  resourceType: CaravanResourceType;
  amount: number;
}
