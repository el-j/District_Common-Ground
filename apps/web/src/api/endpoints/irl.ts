import { request } from '../client';
import type { IrlDeed, IrlDeedCategory, IrlVerificationMethod, LogDeedResult } from '@district-cg/shared-types';

export function logDeed(
	category: IrlDeedCategory,
	note: string,
	verificationMethod: IrlVerificationMethod,
): Promise<LogDeedResult> {
	return request<LogDeedResult>('POST', '/api/v1/irl/deeds', { category, note, verificationMethod }, getAuthToken());
}

export function getDeedHistory(): Promise<IrlDeed[]> {
	return request<IrlDeed[]>('GET', '/api/v1/irl/deeds', undefined, getAuthToken());
}

function getAuthToken(): string | undefined {
	try {
		return localStorage.getItem('dcg-token') ?? undefined;
	} catch {
		return undefined;
	}
}
