/**
 * M21 — Interior Furnishing (spec §2.2, §5.1).
 * M41 — EPIC-34 §1/§2. Each interior now also carries its `doorTile` (the
 * exact `MapData.ts` `DOOR_TILES` coordinate that enters it). Real
 * isolation (`InteriorScene.ts`) replaced the old "walk into the rect on
 * the shared tilemap, camera pans" mechanism (`findInteriorAtTile()`/
 * `updateInteriorFraming()`, both removed) — entry is now door-triggered,
 * matching how a real building actually works.
 *
 * M45 — EPIC-35 §3. **Correction, recorded not silent**: an
 * `exteriorReturnTile` field existed here from M41 through M44 but was
 * genuinely dead — `enterInterior()` (WorldScene.ts/RegionScene.ts) always
 * captures the player's *live* position at the moment of entry as the
 * return point, never consulting this field. That's the more correct
 * behavior anyway (a player can approach a door from any angle and should
 * return to wherever they actually stood, not a hardcoded fixed tile), so
 * the field was removed rather than wired up to override working behavior.
 *
 * Pure registry, no Phaser dependency: names each interior's required props
 * as abstract tokens (`PropToken`), never sprite filenames — `InteriorScene`
 * (not `WorldScene` any more, see M41) is the only place that resolves a
 * token to an actual draw call, respecting the Headless Simulation boundary.
 *
 * Tile rects below are the *inner floor* area of the matching building in
 * `WorldScene.ts`'s `buildMap()` (one tile in from each wall):
 *   - Pip's Courier Room = Apartment Block A: drawBuilding(m, 2, 45, 13, 61, 7)
 *   - Community Kitchen  = Corner Grocer / Community Fridge: drawBuilding(m, 17, 49, 23, 57, 20)
 *   - Town Assembly Hall = Town Hall: drawBuilding(m, 2, 24, 8, 35, 5)
 *
 * M42 — EPIC-34 §1/§2/§3. 5 more interiors (Metalwork/Woodworking
 * Workshops, Baumarkt, Supermarket, Library), all in the new "South Canal
 * Workshop & Retail Row" (MapData.ts's cols 52-62, rows 44-74 — a real
 * grass block, verified 100% free before any `drawBuilding()` call, same
 * throwaway-script discipline as every M38-M41 coordinate). Each carries
 * one optional `craftingStation`/`retailCategory`/`cookbookPickups`/`npc`
 * beyond the base props — a real, minimal home for the M39/M38 forward
 * dependencies those milestones flagged rather than left open.
 */

export type InteriorId =
  | 'pipsCourierRoom' | 'communityKitchen' | 'townAssembly'
  | 'metalworkWorkshop' | 'woodworkingWorkshop' | 'baumarkt' | 'supermarket' | 'library'
  | 'apartmentBlockB'
  | 'scrapyardDepot';

export type PropToken =
  | 'PROP_BIKE_RACK'
  | 'PROP_COT'
  | 'PROP_BOXES'
  | 'PROP_LAMP'
  | 'PROP_TABLE'
  | 'PROP_STOVE'
  | 'PROP_CRATES'
  | 'PROP_BENCH'
  | 'PROP_CHALKBOARD'
  | 'PROP_BANNER'
  | 'PROP_ANVIL'
  | 'PROP_FORGE'
  | 'PROP_SAWHORSE'
  | 'PROP_LUMBER_STACK'
  | 'PROP_SHELF_HARDWARE'
  | 'PROP_TOOL_RACK'
  | 'PROP_SHELF_GOODS'
  | 'PROP_CASH_REGISTER'
  | 'PROP_BOOKSHELF'
  | 'PROP_READING_TABLE'
  | 'PROP_SCRAP_PILE'
  | 'PROP_CRANE_ARM'
  | 'PROP_CRUSHED_CAR';

export interface TileRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface PropPlacement {
  token: PropToken;
  x: number; // tile column
  y: number; // tile row
}

export interface TilePoint {
  x: number;
  y: number;
}

/** M42 §3. A cookbook pickup scoped to a specific interior room, rendered
 *  by InteriorScene.ts the same way CookbookPickups.ts's open-world ones
 *  are rendered by WorldScene.ts — same collectCookbook() action, just a
 *  different placement surface. */
export interface InteriorCookbookPickup {
  id: string;
  recipe: import('../core/simulation/Recipes').RecipeId;
  x: number;
  y: number;
}

/** M42 §1/§3. A minimal, static (non-patrolling) flavor NPC for a small
 *  one-off interior — deliberately not a full NPCEntity/5-tree rotation
 *  (that's the open-world roster's own established pattern, M23/M26);
 *  see NpcDialogues.ts for the fixed single tree each of these points at. */
