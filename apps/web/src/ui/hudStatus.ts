import type { GameState, DayReport, BuildNodeKey } from '../core/state/useGameStore';
import { HIGH_STRESS, ROUGH_SLEEPING, STARVING, BREAKDOWN } from '../core/simulation/EconomyMath';

export const BUILD_NODE_LABELS: Record<BuildNodeKey, string> = {
  kitchenProgress: 'Community Kitchen',
  solarGridProgress: 'Solar Co-op',
  legalFundProgress: 'Legal Defense Fund',
  toolLibraryProgress: 'Tool Library',
  landTrustProgress: 'Land Trust',
};

/** Short HUD warnings for the consequences the economy now enforces
 *  (2026-09-29 launch audit, D2), most urgent first. */
export function statusWarnings(state: GameState): string[] {
  const out: string[] = [];
  const { player, economy, housing } = state;
  if (player.stressLevel >= 100) {
    out.push(`💥 Breaking point — you'll break down tonight and lose a day. Rest, feed Scraps or see friends.`);
  } else if (player.stressLevel >= HIGH_STRESS.threshold) {
    out.push(`😣 High stress — restless sleep tonight (−${HIGH_STRESS.regenPenalty}⚡).`);
  }
  if (economy.starvingDays > 0) {
    out.push(`🍞 Starving — you couldn't cover food/rent. Stress rises +${STARVING.stressPerDay}+ each night until you can.`);
  }
  if (!housing.currentFlatId) {
    out.push(`🛏 Sleeping rough — −${ROUGH_SLEEPING.regenPenalty}⚡ and +${ROUGH_SLEEPING.stressPerDay}% stress a night. Rent a room.`);
  }
  return out;
}

/** What happened overnight, as short lines for the morning toast. */
export function describeDayReport(report: DayReport): string[] {
  const out: string[] = [];
  if (report.breakdown) {
    out.push(`💥 You had a breakdown and lost a day recovering. Stress is back to ${BREAKDOWN.stressAfter}%, trust −${BREAKDOWN.trustLoss}.`);
  }
  if (report.starving && report.unpaid > 0) {
    out.push(`🍞 You couldn't cover $${report.unpaid} in food and rent — you went hungry.`);
  }
  if (report.communityNode && report.communityPct > 0) {
    const pct = Math.round(report.communityPct * 10) / 10;
    out.push(`🏘 Neighbours added +${pct}% to the ${BUILD_NODE_LABELS[report.communityNode]} overnight.`);
  }
  return out;
}
