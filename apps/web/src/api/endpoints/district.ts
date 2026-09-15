import { request } from '../client';

/**
 * Fire-and-forget: records one anonymous crisis-resolution choice so the
 * Global Solidarity Pool (GET /api/v1/district/resilience) reflects real
 * gameplay. Never blocks or fails the local crisis resolution — matches the
 * same "local state is authoritative, server sync is best-effort" convention
 * as core/state/persistence.ts's advanceDay().
 */
export function recordCrisisChoice(crisisId: string, day: number, choice: 'solidarity' | 'scapegoat'): void {
	const token = getAuthToken();
	if (!token) return;
	void request<void>('POST', '/api/v1/district/crisis-log', { crisisId, day, choice }, token).catch(() => {
		/* best-effort — local gameplay is never blocked by this */
	});
}

/**
 * M13 — fire-and-forget: records one day's anonymized cash/energy snapshot so
 * GET /api/v1/district/attrition can compute the planning doc's "Economic
 * Attrition Rate". Same best-effort, never-blocks-gameplay posture as
 * recordCrisisChoice above.
 */
export function recordEconomicSnapshot(day: number, archetype: string, cash: number, energy: number): void {
	const token = getAuthToken();
	if (!token) return;
	void request<void>('POST', '/api/v1/district/economic-snapshot', { day, archetype, cash, energy }, token).catch(() => {
		/* best-effort — local gameplay is never blocked by this */
	});
}

function getAuthToken(): string | undefined {
	try {
		return localStorage.getItem('dcg-token') ?? undefined;
	} catch {
		return undefined;
	}
}