export interface InteriorNpc {
  id: string;
  name: string;
  dialogueKey: string;
  x: number;
  y: number;
}

export interface InteriorDefinition {
  id: InteriorId;
  label: string;
  rect: TileRect;
  props: PropPlacement[];
  /** M41 — the MapData.ts DOOR_TILES coordinate that enters this interior
   *  (for a Common Ground interior) — or, as of M45, the equivalent
   *  door-marker coordinate inside whichever region's own coordinate space
   *  `homeRegion` names. */
  doorTile: TilePoint;
  /** M45 — EPIC-35 §3. Explicit and required (not left to an implicit
   *  "undefined means Common Ground" default), per this project's "resolve
   *  explicitly, don't leave implicit" convention — every interior belongs
   *  to exactly one region's own scene/coordinate space. `WorldScene.ts`
   *  and `RegionScene.ts` each filter `ALL_INTERIOR_IDS` down to their own
   *  `homeRegion` before rendering doors, so two regions can safely reuse
   *  the same door-tile coordinates without colliding. */
  homeRegion: import('./regions/RegionData').RegionId;
  /** M42 §1 — present only for the 2 workshops; closes M39 §3's
   *  CraftingStation forward dependency. Reuses Recipes.ts's own
   *  `CraftingStation` type directly rather than a duplicate world-layer
   *  shape — placement (the value) is a world-layer concern, but the type
   *  itself has no reason to be redefined. */
  craftingStation?: import('../core/simulation/Recipes').CraftingStation;
  /** M42 §2 — present only for Baumarkt/Supermarket; which MaterialCategory
   *  (Materials.ts) this store's RetailModal offers. */
  retailCategory?: import('../core/simulation/Materials').MaterialCategory;
  /** M42 §3 — present only for the Library. */
  cookbookPickups?: InteriorCookbookPickup[];
  /** M42 §1/§3 — present for the 2 workshops and the Library. */
  npc?: InteriorNpc;
  /** M43 §1/§2 — present only for the 2 apartment interiors; which
   *  HousingOptions.ts `HousingOption.id`s can be rented at this location. */
  housingOptionIds?: string[];
  /** M43 §2 — present only for the 2 apartment interiors. Fixed placement
   *  points for the player-furniture editor (slot-based, not freeform drag,
   *  per EPIC-32's original carried-forward decision) — additional to, and
   *  rendered independently of, this interior's own fixed `props`. */
  furnitureSlots?: TilePoint[];
  /** M49 — EPIC-36 §2. Present only for the 2 apartment interiors. Fixed
   *  points where the *current player's* chosen `FamilyTemplate.members`
   *  render — unlike every other NPC field in this file, who occupies
   *  these slots is player-state-dependent (whichever family template
   *  `origin.familyTemplateId` names), not fixed content, so `InteriorScene.ts`
   *  reads `FamilyTemplates.ts` at render time rather than this file
   *  defining the NPCs directly. */
  familyNpcSlots?: TilePoint[];
}

