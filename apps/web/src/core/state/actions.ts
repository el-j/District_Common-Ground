import {
  useGameStore, type ClassRole, type GameState, type PlacedFurniture,
  type GenderIdentity, type AppearanceToken, type WorldQuestId, type BuildNodeKey,
  type SettledDayReport, type DayStats,
} from './useGameStore';
import { saveToDB } from './persistence';
import { computeResilienceScore, settleDay, DEFAULT_MULTIPLIERS } from '../simulation/EconomyMath';
import {
  planContribution, communityContributionPct, craftEnergyCost, saleMultiplier, MINIGAME_LIMITS, MAX_BUILD_BUFF, isNodeLocked,
  type ContributionPlan,
} from '../simulation/EconomyRules';
import { initCrisisQueue, checkForCrisis } from '../simulation/CrisisEngine';
import { recordAction } from '../offline/offlineRuntime';
import { recordEconomicSnapshot } from '../../api/endpoints/district';
import { MATERIAL_PRICES, type MaterialToken } from '../simulation/Materials';
import {
  RECIPES, ITEM_DEFINITIONS, checkCraftEligibility, consumeRecipeInputs, consumeRecipeItemInputs, sellValueFor,
  type RecipeId, type ItemToken, type CraftFailureReason,
} from '../simulation/Recipes';
import { getHousingOption } from '../simulation/HousingOptions';
import { getFamilyTemplate, type FamilyTemplateId } from '../simulation/FamilyTemplates';
import { getWorldQuestDefinition } from '../simulation/WorldQuests';
import { evaluateMilestones, type MilestoneDefinition } from '../simulation/Milestones';

// Exported so BalanceSimulator.test.ts (M13) can start its solvency sweeps
// from the exact same per-archetype Day-1 numbers the real game seeds,
// instead of keeping a second hand-copied table that could drift out of
// sync — the production BalanceSimulator.ts itself takes an injected seed
// param and doesn't import this directly.
export const ARCHETYPE_SEEDS: Record<ClassRole, {
  cash: number;
  energy: number;
  maxEnergy: number;
  socialTrust: number;
  stressLevel: number;
}> = {
  pip:    { cash: 25,   energy: 80, maxEnergy: 100, socialTrust: 40, stressLevel: 60 },
  morgan: { cash: 240,  energy: 40, maxEnergy: 100, socialTrust: 25, stressLevel: 45 },
  arthur: { cash: 1200, energy: 65, maxEnergy: 100, socialTrust: 10, stressLevel: 30 },
};

export function setArchetype(role: ClassRole): void {
  useGameStore.setState(state => ({
    player: { ...state.player, classRole: role, ...ARCHETYPE_SEEDS[role] },
    meta: { ...state.meta, phase: 'playing' as const },
  }));
  initCrisisQueue();
}

// M49 — EPIC-36 §1/§3. The real origin-flow completion action, replacing
// CharacterSelect.ts's old setArchetype(role) call site (setArchetype()
// itself stays in the codebase unchanged — WorkSystem.ts/CrisisEngine.ts/
// TopHUD.ts/ShareModal.ts all still read player.classRole directly,
// confirmed by grep before this milestone touched anything). Seeds
// cash/energy/trust/stress from the chosen FamilyTemplate.startingStats
// directly (not ARCHETYPE_SEEDS[classRole] — see FamilyTemplates.ts's own
// doc comment for why that's the real change this milestone makes).
// classRole is derived from the template via a direct 1:1 lookup — the
// exact mapping this milestone's own Section 3 asked not to leave implicit.
export function beginFromFamilyTemplate(templateId: FamilyTemplateId): void {
  const template = getFamilyTemplate(templateId);
  if (!template) return;

  useGameStore.setState(state => ({
    origin: { ...state.origin, familyTemplateId: templateId },
    player: {
      ...state.player,
      classRole: template.classRole,
      cash: template.startingStats.cash,
      energy: template.startingStats.energy,
      maxEnergy: 100,
      socialTrust: template.startingStats.trust,
      stressLevel: template.startingStats.stress,
    },
    meta: { ...state.meta, phase: 'playing' as const },
  }));
  initCrisisQueue();
}

