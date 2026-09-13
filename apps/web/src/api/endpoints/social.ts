import { request } from '../client';
import type {
	FriendProfile,
	DistrictSnapshot,
	SolidarityCaravan,
	CaravanResourceType,
	CaravanClaimResult,
	MyProfile,
} from '@district-cg/shared-types';

export function getMe(): Promise<MyProfile> {
	return request<MyProfile>('GET', '/api/v1/social/me', undefined, getAuthToken());
}

export function getFriends(): Promise<FriendProfile[]> {
	return request<FriendProfile[]>('GET', '/api/v1/social/friends', undefined, getAuthToken());
}

export function addFriend(identifier: string): Promise<FriendProfile> {
	return request<FriendProfile>('POST', '/api/v1/social/friends/add', { identifier }, getAuthToken());
}

export function getFriendDistrict(userId: string): Promise<DistrictSnapshot> {
	return request<DistrictSnapshot>('GET', `/api/v1/social/district/${encodeURIComponent(userId)}`, undefined, getAuthToken());
}

export function dispatchCaravan(
	identifier: string,
	resourceType: CaravanResourceType,
	amount: number,
	note: string,
): Promise<SolidarityCaravan> {
	return request<SolidarityCaravan>(
		'POST',
		'/api/v1/social/caravan/dispatch',
		{ identifier, resourceType, amount, note },
		getAuthToken(),
	);
}

export function getCaravanInbox(): Promise<SolidarityCaravan[]> {
	return request<SolidarityCaravan[]>('GET', '/api/v1/social/caravan/inbox', undefined, getAuthToken());
}

export function claimCaravan(caravanId: string): Promise<CaravanClaimResult> {
	return request<CaravanClaimResult>('POST', `/api/v1/social/caravan/${encodeURIComponent(caravanId)}/claim`, undefined, getAuthToken());
}

function getAuthToken(): string | undefined {
	try {
		return localStorage.getItem('dcg-token') ?? undefined;
	} catch {
		return undefined;
	}
}