export const INTERIORS: Record<InteriorId, InteriorDefinition> = {
  pipsCourierRoom: {
    id: 'pipsCourierRoom',
    label: "Pip's Courier Room",
    rect: { x1: 3, y1: 46, x2: 12, y2: 60 },
    props: [
      { token: 'PROP_BIKE_RACK', x: 4, y: 47 },
      { token: 'PROP_COT', x: 9, y: 48 },
      { token: 'PROP_BOXES', x: 5, y: 58 },
      { token: 'PROP_LAMP', x: 11, y: 59 },
    ],
    doorTile: { x: 7, y: 61 },
    homeRegion: 'REGION_COMMON_GROUND',
    housingOptionIds: ['pips-courier-room'],
    furnitureSlots: [{ x: 7, y: 50 }, { x: 7, y: 53 }, { x: 10, y: 56 }, { x: 4, y: 55 }],
    familyNpcSlots: [{ x: 8, y: 52 }, { x: 10, y: 58 }],
  },
  communityKitchen: {
    id: 'communityKitchen',
    label: 'Community Kitchen',
    rect: { x1: 18, y1: 50, x2: 22, y2: 56 },
    props: [
      { token: 'PROP_TABLE', x: 20, y: 52 },
      { token: 'PROP_STOVE', x: 19, y: 55 },
      { token: 'PROP_CRATES', x: 21, y: 55 },
    ],
    doorTile: { x: 20, y: 57 },
    homeRegion: 'REGION_COMMON_GROUND',
  },
  townAssembly: {
    id: 'townAssembly',
    label: 'Town Assembly Hall',
    rect: { x1: 3, y1: 25, x2: 7, y2: 34 },
    props: [
      { token: 'PROP_BENCH', x: 4, y: 31 },
      { token: 'PROP_BENCH', x: 6, y: 31 },
      { token: 'PROP_CHALKBOARD', x: 5, y: 26 },
      { token: 'PROP_BANNER', x: 5, y: 27 },
    ],
    doorTile: { x: 5, y: 35 },
    homeRegion: 'REGION_COMMON_GROUND',
  },

  // ── M42 — South Canal Workshop & Retail Row ─────────────────────────────
  metalworkWorkshop: {
    id: 'metalworkWorkshop',
    label: 'Metalwork Workshop',
    rect: { x1: 53, y1: 45, x2: 55, y2: 51 },
    props: [
      { token: 'PROP_ANVIL', x: 54, y: 46 },
      { token: 'PROP_FORGE', x: 54, y: 50 },
      { token: 'PROP_CRATES', x: 53, y: 49 },
    ],
    doorTile: { x: 54, y: 52 },
    homeRegion: 'REGION_COMMON_GROUND',
    craftingStation: { id: 'metalwork-workshop', discipline: 'metalwork', requiredTier: 'advanced' },
    npc: { id: 'priya', name: 'Priya', dialogueKey: 'priya_workshop', x: 54, y: 48 },
  },
  woodworkingWorkshop: {
    id: 'woodworkingWorkshop',
    label: 'Woodworking Workshop',
    rect: { x1: 59, y1: 45, x2: 61, y2: 51 },
    props: [
      { token: 'PROP_SAWHORSE', x: 60, y: 46 },
      { token: 'PROP_LUMBER_STACK', x: 60, y: 50 },
      { token: 'PROP_CRATES', x: 59, y: 49 },
    ],
    doorTile: { x: 60, y: 52 },
    homeRegion: 'REGION_COMMON_GROUND',
    craftingStation: { id: 'woodworking-workshop', discipline: 'woodwork', requiredTier: 'advanced' },
    npc: { id: 'dax', name: 'Dax', dialogueKey: 'dax_workshop', x: 60, y: 48 },
  },
  baumarkt: {
    id: 'baumarkt',
    label: 'Baumarkt',
    rect: { x1: 53, y1: 55, x2: 55, y2: 61 },
    props: [
      { token: 'PROP_SHELF_HARDWARE', x: 54, y: 56 },
      { token: 'PROP_TOOL_RACK', x: 54, y: 60 },
      { token: 'PROP_LAMP', x: 53, y: 59 },
    ],
    doorTile: { x: 54, y: 62 },
    homeRegion: 'REGION_COMMON_GROUND',
    // M42 §2 — hardware-store flavor sells the urban-salvage half of M38's
    // 15-token taxonomy (scrap metal, reclaimed wood, glass, rubber,
    // electronic components, wire): fixable/buildable stock, not produce.
    retailCategory: 'salvage',
  },
  supermarket: {
    id: 'supermarket',
    label: 'Supermarket',
    rect: { x1: 59, y1: 55, x2: 61, y2: 61 },
    props: [
      { token: 'PROP_SHELF_GOODS', x: 60, y: 56 },
      { token: 'PROP_CASH_REGISTER', x: 60, y: 60 },
      { token: 'PROP_LAMP', x: 59, y: 59 },
    ],
    doorTile: { x: 60, y: 62 },
    homeRegion: 'REGION_COMMON_GROUND',
    // M42 §2 — the raw/natural half of the same taxonomy (wood, stone,
    // iron, coal, resin, wool, cotton, leather, mushroom): a distinct
    // flavor from the existing Corner Grocer's fixed narrative role, and
    // from Baumarkt's salvage/hardware stock, using the real
    // MaterialCategory split M38 already established rather than a new
    // invented item system.
    retailCategory: 'raw',
  },
  library: {
    id: 'library',
    label: 'Library',
    rect: { x1: 60, y1: 67, x2: 61, y2: 73 },
    props: [
      { token: 'PROP_BOOKSHELF', x: 60, y: 68 },
      { token: 'PROP_READING_TABLE', x: 61, y: 72 },
      { token: 'PROP_LAMP', x: 61, y: 68 },
    ],
    doorTile: { x: 60, y: 74 },
    homeRegion: 'REGION_COMMON_GROUND',
    // M42 §3 — the "found in the world" half of M39's cookbook-discovery
    // mechanic gets a genuine home, distinct from the scattered open-world
    // pickups ScavengePoints.ts/CookbookPickups.ts already place. Also
    // closes a real gap surfaced during this milestone: M40 authored 5 new
    // recipes (the bike + the 4-tier computer chain) but never gave any of
    // them a discovery path — RECIPE_CIRCUIT_BOARD's own doc comment and a
    // dedicated NpcDialogues.test.ts negative-check both already asserted
    // "found-cookbook-only," but no cookbook existed anywhere until now.
    cookbookPickups: [
      { id: 'library-cookbook-1', recipe: 'RECIPE_CIRCUIT_BOARD', x: 60, y: 70 },
      { id: 'library-cookbook-2', recipe: 'RECIPE_BASIC_TOOLS', x: 61, y: 70 },
      { id: 'library-cookbook-3', recipe: 'RECIPE_UPCYCLED_COMPUTER', x: 61, y: 71 },
    ],
    npc: { id: 'ezra', name: 'Ezra', dialogueKey: 'ezra_library', x: 60, y: 71 },
  },

  // ── M43 — Housing, Rental & Home Furniture Editor ───────────────────────
  // Apartment Block B never had any interior at all before this milestone
  // (confirmed by the original EPIC-32 audit: "only 1 of 2 apartment
  // buildings has any interior content") — closing that gap is this
  // milestone's own job, not deferred further.
  apartmentBlockB: {
    id: 'apartmentBlockB',
    label: 'Apartment Block B',
    rect: { x1: 34, y1: 46, x2: 45, y2: 60 },
    props: [
      { token: 'PROP_COT', x: 36, y: 48 },
      { token: 'PROP_BOXES', x: 40, y: 48 },
      { token: 'PROP_LAMP', x: 43, y: 59 },
    ],
    doorTile: { x: 39, y: 61 },
    homeRegion: 'REGION_COMMON_GROUND',
    housingOptionIds: ['block-b-shared', 'block-b-private'],
    furnitureSlots: [{ x: 36, y: 52 }, { x: 36, y: 55 }, { x: 40, y: 52 }, { x: 40, y: 55 }],
    familyNpcSlots: [{ x: 38, y: 58 }, { x: 42, y: 52 }],
  },

  // ── M45 — EPIC-35 §3. Region Content Pass #1: Industrial Outskirts ─────
  // The "at least one building using M41's framework" requirement — the
  // depot's rect lives entirely in the Industrial Outskirts region's own
  // coordinate space (RegionScene.ts's grid), never the town's; the door
  // marker sits at (18,25) in that same space, rendered/handled by
  // RegionScene.ts exactly the way WorldScene.ts handles Common Ground's
  // doors, just filtered to this region via homeRegion.
  scrapyardDepot: {
    id: 'scrapyardDepot',
    label: 'Scrapyard Depot',
    rect: { x1: 2, y1: 2, x2: 6, y2: 8 },
    props: [
      { token: 'PROP_SCRAP_PILE', x: 3, y: 3 },
      { token: 'PROP_CRANE_ARM', x: 5, y: 4 },
      { token: 'PROP_TOOL_RACK', x: 3, y: 7 },
    ],
    doorTile: { x: 18, y: 25 },
    homeRegion: 'REGION_INDUSTRIAL_OUTSKIRTS',
  },
};

