import { get, set } from 'idb-keyval';
import { logDeed } from '../api/endpoints/irl';
import { getToken } from '../core/state/persistence';
import { recordAction } from '../core/offline/offlineRuntime';
import { ApiError } from '../api/client';
import type { IrlDeedCategory, IrlVerificationMethod, IrlDeed, IrlWallet } from '@district-cg/shared-types';

/**
 * Digital reward dispatcher for verified IRL civic deeds. Signed-in players
 * are credited immediately via the API; offline/unauthenticated players
 * still get their deed recorded locally (the planning doc's "Honour System
 * Journal" — genuine effort is never silently dropped) and it syncs the
 * next time flushOutbox() runs with connectivity.
 */

const OUTBOX_KEY = 'district-cg-irl-outbox';

export interface PendingDeed {
	category: IrlDeedCategory;
	note: string;
	verificationMethod: IrlVerificationMethod;
	loggedAt: number;
}

export interface AwardResult {
	synced: boolean;
	deed?: IrlDeed;
	wallet?: IrlWallet;
	/** The server refused the deed; it is not queued for retry. */
	rejected?: 'daily-limit' | 'invalid';
}

/** A 4xx other than 401 means the server will never accept this deed. */
function rejectionOf(err: unknown): AwardResult['rejected'] | null {
	if (!(err instanceof ApiError)) return null;
	if (err.status === 429) return 'daily-limit';
	if (err.status >= 400 && err.status < 500 && err.status !== 401) return 'invalid';
	return null;
}

async function readOutbox(): Promise<PendingDeed[]> {
	return (await get<PendingDeed[]>(OUTBOX_KEY)) ?? [];
}

async function queueOffline(pending: PendingDeed): Promise<void> {
	const existing = await readOutbox();
	existing.push(pending);
	await set(OUTBOX_KEY, existing);
}

export async function awardForDeed(
	category: IrlDeedCategory,
	note: string,
	verificationMethod: IrlVerificationMethod,
): Promise<AwardResult> {
	const pending: PendingDeed = { category, note, verificationMethod, loggedAt: Date.now() };

	// M18 — every logged deed produces a local signed OR-Set delta regardless
	// of server sync status (see CRDTSyncEngine.resolveOrSet): a deed the
	// player genuinely did is never lost even if it never reaches the server.
	recordAction('IRL_DEED_LOGGED', { category, note, verificationMethod });

	if (!getToken()) {
		await queueOffline(pending);
		return { synced: false };
	}
	try {
		const result = await logDeed(category, note, verificationMethod);
		return { synced: true, deed: result.deed, wallet: result.wallet };
	} catch (err) {
		const rejected = rejectionOf(err);
		if (rejected) return { synced: false, rejected };
		await queueOffline(pending);
		return { synced: false };
	}
}

/** Retries every queued offline deed against the server. Call opportunistically
 *  (e.g. on sign-in, or on app resume) — never blocks deed logging itself. */
export async function flushOutbox(): Promise<{ flushed: number; remaining: number }> {
	const pending = await readOutbox();
	if (pending.length === 0 || !getToken()) {
		return { flushed: 0, remaining: pending.length };
	}

	const stillPending: PendingDeed[] = [];
	let flushed = 0;
	for (const deed of pending) {
		try {
			await logDeed(deed.category, deed.note, deed.verificationMethod);
			flushed++;
		} catch (err) {
			// rejected for good (e.g. daily limit) — retrying can't succeed
			if (!rejectionOf(err)) stillPending.push(deed);
		}
	}
	await set(OUTBOX_KEY, stillPending);
	return { flushed, remaining: stillPending.length };
}

export async function getOutboxCount(): Promise<number> {
	return (await readOutbox()).length;
}
