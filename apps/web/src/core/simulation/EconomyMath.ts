export const BUILD_COMPLETION_THRESHOLD = 100;

export type BuildProgressKey = 'kitchenProgress' | 'solarGridProgress' | 'legalFundProgress';

export interface BuildBuffState {
  kitchen: number;
  solar: number;
  legal: number;
}

export function computeResilienceScore(progress: Record<BuildProgressKey, number>): number {
  const total = Object.values(progress).reduce((sum, value) => sum + value, 0);
  const weighted = total / 3;
  return Math.min(100, Math.max(0, Math.round(weighted)));
}

export function getBuildBuffState(progress: Record<BuildProgressKey, number>): BuildBuffState {
  return {
    kitchen: progress.kitchenProgress >= BUILD_COMPLETION_THRESHOLD ? 12 : 0,
    solar: progress.solarGridProgress >= BUILD_COMPLETION_THRESHOLD ? 10 : 0,
    legal: progress.legalFundProgress >= BUILD_COMPLETION_THRESHOLD ? 8 : 0,
  };
}
