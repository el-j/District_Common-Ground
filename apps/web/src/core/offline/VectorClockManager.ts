import type { VectorClock } from '@district-cg/shared-types';

export type ClockOrder = 'equal' | 'before' | 'after' | 'concurrent';

/** Returns a new clock with `deviceId`'s entry incremented by one (starting from 0 if absent). */
export function increment(clock: VectorClock, deviceId: string): VectorClock {
  return { ...clock, [deviceId]: (clock[deviceId] ?? 0) + 1 };
}

/** Pointwise-max merge of two vector clocks — the standard CRDT vector-clock join. */
export function merge(a: VectorClock, b: VectorClock): VectorClock {
  const merged: VectorClock = { ...a };
  for (const deviceId of Object.keys(b)) {
    merged[deviceId] = Math.max(merged[deviceId] ?? 0, b[deviceId] ?? 0);
  }
  return merged;
}

/**
 * Compares two vector clocks for causal order.
 * - 'equal': identical on every known device
 * - 'before': `a` happened-before `b` (every entry in `a` <= `b`, at least one strictly less)
 * - 'after': the reverse
 * - 'concurrent': neither dominates — a genuine conflict the CRDT layer must resolve
 */
export function compare(a: VectorClock, b: VectorClock): ClockOrder {
  const deviceIds = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aLessSomewhere = false;
  let bLessSomewhere = false;

  for (const deviceId of deviceIds) {
    const av = a[deviceId] ?? 0;
    const bv = b[deviceId] ?? 0;
    if (av < bv) aLessSomewhere = true;
    if (bv < av) bLessSomewhere = true;
  }

  if (!aLessSomewhere && !bLessSomewhere) return 'equal';
  if (aLessSomewhere && !bLessSomewhere) return 'before';
  if (bLessSomewhere && !aLessSomewhere) return 'after';
  return 'concurrent';
}

/** True when neither clock causally dominates the other — a real conflict requiring CRDT resolution. */
export function isConcurrent(a: VectorClock, b: VectorClock): boolean {
  return compare(a, b) === 'concurrent';
}