// M48 — EPIC-36 §1. Basic length/content sanitization only — no real-name
// requirement, no external validation, per this epic's own non-goals.
// Strips control characters and collapses whitespace so a name can't break
// DOM rendering or the save format; caps length generously (40 chars) so a
// dialogue/HUD name chip never overflows.
const MAX_NAME_LENGTH = 40;
export function sanitizePlayerName(raw: string): string {
  return raw
    // oxlint-disable-next-line eslint/no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function setPlayerName(name: string): void {
  useGameStore.setState(state => ({
    player: { ...state.player, name: sanitizePlayerName(name) },
  }));
}

export function setPlayerGender(gender: GenderIdentity, selfDescribe?: string): void {
  useGameStore.setState(state => ({
    player: {
      ...state.player,
      gender,
      genderSelfDescribe: gender === 'self-describe' ? sanitizePlayerName(selfDescribe ?? '') : undefined,
    },
  }));
}

export function setPlayerAppearance(appearance: AppearanceToken): void {
  useGameStore.setState(state => ({
    player: { ...state.player, appearance },
  }));
}

export function setRegionCode(regionCode: string): void {
  useGameStore.setState(state => ({
    meta: { ...state.meta, regionCode },
  }));
}

export function spendCash(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, cash: Math.max(0, state.player.cash - amount) },
  }));
}

export function gainCash(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, cash: state.player.cash + amount },
  }));
}

export function spendEnergy(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, energy: Math.max(0, state.player.energy - amount) },
  }));
}

export function regenEnergy(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, energy: Math.min(state.player.maxEnergy, state.player.energy + amount) },
  }));
}

export function addTrust(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, socialTrust: Math.min(100, state.player.socialTrust + amount) },
  }));
}

export function loseTrust(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, socialTrust: Math.max(0, state.player.socialTrust - amount) },
  }));
}

export function addStress(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, stressLevel: Math.min(100, state.player.stressLevel + amount) },
  }));
}

export function reduceStress(amount: number): void {
  useGameStore.setState(state => ({
    player: { ...state.player, stressLevel: Math.max(0, state.player.stressLevel - amount) },
  }));
}

/** Ends the day: settles income, food, rent, energy and stress (starving
 *  and breakdown included — see `settleDay()`), lets neighbours pitch in on
 *  the focus build, then rolls for a crisis and saves. Returns what
 *  happened overnight so the UI can explain it. */
export function advanceDay(): SettledDayReport {
  const statsOf = (p: GameState['player']): DayStats => ({ cash: p.cash, energy: p.energy, stress: p.stressLevel, trust: p.socialTrust });
  const statsBefore = statsOf(useGameStore.getState().player);
  let report: SettledDayReport = {
    day: 0, starving: false, unpaid: 0, breakdown: false, communityNode: null, communityPct: 0,
    lines: [], before: statsBefore, after: statsBefore,
  };
  useGameStore.setState(state => {
    const multipliers = state.pulseState?.multipliers ?? DEFAULT_MULTIPLIERS;
    // M43 §1 — recurring housing consequences, same "compute from state,
    // pass into the pure function" shape `commons` already uses.
    const housingOption = getHousingOption(state.housing.currentFlatId);
    const out = settleDay({
      classRole: state.player.classRole,
      cash: state.player.cash,
      energy: state.player.energy,
      maxEnergy: state.player.maxEnergy,
      stress: state.player.stressLevel,
      trust: state.player.socialTrust,
      starvingDays: state.economy.starvingDays,
      commons: state.commons,
      multipliers,
      housing: housingOption?.consequences ?? null,
      furnitureCount: housingOption ? state.housing.furniture.length : 0,
    });
    const day = state.meta.day + out.daysElapsed;
    report = { ...report, day, starving: out.starving, unpaid: out.unpaid, breakdown: out.breakdown, lines: out.lines };
    return {
      meta: { ...state.meta, day },
      player: {
        ...state.player,
        cash: out.cash,
        energy: out.energy,
        stressLevel: out.stress,
        socialTrust: Math.max(0, Math.min(100, state.player.socialTrust + out.trustDelta)),
      },
      economy: {
        ...state.economy,
        starvingDays: out.starvingDays,
        breakdowns: state.economy.breakdowns + (out.breakdown ? 1 : 0),
      },
    };
  });

  // Neighbours pitch in overnight on the focus build.
  const before = useGameStore.getState();
  const focus = before.economy.focusNode;
  if (focus && before.commons[focus] < 100) {
    const pct = Math.min(100 - before.commons[focus], communityContributionPct(before.player.socialTrust, before.commons.constructionSpeedBuff));
    updateCommonsProgress(focus, pct);
    report = { ...report, communityNode: focus, communityPct: pct };
  }
  report = { ...report, after: statsOf(useGameStore.getState().player) };
  useGameStore.setState(s => ({
    economy: {
      ...s.economy,
      focusNode: s.economy.focusNode && s.commons[s.economy.focusNode] >= 100 ? null : s.economy.focusNode,
      lastDayReport: report,
    },
  }));

  checkForCrisis();
  void saveToDB(useGameStore.getState());

  // M13 — fire-and-forget economic-attrition telemetry for the day that just
  // landed. Never blocks gameplay; a fresh archetype-less state (classRole
  // null, pre-character-select) is skipped rather than recorded as garbage.
  const after = useGameStore.getState();
  if (after.player.classRole) {
    recordEconomicSnapshot(after.meta.day, after.player.classRole, after.player.cash, after.player.energy);
  }
  checkMilestones();
  return report;
}

