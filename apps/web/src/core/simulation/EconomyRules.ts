/**
 * Launch-readiness economy rules (docs/AUDIT-2026-09-29-LAUNCH-READINESS.md
 * §1 and §7.1). Every tunable number for earning and spending lives here so
 * `BalanceSimulator` and the unit tests pin the same values the game uses.
 *
 * Design rule: every repeatable way to earn costs energy, and energy only
 * comes back overnight. That bounds a day's income no matter how many times
 * an action is repeated, which is what closes the craft → sell and minigame
 * loops without adding hard daily caps (D1, D3).
 */
import type { Recipe } from './Recipes';

// ── Construction (build nodes) ──────────────────────────────────────────────

/** $ for 1% of a build node. */
export const CASH_PER_PCT = 10;
/** Energy (volunteer labour) for 1% of a build node. */
export const ENERGY_PER_PCT = 8;
/** A build crew can only absorb so much from one person per day. Stops a
 *  wealthy start (Arthur) from finishing a node on day 1. Base %, before the
 *  construction speed buff. */
export const DAILY_PLAYER_CONTRIBUTION_CAP_PCT = 10;

export interface ContributionState {
  currentPct: number;
  cash: number;
  energy: number;
  /** Base % this player already added to this node today. */
  contributedTodayPct: number;
  speedBuff: number;
}

export interface ContributionPlan {
  cashSpent: number;
  energySpent: number;
  /** % before the speed buff — what counts toward the daily cap. */
  basePct: number;
  /** % actually added to the node. */
  progressPct: number;
  cappedByDailyLimit: boolean;
  cappedByCompletion: boolean;
}

/** Works out exactly what a contribution will cost and add. Inputs are
 *  floored to whole non-negative numbers and limited to what the player
 *  holds; spending stops at 100% and at the daily cap (cash is used first). */
export function planContribution(
  state: ContributionState,
  request: { cash: number; energy: number },
): ContributionPlan {
  const whole = (v: number, max: number): number =>
    Number.isFinite(v) ? Math.max(0, Math.min(Math.floor(max), Math.floor(v))) : 0;
  const reqCash = whole(request.cash, state.cash);
  const reqEnergy = whole(request.energy, state.energy);

  const mult = 1 + Math.max(0, state.speedBuff);
  const remainingBase = Math.max(0, (100 - state.currentPct) / mult);
  const dailyLeft = Math.max(0, DAILY_PLAYER_CONTRIBUTION_CAP_PCT - state.contributedTodayPct);
  const allowedBase = Math.min(remainingBase, dailyLeft);

  const cashPct = Math.min(reqCash / CASH_PER_PCT, allowedBase);
  const cashSpent = Math.max(0, Math.min(reqCash, Math.ceil(cashPct * CASH_PER_PCT - 1e-9)));
  const energyPct = Math.min(reqEnergy / ENERGY_PER_PCT, allowedBase - cashPct);
  const energySpent = Math.max(0, Math.min(reqEnergy, Math.ceil(energyPct * ENERGY_PER_PCT - 1e-9)));

  const requestedBase = reqCash / CASH_PER_PCT + reqEnergy / ENERGY_PER_PCT;
  const basePct = cashPct + energyPct;
  return {
    cashSpent,
    energySpent,
    basePct,
    progressPct: Math.min(Math.max(0, 100 - state.currentPct), basePct * mult),
    cappedByDailyLimit: requestedBase > allowedBase && dailyLeft < remainingBase,
    cappedByCompletion: requestedBase > allowedBase && remainingBase <= dailyLeft,
  };
}

type NodeProgress = {
  kitchenProgress: number; solarGridProgress: number; legalFundProgress: number;
  toolLibraryProgress: number; landTrustProgress: number;
};

/** The Community Land Trust is the finale (it triggers the Safe Haven
 *  ending), so it opens only once the other four commons are built. */
export function isNodeLocked(node: keyof NodeProgress, commons: NodeProgress): boolean {
  if (node !== 'landTrustProgress') return false;
  return commons.kitchenProgress < 100 || commons.solarGridProgress < 100
    || commons.legalFundProgress < 100 || commons.toolLibraryProgress < 100;
}

/** Cap on the construction speed buff from solidarity choices and votes. */
export const MAX_BUILD_BUFF = 0.6;

/** Neighbours pitch in overnight on the player's focus build — collective
 *  action scaled by how much the district trusts the player. */
export const COMMUNITY_BASE_PCT = 1;
export const COMMUNITY_PCT_PER_20_TRUST = 0.5;

export function communityContributionPct(trust: number, speedBuff: number): number {
  const steps = Math.floor(Math.max(0, Math.min(100, trust)) / 20);
  return (COMMUNITY_BASE_PCT + steps * COMMUNITY_PCT_PER_20_TRUST) * (1 + Math.max(0, speedBuff));
}

// ── Earning ceilings ────────────────────────────────────────────────────────

/** No repeatable activity may earn more than this many $ per energy spent.
 *  Work pays 1.5–2 $/energy; crafting at max mastery may beat it a little. */
export const MAX_PROFIT_PER_ENERGY = 2.5;

export function craftEnergyCost(recipe: Recipe): number {
  if (recipe.tier === 'advanced') return 10;
  if (recipe.itemInputs || recipe.minMastery >= 2) return 8;
  return 4;
}

/** Local demand: each unit of the same item sold on the same day fetches
 *  15% less, down to a 40% floor. Demand recovers overnight. */
export function saleMultiplier(soldTodayOfItem: number): number {
  return Math.max(0.4, 1 - 0.15 * Math.max(0, soldTodayOfItem));
}

export const MINIGAME_LIMITS = {
  /** Charged by the host when a run starts; a run can't start below this. */
  energyCost: 10,
  maxCash: 20,
  maxTrust: 3,
  maxResilience: 2,
} as const;

export interface MinigameGrant {
  cashDelta: number;
  trustDelta: number;
  energyDelta: number;
  resilienceDelta: number;
}

/** Host-side normalisation of whatever a (possibly third-party) minigame
 *  plugin asks for. Plugins can only add, never take away, and never touch
 *  energy — the host already charged it at launch. */
export function clampMinigameGrant(requested: Partial<MinigameGrant>): MinigameGrant {
  const clamp = (v: number | undefined, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0;
  return {
    cashDelta: clamp(requested.cashDelta, MINIGAME_LIMITS.maxCash),
    trustDelta: clamp(requested.trustDelta, MINIGAME_LIMITS.maxTrust),
    energyDelta: 0,
    resilienceDelta: clamp(requested.resilienceDelta, MINIGAME_LIMITS.maxResilience),
  };
}
