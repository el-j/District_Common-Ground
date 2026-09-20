import type { ClassRole } from '../state/useGameStore';

/**
 * M47 — EPIC-36 §1. A small, fixed, hand-authored family-template library
 * — never procedurally generated, mirroring `crisis_scenarios.json`'s
 * static-content discipline (see CLAUDE.md's determinism rule). "Random
 * family" in the user's original request is read here as *varied*, a
 * player pick among a fixed set (the same sense `CharacterSelect.ts`'s
 * existing 3-archetype pick already works in), never a dice roll — recorded
 * explicitly rather than left ambiguous, per this epic's own design intent.
 *
 * Starts as the existing Pip/Morgan/Arthur economic circumstances,
 * reframed as family origin stories rather than solo-archetype cards —
 * `classRole` still carries each template's *mechanical* identity forward
 * unchanged (EPIC-36's own non-goal: no retroactive rebalance of the
 * existing quartet's numbers). `startingStats` duplicates
 * `actions.ts`'s `ARCHETYPE_SEEDS` values verbatim — proven equal by a
 * real test, not just asserted.
 *
 * M49 — EPIC-36 §1/§3. `actions.ts`'s `beginFromFamilyTemplate()` now
 * actually seeds `player`'s starting cash/energy/trust/stress from
 * `startingStats` directly (not `ARCHETYPE_SEEDS[classRole]`) — a future
 * template can now diverge from the fixed 3 archetypes without any seeding
 * code changing. `classRole` is still derived from the chosen template via
 * a direct 1:1 lookup (`FAMILY_TEMPLATES.find(t => t.id === familyTemplateId).classRole`)
 * — recorded here explicitly, per this milestone's own Section 3
 * instruction not to leave the mapping implicit. `ClassRole`/
 * `setArchetype()` both remain in the codebase unchanged (`WorkSystem.ts`/
 * `CrisisEngine.ts`/`TopHUD.ts`/`ShareModal.ts` all still read
 * `player.classRole` directly, confirmed by grep before this milestone
 * touched anything) — only `CharacterSelect.ts`'s own call site switched
 * from `setArchetype(role)` to `beginFromFamilyTemplate(templateId)`.
 */
export type FamilyTemplateId = 'courier-family' | 'commuter-family' | 'landlord-family';

export interface FamilyMember {
  name: string;
  relation: string;
  description: string;
  /** M49 — EPIC-36 §2. A `NpcDialogues.ts` tree key — family members get
   *  the same single-fixed-tree treatment M42/M45 already established for
   *  minor NPCs, not the full open-world roster's 5-tree rotation. */
  dialogueKey: string;
}

export interface FamilyStartingStats {
  cash: number;
  energy: number;
  trust: number;
  stress: number;
}

export interface FamilyTemplate {
  id: FamilyTemplateId;
  familyName: string;
  circumstance: string;
  startingStats: FamilyStartingStats;
  /** A `world/regions/RegionData.ts` `RegionId`, kept as `string` — the
   *  same "core/ never imports world/" reasoning every other cross-layer
   *  id in this codebase already follows. */
  homeRegion: string;
  /** M49 — EPIC-36 §2. A `world/InteriorProps.ts` `InteriorId`, kept as
   *  `string` for the same cross-layer reason — the real building
   *  `members` spawn inside, tying this template into EPIC-34's housing. */
  homeInteriorId: string;
  members: FamilyMember[];
  /** Which existing archetype this template's mechanical identity maps
   *  to — `CharacterSelect.ts` still calls `setArchetype(classRole)` to
   *  seed real stats in M47, not `startingStats` directly (see this file's
   *  own doc comment above). */
  classRole: ClassRole;
}

export const FAMILY_TEMPLATES: readonly FamilyTemplate[] = [
  {
    id: 'courier-family',
    familyName: 'The Alvarez Family',
    circumstance: 'Raised in a third-floor walkup where the whole block knew your name before you could walk. Money came in gig shifts and favors traded hand to hand — never much of either, but never truly alone either.',
    startingStats: { cash: 25, energy: 80, trust: 40, stress: 60 },
    homeRegion: 'REGION_COMMON_GROUND',
    homeInteriorId: 'pipsCourierRoom',
    classRole: 'pip',
    members: [
      { name: 'Marisol Alvarez', relation: 'Mother', description: 'Works two delivery-app shifts a day and still shows up to every stoop meeting on the block.', dialogueKey: 'marisol_family' },
      { name: 'Teo Alvarez', relation: 'Younger brother', description: 'Twelve years old, already fixing neighbors\' bikes for tips out of the courtyard.', dialogueKey: 'teo_family' },
    ],
  },
  {
    id: 'commuter-family',
    familyName: 'The Chen Family',
    circumstance: 'A household built around the clock: alarms before dawn, a two-hour commute each way, dinner reheated after the kids were already asleep. Steady, but stretched thin enough that the neighbors stayed strangers.',
    startingStats: { cash: 240, energy: 40, trust: 25, stress: 45 },
    homeRegion: 'REGION_COMMON_GROUND',
    homeInteriorId: 'apartmentBlockB',
    classRole: 'morgan',
    members: [
      { name: 'David Chen', relation: 'Father', description: 'A dispatcher who has driven the same transit line for eleven years and complains about it every single day.', dialogueKey: 'david_family' },
      { name: 'Priya Chen', relation: 'Cousin, staying with the family', description: 'Between apartments for the third time this year, quietly grateful for the couch.', dialogueKey: 'priya_family' },
    ],
  },
  {
    id: 'landlord-family',
    familyName: 'The Whitfield Family',
    circumstance: 'Old money, older habits. A property portfolio built by a grandfather who never once introduced himself to a tenant, and a family that inherited the buildings along with the distance.',
    startingStats: { cash: 1200, energy: 65, trust: 10, stress: 30 },
    homeRegion: 'REGION_COMMON_GROUND',
    homeInteriorId: 'apartmentBlockB',
    classRole: 'arthur',
    members: [
      { name: 'Harold Whitfield', relation: 'Grandfather', description: 'Built the family\'s holdings from a single duplex. Still calls every tenant "the renters."', dialogueKey: 'harold_family' },
      { name: 'Constance Whitfield', relation: 'Estranged sister', description: 'Left the family business a decade ago and hasn\'t spoken to Harold since. Lives somewhere in the district, unlisted.', dialogueKey: 'constance_family' },
    ],
  },
];

export function getFamilyTemplate(id: FamilyTemplateId): FamilyTemplate | undefined {
  return FAMILY_TEMPLATES.find(t => t.id === id);
}