/** Crises, votes, minigames and District Builder parcels nudge resilience
 *  through this persisted modifier. The score itself is always recomputed
 *  (see `computeResilienceScore()`), so build contributions and these
 *  nudges can never overwrite each other again (audit §1.4). */
export const RESILIENCE_MODIFIER_LIMIT = 50;
export function adjustResilience(delta: number): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  useGameStore.setState(state => {
    const resilienceModifier = Math.max(-RESILIENCE_MODIFIER_LIMIT, Math.min(RESILIENCE_MODIFIER_LIMIT, state.commons.resilienceModifier + delta));
    const commons = { ...state.commons, resilienceModifier };
    return { commons: { ...commons, resilienceScore: computeResilienceScore(commons) } };
  });
}

/** Town Hall votes (and anything else) raise the construction speed buff
 *  through here, sharing the solidarity buff's cap. */
export function addBuildBuff(delta: number): void {
  useGameStore.setState(state => ({
    commons: { ...state.commons, constructionSpeedBuff: Math.max(0, Math.min(MAX_BUILD_BUFF, state.commons.constructionSpeedBuff + delta)) },
  }));
}

export type ContributionResult = { ok: boolean; plan: ContributionPlan; nodeJustCompleted: boolean };

/** The only way the player funds a build node: exact costs, no
 *  overcharging near 100%, whole numbers only, and a per-node daily cap
 *  (see `planContribution()`). The node becomes the neighbours' focus. */
export function contributeToNode(node: BuildNodeKey, request: { cash: number; energy: number }): ContributionResult {
  const state = useGameStore.getState();
  const day = state.meta.day;
  const today = state.economy.contributionsToday.day === day ? state.economy.contributionsToday.byNode : {};
  if (isNodeLocked(node, state.commons)) {
    return { ok: false, plan: planContribution({ currentPct: 100, cash: 0, energy: 0, contributedTodayPct: 0, speedBuff: 0 }, { cash: 0, energy: 0 }), nodeJustCompleted: false };
  }
  const plan = planContribution({
    currentPct: state.commons[node],
    cash: state.player.cash,
    energy: state.player.energy,
    contributedTodayPct: today[node] ?? 0,
    speedBuff: state.commons.constructionSpeedBuff,
  }, request);
  if (plan.progressPct <= 0) return { ok: false, plan, nodeJustCompleted: false };

  useGameStore.setState(s => ({
    player: { ...s.player, cash: s.player.cash - plan.cashSpent, energy: s.player.energy - plan.energySpent },
    economy: {
      ...s.economy,
      focusNode: node,
      contributionsToday: { day, byNode: { ...today, [node]: (today[node] ?? 0) + plan.basePct } },
    },
  }));
  const { nodeJustCompleted } = updateCommonsProgress(node, plan.progressPct);
  if (nodeJustCompleted) {
    useGameStore.setState(s => ({
      economy: { ...s.economy, focusNode: s.economy.focusNode === node ? null : s.economy.focusNode },
    }));
  }
  return { ok: true, plan, nodeJustCompleted };
}

/** Adds `amount` percentage points to a build node. Callers pass the final
 *  amount — any construction speed buff is applied by the caller
 *  (`contributeToNode()`, community help), not here. */
