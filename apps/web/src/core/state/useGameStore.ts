import { createStore } from 'zustand/vanilla';
import type { DistrictPulseState, DistrictParcelState, DistrictBuildingType } from '@district-cg/shared-types';
import type { MaterialToken } from '../simulation/Materials';
import type { RecipeId, CraftDiscipline, ItemToken } from '../simulation/Recipes';
import type { FamilyTemplateId } from '../simulation/FamilyTemplates';
import type { LedgerLine } from '../simulation/EconomyMath';

export type ClassRole = 'pip' | 'morgan' | 'arthur';
export type Facing = 'down' | 'up' | 'left' | 'right';
export type GamePhase = 'select' | 'playing';

// M48 — EPIC-36 §2. A small fixed set of common options plus a genuine
// self-describe escape hatch (free text, `player.genderSelfDescribe`) —
// respects "can also be diverse" for real rather than reskinning a binary
// choice. Purely a data/flavor field — no gameplay branches on this
// anywhere in the codebase, and none should ever be added.
export type GenderIdentity = 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say' | 'self-describe';

// M48 — EPIC-36 §3. An abstract appearance token, never a hardcoded hex
// value in game logic — same discipline `EntityToken` already enforces for
// every other visual element (CLAUDE.md's Critical Architecture Rule).
// **Scope decision, recorded not silent**: resolving this token inside
// each skin's real `createPlayerTexture()` (the `SkinRenderer` contract,
// M30) would mean extending that interface and updating all 8 existing
// skin packages — a substantially bigger lift than this milestone's "add
// the data field + selection UI" scope. Every skin currently falls back to
// its single existing player texture regardless of which token is chosen
// — the "documented default per skin" EPIC-36's own non-goals explicitly
// allow, taken to its honest conclusion (every skin uses the fallback
// today, not zero of them). Wiring real per-token rendering is a real,
// tracked forward dependency for a future milestone, not built here.
export type AppearanceToken = 'APPEARANCE_TONE_1' | 'APPEARANCE_TONE_2' | 'APPEARANCE_TONE_3' | 'APPEARANCE_TONE_4';
// M23 §5 — expanded from 3 to 6 so getQuestsForToday() can rotate a 3-quest
// window instead of offering the same fixed trio forever.
export type QuestId =
  | 'digital-deescalation'
  | 'community-reconnect'
  | 'local-mutual-aid'
  | 'skillshare-swap'
  | 'green-space-tidy'
  | 'check-in-call';

export interface QuestState {
  questId: QuestId;
  completedOnDay: number | null;
}

// M35 — EPIC-31 §2. Deliberately named `WorldQuest*` (not `Quest*`) to avoid
// colliding with `QuestId`/`QuestState` above, which stay exactly as they
// are — `IrlQuestSystem.ts` is a separate, still-valid self-attested daily
// buff mechanic, not being replaced. See `core/simulation/WorldQuests.ts`
// for the full type/data set; only the 2 store-shape pieces live here.
export type WorldQuestId =
  | 'scout-the-transit-hub'
  | 'deliver-higgins-letter'
  | 'fund-the-kitchen'
  | 'inspect-solar-grid'
  | 'sal-bread-run'
  | 'marcus-salvage-run'
  | 'legal-fund-rally'
  | 'tool-library-stocking'
  | 'mira-garden-scout'
  | 'canal-water-watch'
  | 'higgins-plaza-covenant'
  | 'sal-kitchen-support';

export interface WorldQuestState {
  /** At most one active at a time — Section 3's HUD objective chip shows
   *  either exactly this one or nothing, never a list to pick from. */
  activeId: WorldQuestId | null;
  completedIds: WorldQuestId[];
}

export interface MilestoneState {
  unlockedIds: string[];
  unlockedAt: Record<string, number>;
}

export interface CrisisLogEntry {
  id: string;
  day: number;
  choice: 'scapegoat' | 'solidarity';
  summary: string;
}

/** M43 §2 — EPIC-34. A player-placed piece of furniture, sourced from the
 *  player's own crafted/upcycled inventory (M40), not a fixed catalog —
 *  the one genuine upgrade EPIC-32's absorbed plan gets. `slotIndex` (not
 *  raw x/y) indexes into the *current* flat's `InteriorDefinition.furnitureSlots`
 *  — a deliberate, recorded resolution of EPIC-32's open "keyed by flat id
 *  vs. single current-flat state" question: placements are logically "slot
 *  N holds item X," re-laid-out against whichever flat is current, so
 *  moving flats never silently deletes furniture the player already spent
 *  a crafted item on. */
