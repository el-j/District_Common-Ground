import type { GameState, WorldQuestId, BuildNodeKey } from '../state/useGameStore';

/**
 * M35 — EPIC-31 §1/§2. A new, state-verified objective type, kept
 * deliberately separate from `IrlQuestSystem.ts` (which stays unmodified —
 * a fine, separate self-attested daily-buff mechanic, not being replaced;
 * naming here (`WorldQuest*`) was chosen specifically to avoid colliding
 * with that file's existing `QuestId`/`QuestState` types).
 *
 * Pure data + pure helpers only, no `useGameStore` import — mirrors
 * `HousingOptions.ts`/`Recipes.ts`'s own "simulation module has no store
 * dependency, `core/state/actions.ts` owns the wiring" split, and avoids a
 * circular import with `actions.ts` specifically: Section 2's own wording
 * ("directly advancing the associated `commons.*Progress` field") means a
 * quest's reward has to flow through the real `updateCommonsProgress()`,
 * which lives in `actions.ts` — so `actions.ts` importing this file (one
 * direction only) is the only shape that works without a cycle.
 */

// ── Section 1 — zone ↔ "level" reframing ────────────────────────────────────

/** The exact literal zone strings `WorldScene.updateZone()` already produces
 *  — reused here rather than re-derived, so this type can never drift from
 *  what the game actually reports. */
export type WorldZoneId =
  | 'North — Transit Hub'
  | 'Central Plaza'
  | 'South Quarter'
  | 'East Canal'
  | 'South Solar Quarter';

/**
 * Reuses the existing Commons build-node progress track as the game's
 * "level" structure — no new `level`/`chapter` field was added to
 * `GameState`; `commons.kitchenProgress` *is* the Community Kitchen
 * "level" progress, `commons.solarGridProgress` *is* the Solar Co-op
 * "level" progress, and so on. Documented explicitly here since it's a
 * reframing of existing state, not new state a future reader could
 * discover by grepping for a `level` field.
 *
 * Grounded in the real code, not narrative guesswork —
 * `WorldScene.create()`'s construction-node marker coordinates, read
 * against `WorldScene.updateZone()`'s own zone-boundary thresholds, place
 * each node inside exactly one zone: solar's marker (row 8) sits in
 * "North — Transit Hub"; legal/toolLibrary/landTrust's markers (rows
 * 31/30/36) all sit in "Central Plaza"; kitchen's marker (row 58) sits in
 * "South Quarter". Two zones needed an explicit decision, recorded rather
 * than left implicit:
 *  - "South Solar Quarter" has no construction-node marker of its own
 *    (solar's marker is physically up in the North zone) — mapped to
 *    `solarGridProgress` anyway because CLAUDE.md's own World Zones
 *    description places the Solar Co-op's actual payoff here (the
 *    completed solar field, the greenhouse garden node); the Solar Co-op
 *    "level" narratively spans both zones, so sharing one progress field
 *    between them is a deliberate choice, not an oversight.
 *  - "East Canal" has no construction node in or near it, and no zone lore
 *    ties it to one either — mapped to the aggregate `resilienceScore`
 *    instead of forcing an arbitrary, unrelated node onto it.
 */
export const ZONE_BUILD_NODE: Record<WorldZoneId, keyof GameState['commons']> = {
  'North — Transit Hub': 'solarGridProgress',
  'Central Plaza': 'legalFundProgress',
  'South Quarter': 'kitchenProgress',
  'East Canal': 'resilienceScore',
  'South Solar Quarter': 'solarGridProgress',
};

// ── Section 2 — location-verified objective type ────────────────────────────

/** The 3 kinds of real target this milestone's own doc names — every
 *  `WorldQuest` picks exactly one. Verification always reads real player/
 *  world state (position-derived zone, a completed dialogue interaction,
 *  or live `commons` progress), never a self-attested "Done" button — the
 *  core mechanical difference from `IrlQuestSystem`. */
export type WorldQuestTarget =
  | { kind: 'reach-zone'; zone: WorldZoneId }
  | { kind: 'talk-to-npc'; npcId: string }
  | { kind: 'build-node-threshold'; node: BuildNodeKey; threshold: number };

export interface WorldQuestReward {
  cashDelta?: number;
  energyDelta?: number;
  trustDelta?: number;
  stressDelta?: number;
  /** Section 2's "directly advancing the associated commons.*Progress
   *  field, where relevant" — applied via the real `updateCommonsProgress()`
   *  every build-node contribution already goes through, not a bespoke
   *  commons-mutation path (see `actions.ts`'s `completeActiveWorldQuest()`). */
  commonsBonusNode?: BuildNodeKey;
  commonsBonusAmount?: number;
}

export interface WorldQuestDefinition {
  id: WorldQuestId;
  title: string;
  description: string;
  icon: string;
  /** The NPC whose dialogue tree assigns this quest — Section 4's wiring
   *  point. Purely descriptive here (`actions.ts`/`NpcDialogues.ts` own the
   *  actual dialogue-node placement); kept on the definition so a future
   *  reader can see giver/target/reward in one place. */
  giverNpcId: string;
  target: WorldQuestTarget;
  reward: WorldQuestReward;
}

/**
 * 3 concrete `WorldQuest`s, one per target kind the doc names, each with a
 * real NPC giver and a real reward — proving the whole mechanism end to
 * end rather than building an exhaustive content set (matching this
 * project's established "prove the mechanism first" scoping, e.g. M44's
 * single placeholder region, M40's one flagged advanced-tier recipe).
 */
export const WORLD_QUEST_DEFINITIONS: WorldQuestDefinition[] = [
  {
    id: 'scout-the-transit-hub',
    title: 'Scout the Transit Hub',
    description: "Leo wants a read on what's really happening up at the Transit Hub before the next Town Hall vote.",
    icon: '🚉',
    giverNpcId: 'leo',
    target: { kind: 'reach-zone', zone: 'North — Transit Hub' },
    reward: { cashDelta: 15, energyDelta: 10 },
  },
  {
    id: 'deliver-higgins-letter',
    title: "Deliver Mrs. Higgins' Letter",
    description: "Bring Mrs. Higgins' old tenant covenant copy to Leo at the plaza — he needs it for the case.",
    icon: '✉️',
    giverNpcId: 'higgins',
    target: { kind: 'talk-to-npc', npcId: 'leo' },
    reward: { trustDelta: 15, stressDelta: -5 },
  },
  {
    id: 'fund-the-kitchen',
    title: "Fund the Kitchen's Final Stretch",
    description: "Help push the Community Kitchen & Fridge build node to the halfway mark.",
    icon: '🍲',
    giverNpcId: 'mira',
    target: { kind: 'build-node-threshold', node: 'kitchenProgress', threshold: 50 },
    reward: { cashDelta: 25, trustDelta: 10, commonsBonusNode: 'kitchenProgress', commonsBonusAmount: 5 },
  },
];

export function getWorldQuestDefinition(id: WorldQuestId): WorldQuestDefinition | undefined {
  return WORLD_QUEST_DEFINITIONS.find(q => q.id === id);
}