export function updateCommonsProgress(node: BuildNodeKey, amount: number): { nodeJustCompleted: boolean } {
  let recordedAmount = 0;
  let nodeJustCompleted = false;
  let landTrustJustRatified = false;
  let dayOfChange = 0;
  let resilienceAfter = 0;
  let trustAfter = 0;
  useGameStore.setState(state => {
    recordedAmount = amount;
    const wasNodeComplete = state.commons[node] >= 100;
    const wasLandTrustComplete = state.commons.landTrustProgress >= 100;
    const nextCommons: GameState['commons'] = {
      ...state.commons,
      [node]: Math.max(0, Math.min(100, state.commons[node] + amount)),
    };

    const resilienceScore = computeResilienceScore(nextCommons);

    // "Safe Haven" ending: unlocks once, the moment the Community Land Trust
    // (node E) first reaches 100% — see EPIC-11 Test 11.2.
    const safeHavenUnlocked = state.commons.safeHavenUnlocked
      || (node === 'landTrustProgress' && !wasLandTrustComplete && nextCommons.landTrustProgress >= 100);

    nodeJustCompleted = !wasNodeComplete && nextCommons[node] >= 100;
    landTrustJustRatified = !state.commons.safeHavenUnlocked && safeHavenUnlocked;
    dayOfChange = state.meta.day;
    resilienceAfter = resilienceScore;
    trustAfter = state.player.socialTrust;

    return {
      commons: {
        ...nextCommons,
        resilienceScore,
        safeHavenUnlocked,
      },
    };
  });
  // M18 — records this contribution as a PN-Counter delta so it merges
  // additively with the same node's contributions from this player's other
  // devices (see CRDTSyncEngine.mergePnCounter). Never blocks gameplay.
  recordAction('COMMONS_RESOURCE_CONTRIBUTION', { node, amount: recordedAmount });

  // M13 — zero-PII civic telemetry, riding the same local signed event log.
  // Field names deviate deliberately from the planning doc's illustrative
  // ones (`daysToComplete` -> `completedOnDay`, `totalDonationsCash`/
  // `energySpent` -> `contributionAmount`): per-node cumulative totals and a
  // "day this node's build started" timestamp aren't tracked anywhere in
  // GameState today, and adding them just to match the spec's exact field
  // names would be new state for its own sake — see EPIC-13's scope notes.
  if (nodeJustCompleted) {
    recordAction('COMMONS_MILESTONE', { node, completedOnDay: dayOfChange, contributionAmount: recordedAmount });
  }
  if (landTrustJustRatified) {
    recordAction('LAND_TRUST_RATIFIED', {
      completedOnDay: dayOfChange,
      globalResilience: resilienceAfter,
      playerTrustScore: trustAfter,
    });
  }

  // M23 §2 — callers (e.g. ConstructionModal) use this to decide whether to
  // fire the existing celebration chime/particles; a partial contribution
  // must not trigger them.
  const result = { nodeJustCompleted };
  // M35 — EPIC-31 §2. Reads the just-applied fresh value straight off the
  // store (not the local `nextCommons` closure above) so this can never
  // drift from what actually landed, and runs on every contribution
  // regardless of source (ConstructionModal, a WorldQuest's own bonus
  // reward, anything future) — the single real hook point for "build-node
  // milestone to complete" verification.
  checkBuildNodeWorldQuestProgress(node);
  return result;
}

// ── M35 — EPIC-31 §2/§3/§4. Real, state-verified WorldQuest wiring ─────────
//
// `WorldQuests.ts` holds the pure data (definitions/targets/rewards) and
// has no store dependency, specifically so it can be imported here without
// a cycle — Section 2's "directly advancing the associated commons.*
// Progress field" reward means completion has to call the real
// `updateCommonsProgress()` above, which lives in this file.

/** Section 4 — fired the moment a quest-giving dialogue node renders
 *  (`WorldScene.openTalk()`'s `onAssignQuest` callback), mirroring M39's
 *  `teachesRecipe`/`onTeach` idempotency exactly: a repeat visit to the
 *  same node is harmless. Refuses to stomp an already-active or
 *  already-completed quest — only one `WorldQuest` is ever active at a
 *  time (Section 3's single objective-chip design), so picking up a new
 *  one while another is in progress is a no-op, not a silent replace. */