export interface PlacedFurniture {
  instanceId: string;
  item: ItemToken;
  slotIndex: number;
}

export interface GameState {
  meta: {
    day: number;
    tick: number;
    activeSkin: string;
    /** M28 — bumped once every time a skin manifest's real data is actually
     *  applied (both on the initial boot-time default and on every later
     *  `switchSkin()`), independent of whether `activeSkin`'s id itself
     *  changed. `WorldScene` keys its tileset-rebuild off this instead of
     *  `activeSkin`, because on first boot the id never changes (the store's
     *  initial value already matches the default skin) even though its real
     *  palette data only becomes available later, once the manifest fetch
     *  resolves. */
    skinRevision: number;
    phase: GamePhase;
    lastAssemblyDay: number;
    /** Coarse, user-chosen region bucket (e.g. "GENERIC", "US-WEST") used to
     *  filter the civic ticker/directory. Never derived from GPS or IP. */
    regionCode: string;
    /** Save-format version; bumped when a load needs a migration step. */
    saveVersion: number;
    /** Epoch ms of the last save — on load, the newest of the local and
     *  server saves wins. 0 = never saved. */
    savedAt: number;
  };
  player: {
    classRole: ClassRole | null;
    cash: number;
    energy: number;
    maxEnergy: number;
    socialTrust: number;
    stressLevel: number;
    position: { x: number; y: number };
    facing: Facing;
    /** M24 §2 — the last day the player used the "Work" action; null before
     *  the first use. Mirrors QuestState.completedOnDay's gating semantics. */
    lastWorkedDay: number | null;
    /** M48 — EPIC-36 §1/§2/§3. New fields on an *already-existing* nested
     *  slice — genuinely the unsafe case `useGameStore.test.ts` (M38) warned
     *  about, unlike every other new field this project has added since
     *  (which all landed as brand-new top-level slices specifically to
     *  avoid this). `persistence.ts`'s `loadSave()` now defensively merges
     *  `player` against `INITIAL_STATE.player` for real — see its own
     *  comment and `persistence.test.ts`'s proof. */
    name: string;
    gender: GenderIdentity;
    genderSelfDescribe?: string;
    appearance: AppearanceToken;
  };
  commons: {
    resilienceScore: number;
    solarGridProgress: number;
    kitchenProgress: number;
    legalFundProgress: number;
    toolLibraryProgress: number;
    landTrustProgress: number;
    constructionSpeedBuff: number;
    greenhouseUnlocked: boolean;
    safeHavenUnlocked: boolean;
    /** Persisted nudges from crises, votes, minigames and parcels. The
     *  score itself is always recomputed by `computeResilienceScore()`. */
    resilienceModifier: number;
  };
  crisisState: {
    activeCrisisId: string | null;
    pendingQueue: string[];
    historyLog: CrisisLogEntry[];
    /** Persisted so a reload can't reset the crisis cooldown or streak. */
    lastCrisisDay: number;
    scapegoatStreak: number;
    /** World colour saturation from crisis outcomes (1 = normal), saved so
     *  a reload keeps the look the player's choices produced. */
    worldSaturation: number;
  };
  quests: QuestState[];
  pulseState: DistrictPulseState | null;
  /** M38 — EPIC-33 §1. A brand-new top-level slice: old saves that predate
   *  this field simply lack the `inventory` key entirely, so zustand's
   *  default shallow-merge `setState()` (see persistence.ts's `loadSave()`)
   *  leaves this default in place automatically — confirmed, not just
   *  assumed, by `useGameStore.test.ts`'s defensive-merge test. No manual
   *  migration step was needed (contrast a *new field on an existing*
   *  nested slice like `player`, which zustand's shallow merge would
   *  replace wholesale from an old save and does need one). */
  inventory: {
    materials: Partial<Record<MaterialToken, number>>;
    collectedScavengePoints: string[];
  };
  /** M39 — EPIC-33 §1. Another brand-new top-level slice (see `inventory`'s
   *  comment above for why that makes it automatically safe against old
   *  saves — no defensive-merge code needed here either). Deliberately kept
   *  separate from `inventory` rather than adding a `.items` field onto it:
   *  a *new field on an already-existing* slice is exactly the unsafe case
   *  `useGameStore.test.ts` warns about (zustand's shallow merge replaces
   *  `inventory` wholesale from a pre-M39 save, which would silently drop
   *  crafted items if they lived inside it). `craftedItems` is this doc's
   *  own naming addition — the task doc only specified `knownRecipes`/
   *  `mastery`; crafted output has to live somewhere and a 3rd brand-new
   *  top-level key is the same safe pattern, not a new one. */
  crafting: {
    knownRecipes: RecipeId[];
    mastery: Partial<Record<CraftDiscipline, number>>;
    craftedItems: Partial<Record<ItemToken, number>>;
    collectedCookbookPoints: string[];
  };
  /** M43 §1/§2 — EPIC-34, absorbing EPIC-32's M36/M37 scope. Another
   *  brand-new top-level slice (see `inventory`'s comment above) — safe
   *  against old saves with no migration code needed. `currentFlatId` is a
   *  `HousingOptions.ts` `HousingOption.id` kept as a plain `string` here
   *  (not the `InteriorId`-coupled type) so `core/state/` never needs to
   *  import from `world/` — the same layer direction every other slice in
   *  this file already respects. */
  housing: {
    currentFlatId: string | null;
    movedInOnDay: number | null;
    furniture: PlacedFurniture[];
    /** M54 — EPIC-38 §1. Opt-in flag for proximity visiting over the mesh;
     *  defaults false (never opt-out, always opt-in). A NEW FIELD on this
     *  *already-existing* slice, not a new top-level slice — needs the
     *  same defensive merge treatment `player` got in M48, since an old
     *  save's `housing` object won't have this key at all. See
     *  `persistence.ts`'s `mergeWithDefaults()`. */
    visitable: boolean;
  };
  /** M44 — EPIC-35 §2. Another brand-new top-level slice (see `inventory`'s
   *  comment above). `currentRegionId` is kept as a plain `string` here,
   *  not `world/regions/RegionData.ts`'s real `RegionId` type — the same
   *  "core/state/ never imports from world/" reasoning `housing.currentFlatId`
   *  already established for `HousingOption.id`. **Not the same concept as
   *  `meta.regionCode`** (M16/M17's coarse real-world geo bucket for the
   *  civic ticker, e.g. "US-WEST") — `world.currentRegionId` is the
   *  in-fiction game-world region (WoW-style zone) EPIC-35 adds; the two
   *  names are unrelated on purpose, not a collision to resolve. */
  world: {
    currentRegionId: string;
  };
  /** M47 — EPIC-36 §1/§2. Another brand-new top-level slice (see
   *  `inventory`'s comment above). */
  origin: {
    familyTemplateId: FamilyTemplateId | null;
  };
  /** M35 — EPIC-31 §2/§3. Another brand-new top-level slice (see
   *  `inventory`'s comment above) — safe against old saves with no
   *  migration code needed. */
  worldQuests: WorldQuestState;
  /** 2026-09-29 launch audit — day-scoped economy bookkeeping (see
   *  `core/simulation/EconomyRules.ts`). */
  economy: EconomyState;
  /** Commons Bazaar items this account owns (server is the source of truth;
   *  refreshed on boot and after a purchase). See core/shop/ShopEffects.ts. */
  shop: { owned: string[] };
  /** Small neighbour moments on quiet mornings (NeighbourEvents.ts).
   *  `pendingId` is saved so a reload can't re-roll an unanswered event. */
  neighbourEvents: {
    /** The last day an event was rolled (at most one per day). */
    lastDay: number;
    /** Event id → the day it was last shown (per-event cooldown). */
    seen: Record<string, number>;
    pendingId: string | null;
  };
  /** First-day guide progress (ui/TutorialCoach.ts). */
  tutorial: { step: number; done: boolean };
  /** District Builder parcels (audit §2.2 — they used to be rebuilt from
   *  defaults every time the builder opened). Empty until first opened. */
  district: {
    parcels: DistrictParcelState[];
    /** Building types already harvested on `day` (one harvest per type). */
    harvestedToday: { day: number; types: DistrictBuildingType[] };
  };
  /** In-game civic milestones & achievements. */
  milestones: MilestoneState;
}

