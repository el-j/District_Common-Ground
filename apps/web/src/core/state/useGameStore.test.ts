import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore, INITIAL_STATE } from './useGameStore';

// M38 — EPIC-33 §1. Confirms (rather than just assumes) that zustand's
// default shallow-merge setState() is what protects a brand-new top-level
// slice like `inventory` from an old save that predates it: `loadSave()`
// (persistence.ts) calls `useGameStore.setState(saved)` with no `replace`
// flag, so an old save object that never had an `inventory` key at all
// simply doesn't touch it, leaving INITIAL_STATE's default in place —
// documented at useGameStore.ts's `inventory` field.
describe('inventory slice — defensive merge against pre-M38 saves', () => {
  beforeEach(() => {
    useGameStore.setState(INITIAL_STATE, true);
  });

  it('a setState() partial lacking `inventory` (simulating an old save) leaves the default intact', () => {
    useGameStore.setState({
      inventory: { materials: { MATERIAL_WOOD: 9 }, collectedScavengePoints: ['x'] },
    });

    // Simulate loading an old save: a plain object with no `inventory` key
    // at all (not `inventory: undefined` — an old save literally never
    // serialized the key), exactly what loadSave() passes to setState().
    const oldSave = JSON.parse(JSON.stringify({ ...INITIAL_STATE, meta: { ...INITIAL_STATE.meta, day: 7 } }));
    delete oldSave.inventory;
    useGameStore.setState(oldSave);

    const state = useGameStore.getState();
    expect(state.meta.day).toBe(7);
    // The pre-existing inventory (set above) survives — proving zustand's
    // shallow merge, not a manual migration step, is what protects it.
    expect(state.inventory.materials['MATERIAL_WOOD']).toBe(9);
    expect(state.inventory.collectedScavengePoints).toEqual(['x']);
  });
});