export function assignWorldQuest(id: WorldQuestId): void {
  const state = useGameStore.getState();
  if (state.worldQuests.activeId !== null || state.worldQuests.completedIds.includes(id)) return;
  useGameStore.setState({ worldQuests: { ...state.worldQuests, activeId: id } });
}

/** Frees the single quest slot without completing the quest (audit §1.6:
 *  Mira's kitchen quest used to lock every other quest for hundreds of
 *  days with no way out). The quest can be picked up again later. */
export function abandonWorldQuest(): void {
  useGameStore.setState(state => ({ worldQuests: { ...state.worldQuests, activeId: null } }));
}

/** Applies a WorldQuest's reward the same way `IrlQuestSystem.completeQuest()`
 *  applies its own — a direct `setState` for player stats — plus, when the
 *  definition carries one, a real `updateCommonsProgress()` call for the
 *  commons bonus (never a bespoke second commons-mutation path). */
function completeActiveWorldQuest(): void {
  const state = useGameStore.getState();
  const id = state.worldQuests.activeId;
  if (!id) return;
  const def = getWorldQuestDefinition(id);
  if (!def) return;

  useGameStore.setState(s => ({
    worldQuests: { activeId: null, completedIds: [...s.worldQuests.completedIds, id] },
  }));
  const { reward } = def;
  useGameStore.setState(s => ({
    player: {
      ...s.player,
      cash: s.player.cash + (reward.cashDelta ?? 0),
      energy: Math.max(0, Math.min(s.player.maxEnergy, s.player.energy + (reward.energyDelta ?? 0))),
      socialTrust: Math.max(0, Math.min(100, s.player.socialTrust + (reward.trustDelta ?? 0))),
      stressLevel: Math.max(0, Math.min(100, s.player.stressLevel + (reward.stressDelta ?? 0))),
    },
  }));
  // Deliberately after `activeId` is already cleared above — if this bonus
  // itself pushes another node past its own quest's threshold, the
  // recursive checkBuildNodeWorldQuestProgress() call below finds no
  // active quest left and safely no-ops, rather than looping.
  if (reward.commonsBonusNode && reward.commonsBonusAmount) {
    updateCommonsProgress(reward.commonsBonusNode, reward.commonsBonusAmount);
  }
}

/** Section 2 — `WorldScene.updateZone()`'s own real per-frame zone string,
 *  passed straight through; never a self-attested "I'm here" claim. */
export function checkZoneWorldQuestProgress(zone: string): void {
  const state = useGameStore.getState();
  const def = state.worldQuests.activeId ? getWorldQuestDefinition(state.worldQuests.activeId) : undefined;
  if (def?.target.kind === 'reach-zone' && def.target.zone === zone) completeActiveWorldQuest();
}

/** Section 2 — called from `WorldScene.openTalk()`'s `DialogueOverlay`
 *  `onClose`, i.e. once the player has actually finished (not just opened)
 *  a conversation with this NPC — a real completed interaction, not a
 *  self-attested claim. */
export function checkTalkWorldQuestProgress(npcId: string): void {
  const state = useGameStore.getState();
  const def = state.worldQuests.activeId ? getWorldQuestDefinition(state.worldQuests.activeId) : undefined;
  if (def?.target.kind === 'talk-to-npc' && def.target.npcId === npcId) completeActiveWorldQuest();
}

function checkBuildNodeWorldQuestProgress(node: BuildNodeKey): void {
  const state = useGameStore.getState();
  const def = state.worldQuests.activeId ? getWorldQuestDefinition(state.worldQuests.activeId) : undefined;
  if (def?.target.kind !== 'build-node-threshold' || def.target.node !== node) return;
  if (Number(state.commons[node]) >= def.target.threshold) completeActiveWorldQuest();
}

/**
 * Evaluates state against all defined civic milestones and unlocks any newly
 * satisfied ones, awarding bonuses.
 */