export type BuildNodeKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress' | 'toolLibraryProgress' | 'landTrustProgress';

export interface DayReport {
  day: number;
  starving: boolean;
  unpaid: number;
  breakdown: boolean;
  communityNode: BuildNodeKey | null;
  communityPct: number;
  /** The night itemised (morning ledger). Absent on reports saved before it existed. */
  lines?: LedgerLine[];
  before?: DayStats;
  after?: DayStats;
}

export interface DayStats { cash: number; energy: number; stress: number; trust: number }

/** What `advanceDay()` returns: always fully itemised. */
export type SettledDayReport = DayReport & Required<Pick<DayReport, 'lines' | 'before' | 'after'>>;

export interface EconomyState {
  /** The build neighbours pitch in on overnight: the last node the player
   *  contributed to that isn't finished yet. */
  focusNode: BuildNodeKey | null;
  /** Base % the player added per node on `day` (daily contribution cap). */
  contributionsToday: { day: number; byNode: Partial<Record<BuildNodeKey, number>> };
  /** Units sold per item on `day` (local demand). */
  salesToday: { day: number; byItem: Partial<Record<ItemToken, number>> };
  starvingDays: number;
  lastScrapsDay: number | null;
  breakdowns: number;
  /** What happened overnight, for the HUD to explain. */
  lastDayReport: DayReport | null;
  /** The Safe Haven ending screen has been shown for this save. */
  endingSeen: boolean;
}

