// M18 — conflict-free reconciliation over SignedActionDelta streams. Pure and
// transport-agnostic: it doesn't matter whether the deltas being merged came
// from apps/api's /api/v1/sync/deltas gateway (this milestone) or, later, a
// mesh peer (M19's MeshTransportPlugin) — the resolution rules are identical.
// Three strategies per docs/planning/18-...md's table, one per system:
//   - PN-Counter   -> commons/solidarity-pool contributions (additive, never lossy)
//   - LWW + Lamport -> district parcel stage ownership (one true winner per plot)
//   - OR-Set       -> IRL deeds / badges / minigame scores (adds only, never removed)
import type { SignedActionDelta, SyncActionType } from '@district-cg/shared-types';

/** Deduplicates two (or more) delta streams by id — the building block every resolver below uses. */
export function dedupeDeltas(...streams: SignedActionDelta[][]): SignedActionDelta[] {
  const seen = new Map<string, SignedActionDelta>();
  for (const stream of streams) {
    for (const delta of stream) {
      if (!seen.has(delta.id)) seen.set(delta.id, delta);
    }
  }
  return [...seen.values()];
}

/**
 * PN-Counter merge: sums every distinct `COMMONS_RESOURCE_CONTRIBUTION` delta's
 * `amount` for the given `node`, deduplicated by delta id. Order- and
 * duplicate-transmission-independent by construction — re-merging the same
 * delta twice (e.g. after a retried sync) never double-counts it.
 */
export function mergePnCounter(deltas: SignedActionDelta[], node: string): number {
  const seen = new Set<string>();
  let total = 0;
  for (const delta of deltas) {
    if (delta.actionType !== 'COMMONS_RESOURCE_CONTRIBUTION') continue;
    if (delta.payload.node !== node) continue;
    if (seen.has(delta.id)) continue;
    seen.add(delta.id);
    const amount = delta.payload.amount;
    if (typeof amount === 'number') total += amount;
  }
  return total;
}

/** Same as `mergePnCounter`, but grouped by every `node` present in the stream at once. */
export function mergePnCountersByNode(deltas: SignedActionDelta[]): Record<string, number> {
  const nodes = new Set<string>();
  for (const delta of deltas) {
    if (delta.actionType === 'COMMONS_RESOURCE_CONTRIBUTION' && typeof delta.payload.node === 'string') {
      nodes.add(delta.payload.node);
    }
  }
  const totals: Record<string, number> = {};
  for (const node of nodes) totals[node] = mergePnCounter(deltas, node);
  return totals;
}

/** Derives a scalar Lamport timestamp from a vector clock — its highest component. */
function lamportOf(delta: SignedActionDelta): number {
  const values = Object.values(delta.vectorClock);
  return values.length > 0 ? Math.max(...values) : 0;
}

/** True when `candidate` should replace `current` as the LWW winner (higher Lamport time, deviceId breaks ties). */
function beatsLww(candidate: SignedActionDelta, current: SignedActionDelta): boolean {
  const candidateTime = lamportOf(candidate);
  const currentTime = lamportOf(current);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return candidate.deviceId > current.deviceId;
}

/**
 * LWW-Element-Set with Lamport tie-break: resolves `PARCEL_STAGE_ADVANCE`
 * deltas to one winner per `payload.plotId`. Deterministic regardless of the
 * order deltas are merged in — two devices reconciling in either direction
 * always converge on the same winner.
 */
export function resolveLwwParcels(deltas: SignedActionDelta[]): Map<string, SignedActionDelta> {
  const winners = new Map<string, SignedActionDelta>();
  for (const delta of deltas) {
    if (delta.actionType !== 'PARCEL_STAGE_ADVANCE') continue;
    const plotId = delta.payload.plotId;
    if (typeof plotId !== 'string') continue;
    const current = winners.get(plotId);
    if (!current || beatsLww(delta, current)) winners.set(plotId, delta);
  }
  return winners;
}

/**
 * OR-Set (Observed-Remove Set, add-only in this game — nothing ever revokes a
 * logged deed or badge): the deduplicated union of every delta of `actionType`,
 * sorted chronologically for stable display.
 */
export function resolveOrSet(deltas: SignedActionDelta[], actionType: SyncActionType): SignedActionDelta[] {
  const seen = new Set<string>();
  const result: SignedActionDelta[] = [];
  for (const delta of deltas) {
    if (delta.actionType !== actionType) continue;
    if (seen.has(delta.id)) continue;
    seen.add(delta.id);
    result.push(delta);
  }
  return result.sort((a, b) => a.timestamp - b.timestamp);
}