export function checkMilestones(): MilestoneDefinition[] {
  const state = useGameStore.getState();
  const unlocked = evaluateMilestones(state, state.milestones?.unlockedIds ?? []);
  if (unlocked.length === 0) return [];

  const now = Date.now();
  const newIds = unlocked.map(m => m.id);
  const newAt: Record<string, number> = {};
  newIds.forEach(id => { newAt[id] = now; });

  let totalCash = 0;
  let totalTrust = 0;
  let totalEnergy = 0;

  unlocked.forEach(m => {
    if (m.reward?.cashDelta) totalCash += m.reward.cashDelta;
    if (m.reward?.trustDelta) totalTrust += m.reward.trustDelta;
    if (m.reward?.energyDelta) totalEnergy += m.reward.energyDelta;
  });

  useGameStore.setState(s => ({
    milestones: {
      unlockedIds: [...(s.milestones?.unlockedIds ?? []), ...newIds],
      unlockedAt: { ...s.milestones?.unlockedAt, ...newAt },
    },
    player: {
      ...s.player,
      cash: s.player.cash + totalCash,
      socialTrust: Math.max(0, Math.min(100, s.player.socialTrust + totalTrust)),
      energy: Math.max(0, Math.min(s.player.maxEnergy, s.player.energy + totalEnergy)),
    },
  }));

  return unlocked;
}

// M38 §2 — EPIC-33 §1. Called with a specific pickup's own material/amount
// (rather than looking up ScavengePoints.ts itself) so this stays a plain
// data-in function: `world/` depends on `core/`, never the other way
// around, matching every other layer boundary in this codebase. `pointId`
// is idempotency-guarded here so a duplicate call (e.g. a double keypress
// racing the sprite-destroy) can never double-grant the same pickup.
export function collectMaterial(pointId: string, material: MaterialToken, amount: number): void {
  useGameStore.setState(state => {
    if (state.inventory.collectedScavengePoints.includes(pointId)) return {};
    return {
      inventory: {
        materials: {
          ...state.inventory.materials,
          [material]: (state.inventory.materials[material] ?? 0) + amount,
        },
        collectedScavengePoints: [...state.inventory.collectedScavengePoints, pointId],
      },
    };
  });
}

// M42 §2 — EPIC-34. Closes M38 §3's MATERIAL_PRICES forward dependency: a
// real Baumarkt/Supermarket buy flow, spending cash via the same
// Math.max(0, ...) floor spendCash() already uses. Rejects a purchase the
// player can't afford instead of letting cash go negative.
export function buyMaterial(material: MaterialToken, amount: number): { ok: boolean; cost?: number } {
  let result: { ok: boolean; cost?: number } = { ok: false };
  useGameStore.setState(state => {
    const cost = MATERIAL_PRICES[material] * amount;
    if (state.player.cash < cost) return {};
    result = { ok: true, cost };
    return {
      player: { ...state.player, cash: state.player.cash - cost },
      inventory: {
        ...state.inventory,
        materials: { ...state.inventory.materials, [material]: (state.inventory.materials[material] ?? 0) + amount },
      },
    };
  });
  return result;
}

// M39 §1/§2 — EPIC-33. Idempotent per recipe id (learning an already-known
// recipe twice, e.g. re-visiting a taught-by-NPC dialogue node, is a no-op).
export function learnRecipe(recipeId: RecipeId): void {
  useGameStore.setState(state => {
    if (state.crafting.knownRecipes.includes(recipeId)) return {};
    return {
      crafting: { ...state.crafting, knownRecipes: [...state.crafting.knownRecipes, recipeId] },
    };
  });
}

// M39 §2. Mirrors collectMaterial()'s shape exactly (explicit params rather
// than importing CookbookPickups.ts, same world/ -> core/ layer direction;
// idempotent per point id).
export function collectCookbook(pointId: string, recipeId: RecipeId): void {
  useGameStore.setState(state => {
    if (state.crafting.collectedCookbookPoints.includes(pointId)) return {};
    const knownRecipes = state.crafting.knownRecipes.includes(recipeId)
      ? state.crafting.knownRecipes
      : [...state.crafting.knownRecipes, recipeId];
    return {
      crafting: {
        ...state.crafting,
        knownRecipes,
        collectedCookbookPoints: [...state.crafting.collectedCookbookPoints, pointId],
      },
    };
  });
}

