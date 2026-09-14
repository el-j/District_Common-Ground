import { request } from '../client';
import type { CivicAction, LocalChapter } from '@district-cg/shared-types';

export function getCivicTicker(regionCode: string): Promise<CivicAction[]> {
	return request<CivicAction[]>('GET', `/api/v1/civic/ticker?region=${encodeURIComponent(regionCode)}`);
}

export function getLocalChapters(regionCode: string): Promise<LocalChapter[]> {
	return request<LocalChapter[]>('GET', `/api/v1/civic/chapters?region=${encodeURIComponent(regionCode)}`);
}
