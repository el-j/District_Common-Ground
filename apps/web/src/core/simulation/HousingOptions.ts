/**
 * M43 §1 — EPIC-34, absorbing EPIC-32's M36 scope unchanged. Mirrors
 * `CrisisEngine.ts`'s `consequences` shape, applied recurring (once per
 * `advanceDay()` tick) instead of one-time.
 *
 * **Placement decision, recorded not silent**: lives in `core/simulation/`,
 * not `world/`, even though `buildingInteriorId` conceptually names an
 * `InteriorProps.ts` `InteriorId` — kept as a plain `string` here (not the
 * real cross-imported type) specifically so `core/state/actions.ts`'s
 * `advanceDay()` can read housing consequences without `core/` ever
 * importing from `world/`, preserving the one-way `world/` → `core/`
 * dependency direction every other layer boundary in this codebase already
 * respects (`collectMaterial()`/`ScavengePoints.ts` established it, M38).
 * `InteriorProps.ts`'s own `housingOptionIds?: string[]` field already only
 * stores raw ids, never this module's types, so nothing on the `world/`
 * side actually needed the stricter type either.
 *
 * **Deviation from EPIC-32's original grounding, recorded not silent**: no
 * `trustDelta` field — `EconomyMath.ts`'s real `DailyTickResult` shape only
 * ever returns `{energyDelta, cashDelta, stressDelta}` (trust changes are
 * event-driven today, via `addTrust()`/`loseTrust()`, never part of the
 * daily tick) — extending the tick's return shape to add a 4th stat was
 * disproportionate to this milestone, so housing tradeoffs map onto the 3
 * stats the tick actually has, not a stat it doesn't.
 */
export interface HousingConsequences {
  cashDelta: number;
  energyDelta: number;
  stressDelta: number;
}

export interface HousingOption {
  id: string;
  /** An `InteriorProps.ts` `InteriorId`, kept as `string` here — see this
   *  file's own doc comment above for why. */
  buildingInteriorId: string;
  unitLabel: string;
  label: string;
  description: string;
  consequences: HousingConsequences;
}

// No fixed home (housing.currentFlatId === null) is a valid state, but
// sleeping rough costs energy and adds stress (EconomyMath.ts's
// ROUGH_SLEEPING), so every flat is worth its rent. 3 virtual units across
// the 2 apartment footprints, none strictly dominant: cheap+cozy,
// mid-price+energising, pricey+restful. Furniture placed in a rented flat
// relieves stress too (FURNITURE_MAX_RELIEF).
export const HOUSING_OPTIONS: readonly HousingOption[] = [
  {
    id: 'pips-courier-room',
    buildingInteriorId: 'pipsCourierRoom',
    unitLabel: "Pip's Courier Room",
    label: 'Courier Room — Block A',
    description: 'A cramped but familiar room above the courier route. Cheap, and close to the people who already know you.',
    consequences: { cashDelta: -5, energyDelta: 0, stressDelta: -2 },
  },
  {
    id: 'block-b-shared',
    buildingInteriorId: 'apartmentBlockB',
    unitLabel: 'Shared Room',
    label: 'Shared Room — Block B',
    description: 'A shared flat with roommates you barely know yet. Less quiet, but someone always cooks.',
    consequences: { cashDelta: -7, energyDelta: 3, stressDelta: 0 },
  },
  {
    id: 'block-b-private',
    buildingInteriorId: 'apartmentBlockB',
    unitLabel: 'Private Suite',
    label: 'Private Suite — Block B',
    description: 'Your own private space in the same building. Costs more, but you sleep properly.',
    consequences: { cashDelta: -15, energyDelta: 6, stressDelta: -5 },
  },
];

export function getHousingOption(id: string | null): HousingOption | null {
  if (!id) return null;
  return HOUSING_OPTIONS.find(o => o.id === id) ?? null;
}

/** All housing options available at a given interior (an apartment
 *  building can host more than one virtual unit — see `apartmentBlockB`). */
export function housingOptionsForInterior(interiorId: string): HousingOption[] {
  return HOUSING_OPTIONS.filter(o => o.buildingInteriorId === interiorId);
}