// M39 §3. Pure eligibility check (Recipes.ts) first, then a single mutation
// if eligible — mirrors updateCommonsProgress()'s "compute inside setState,
// return a small result object for the caller" shape. Mastery is capped at
// 10 (same 0-100-style bound style as socialTrust/stressLevel, just a
// smaller scale since there are only 6 disciplines' worth of progression).
export function craftRecipe(recipeId: RecipeId, atStation = false): { ok: boolean; reason?: CraftFailureReason } {
  let result: { ok: boolean; reason?: CraftFailureReason } = { ok: false, reason: 'unknown-recipe' };
  useGameStore.setState(state => {
    const recipe = RECIPES[recipeId];
    const mastery = state.crafting.mastery[recipe.discipline] ?? 0;
    const check = checkCraftEligibility(
      recipe, state.crafting.knownRecipes, state.inventory.materials, mastery, atStation, state.crafting.craftedItems,
    );
    result = check;
    if (!check.ok) return {};
    const energyCost = craftEnergyCost(recipe);
    if (state.player.energy < energyCost) {
      result = { ok: false, reason: 'too-tired' };
      return {};
    }

    const nextMaterials = consumeRecipeInputs(recipe, state.inventory.materials);
    // M40 §3 — deep-chain recipes (e.g. the radio consuming basic tools, the
    // computer consuming a radio + circuit board) also spend crafted items,
    // not just raw materials; consumeRecipeItemInputs() is a no-op for every
    // M39 recipe (none declare itemInputs).
    const nextCraftedAfterInputs = consumeRecipeItemInputs(recipe, state.crafting.craftedItems);
    const nextMastery = Math.min(10, mastery + 1);
    const nextCraftedCount = (nextCraftedAfterInputs[recipe.output] ?? 0) + 1;

    return {
      player: { ...state.player, energy: state.player.energy - energyCost },
      inventory: { ...state.inventory, materials: nextMaterials },
      crafting: {
        ...state.crafting,
        mastery: { ...state.crafting.mastery, [recipe.discipline]: nextMastery },
        craftedItems: { ...nextCraftedAfterInputs, [recipe.output]: nextCraftedCount },
      },
    };
  });
  return result;
}

export type SellFailureReason = 'not-sellable' | 'none-held';

/** What one sale of `item` would pay right now (mastery × local demand). */
export function currentSellValue(item: ItemToken): number {
  const state = useGameStore.getState();
  const def = ITEM_DEFINITIONS[item];
  const soldToday = state.economy.salesToday.day === state.meta.day ? state.economy.salesToday.byItem : {};
  return Math.round(sellValueFor(item, state.crafting.mastery[def.discipline] ?? 0) * saleMultiplier(soldToday[item] ?? 0));
}

// M40 §2. Mirrors M24's once-per-item "Work" action precedent — a direct,
// player-initiated conversion, paid as ordinary cash (no new currency).
// Sell value scales with the *selling* discipline's current mastery, same
// discipline ITEM_DEFINITIONS records for the item (see Recipes.ts).
export function sellItem(item: ItemToken): { ok: boolean; reason?: SellFailureReason; amount?: number } {
  let result: { ok: boolean; reason?: SellFailureReason; amount?: number } = { ok: false, reason: 'none-held' };
  useGameStore.setState(state => {
    const def = ITEM_DEFINITIONS[item];
    if (!def.kinds.includes('sellable')) { result = { ok: false, reason: 'not-sellable' }; return {}; }
    const held = state.crafting.craftedItems[item] ?? 0;
    if (held <= 0) { result = { ok: false, reason: 'none-held' }; return {}; }

    const mastery = state.crafting.mastery[def.discipline] ?? 0;
    const day = state.meta.day;
    const soldToday = state.economy.salesToday.day === day ? state.economy.salesToday.byItem : {};
    const alreadySold = soldToday[item] ?? 0;
    const amount = Math.round(sellValueFor(item, mastery) * saleMultiplier(alreadySold));
    result = { ok: true, amount };

    return {
      player: { ...state.player, cash: state.player.cash + amount },
      crafting: { ...state.crafting, craftedItems: { ...state.crafting.craftedItems, [item]: held - 1 } },
      economy: { ...state.economy, salesToday: { day, byItem: { ...soldToday, [item]: alreadySold + 1 } } },
    };
  });
  return result;
}

// M43 §1 — EPIC-34, absorbing EPIC-32's M36 scope. Switching flats never
// clears `housing.furniture` — see PlacedFurniture's doc comment
// (useGameStore.ts) for why that's a deliberate resolution of EPIC-32's
// open "keyed by flat id vs. single current-flat state" question.
export function rentFlat(housingOptionId: string): void {
  useGameStore.setState(state => ({
    housing: { ...state.housing, currentFlatId: housingOptionId, movedInOnDay: state.meta.day },
  }));
}