export const INITIAL_STATE: GameState = {
  meta: { day: 1, tick: 0, activeSkin: 'solarpunk', skinRevision: 0, phase: 'select', lastAssemblyDay: 0, regionCode: 'GENERIC', saveVersion: 2, savedAt: 0 },
  player: {
    classRole: null,
    cash: 0,
    energy: 0,
    maxEnergy: 100,
    socialTrust: 0,
    stressLevel: 0,
    position: { x: 0, y: 0 },
    facing: 'down',
    lastWorkedDay: null,
    name: '',
    gender: 'prefer-not-to-say',
    appearance: 'APPEARANCE_TONE_1',
  },
  commons: {
    // = BASE_RESILIENCE (EconomyMath.ts): mid-"crisis" tier, not
    // "emergency" — a fresh game opens under visible economic stress.
    resilienceScore: 20,
    solarGridProgress: 0,
    kitchenProgress: 0,
    legalFundProgress: 0,
    toolLibraryProgress: 0,
    landTrustProgress: 0,
    constructionSpeedBuff: 0,
    greenhouseUnlocked: false,
    safeHavenUnlocked: false,
    resilienceModifier: 0,
  },
  crisisState: {
    activeCrisisId: null,
    pendingQueue: [],
    historyLog: [],
    lastCrisisDay: 0,
    scapegoatStreak: 0,
    worldSaturation: 1,
  },
  quests: [
    { questId: 'digital-deescalation', completedOnDay: null },
    { questId: 'community-reconnect',  completedOnDay: null },
    { questId: 'local-mutual-aid',     completedOnDay: null },
    { questId: 'skillshare-swap',      completedOnDay: null },
    { questId: 'green-space-tidy',     completedOnDay: null },
    { questId: 'check-in-call',        completedOnDay: null },
  ],
  pulseState: null,
  inventory: {
    materials: {},
    collectedScavengePoints: [],
  },
  crafting: {
    knownRecipes: [],
    mastery: {},
    craftedItems: {},
    collectedCookbookPoints: [],
  },
  housing: {
    currentFlatId: null,
    movedInOnDay: null,
    furniture: [],
    visitable: false,
  },
  world: {
    currentRegionId: 'REGION_COMMON_GROUND',
  },
  origin: {
    familyTemplateId: null,
  },
  worldQuests: {
    activeId: null,
    completedIds: [],
  },
  economy: {
    focusNode: null,
    contributionsToday: { day: 0, byNode: {} },
    salesToday: { day: 0, byItem: {} },
    starvingDays: 0,
    lastScrapsDay: null,
    breakdowns: 0,
    lastDayReport: null,
    endingSeen: false,
  },
  shop: { owned: [] },
  neighbourEvents: { lastDay: 0, seen: {}, pendingId: null },
  tutorial: { step: 0, done: false },
  district: {
    parcels: [],
    harvestedToday: { day: 0, types: [] },
  },
  milestones: {
    unlockedIds: [],
    unlockedAt: {},
  },
};

export const useGameStore = createStore<GameState>()(() => INITIAL_STATE);