export const ALL_INTERIOR_IDS: readonly InteriorId[] = [
  'pipsCourierRoom', 'communityKitchen', 'townAssembly',
  'metalworkWorkshop', 'woodworkingWorkshop', 'baumarkt', 'supermarket', 'library',
  'apartmentBlockB',
  'scrapyardDepot',
];

export function propsForInterior(id: InteriorId): PropPlacement[] {
  return INTERIORS[id].props;
}

/** M41 — the door-tile-triggered replacement for the old rect-based
 *  findInteriorAtTile() (removed — real isolation means entry is a door
 *  interaction, not walking into a shared-tilemap zone).
 *
 *  M45 — EPIC-35 §3. **Real gap found and closed, not left open**: this
 *  function was never actually called anywhere in application code through
 *  M41-M44 — both `WorldScene.ts` and (M44's) `RegionScene.ts` used their
 *  own inline proximity-radius search instead. Now that a second region
 *  exists, door-tile coordinates are only unique *within* one region's own
 *  space, not globally — so this function gained a required `regionId`
 *  param (a real correctness fix, not cosmetic) so it filters to the right
 *  interior set before matching, the same way the two scenes' own inline
 *  searches already need to. */
export function findInteriorByDoorTile(regionId: import('./regions/RegionData').RegionId, tx: number, ty: number): InteriorDefinition | null {
  for (const def of Object.values(INTERIORS)) {
    if (def.homeRegion === regionId && def.doorTile.x === tx && def.doorTile.y === ty) return def;
  }
  return null;
}