export function moveOut(): void {
  useGameStore.setState(state => ({
    housing: { ...state.housing, currentFlatId: null, movedInOnDay: null },
  }));
}

// M54 — EPIC-38 §1. Opt-in only — never toggled true by anything but a
// direct player action in SettingsModal.ts.
export function setHousingVisitable(visitable: boolean): void {
  useGameStore.setState(state => ({
    housing: { ...state.housing, visitable },
  }));
}

export type FurnitureFailureReason = 'not-furniture' | 'none-held' | 'slot-occupied';

// M43 §2/§3. Placing furniture consumes one from the player's crafted
// inventory (M40) — the same "spend a real resource" shape craftRecipe()
// already uses — rather than a free fixed-catalog pick, per this
// milestone's own upgrade over EPIC-32's original plan.
export function placeFurniture(item: ItemToken, slotIndex: number): { ok: boolean; reason?: FurnitureFailureReason } {
  let result: { ok: boolean; reason?: FurnitureFailureReason } = { ok: false, reason: 'not-furniture' };
  useGameStore.setState(state => {
    if (!ITEM_DEFINITIONS[item].kinds.includes('furniture')) { result = { ok: false, reason: 'not-furniture' }; return {}; }
    const held = state.crafting.craftedItems[item] ?? 0;
    if (held <= 0) { result = { ok: false, reason: 'none-held' }; return {}; }
    if (state.housing.furniture.some(f => f.slotIndex === slotIndex)) { result = { ok: false, reason: 'slot-occupied' }; return {}; }

    const instanceId = `furn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const placed: PlacedFurniture = { instanceId, item, slotIndex };
    result = { ok: true };
    return {
      crafting: { ...state.crafting, craftedItems: { ...state.crafting.craftedItems, [item]: held - 1 } },
      housing: { ...state.housing, furniture: [...state.housing.furniture, placed] },
    };
  });
  return result;
}

// M43 §2. Removing a placed piece gives the crafted item back (still
// owned, just uninstalled) rather than destroying it.
export function removeFurniture(instanceId: string): void {
  useGameStore.setState(state => {
    const entry = state.housing.furniture.find(f => f.instanceId === instanceId);
    if (!entry) return {};
    const held = state.crafting.craftedItems[entry.item] ?? 0;
    return {
      crafting: { ...state.crafting, craftedItems: { ...state.crafting.craftedItems, [entry.item]: held + 1 } },
      housing: { ...state.housing, furniture: state.housing.furniture.filter(f => f.instanceId !== instanceId) },
    };
  });
}

// M44 — EPIC-35 §2. `regionId` stays a plain `string` param here (not
// `world/regions/RegionData.ts`'s `RegionId`) for the same layering reason
// `world.currentRegionId` itself does — `RegionScene.ts`/`WorldScene.ts`
// (both in `world/`) are the callers, and they already know the real type.
export function travelToRegion(regionId: string): void {
  useGameStore.setState(state => ({
    world: { ...state.world, currentRegionId: regionId },
  }));
}


/** Scraps the cat: $1 for a treat, a little stress relief, once a day. */
export const SCRAPS_STRESS_RELIEF = 3;
export function feedScraps(): boolean {
  const state = useGameStore.getState();
  if (state.player.cash < 1 || state.economy.lastScrapsDay === state.meta.day) return false;
  useGameStore.setState(s => ({
    player: { ...s.player, cash: s.player.cash - 1, stressLevel: Math.max(0, s.player.stressLevel - SCRAPS_STRESS_RELIEF) },
    economy: { ...s.economy, lastScrapsDay: s.meta.day },
  }));
  return true;
}

/** Charges a minigame run's energy before it starts (audit §1.3: runs used
 *  to be free at 0 energy). Rewards are capped by `HostPlatformAPI`. */
export function startMinigameRun(): { ok: true } | { ok: false; reason: 'too-tired' } {
  const state = useGameStore.getState();
  if (state.player.energy < MINIGAME_LIMITS.energyCost) return { ok: false, reason: 'too-tired' };
  spendEnergy(MINIGAME_LIMITS.energyCost);
  return { ok: true };
}

/** Commons Bazaar ownership, as reported by the server. */
export function setOwnedShopItems(ids: readonly string[]): void {
  useGameStore.setState(state => ({ shop: { ...state.shop, owned: [...new Set(ids)] } }));
}
