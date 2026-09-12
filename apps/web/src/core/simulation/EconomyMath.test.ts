import { describe, it, expect } from 'vitest';
import { computeResilienceScore, getBuildBuffState } from './EconomyMath';

describe('computeResilienceScore', () => {
  it('returns 0 when all progress is 0', () => {
    expect(computeResilienceScore({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0 })).toBe(0);
  });

  it('returns 100 when all progress is 100', () => {
    expect(computeResilienceScore({ kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 })).toBe(100);
  });

  it('clamps to 0 for negative values', () => {
    expect(computeResilienceScore({ kitchenProgress: -10, solarGridProgress: 0, legalFundProgress: 0 })).toBe(0);
  });

  it('clamps to 100 for values exceeding 100', () => {
    expect(computeResilienceScore({ kitchenProgress: 200, solarGridProgress: 200, legalFundProgress: 200 })).toBe(100);
  });
});

describe('getBuildBuffState', () => {
  it('returns zero buffs when nothing is built', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 0 });
    expect(buf.kitchen).toBe(0);
    expect(buf.solar).toBe(0);
    expect(buf.legal).toBe(0);
  });

  it('returns kitchen buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 100, solarGridProgress: 0, legalFundProgress: 0 });
    expect(buf.kitchen).toBe(12);
    expect(buf.solar).toBe(0);
    expect(buf.legal).toBe(0);
  });

  it('returns solar buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 100, legalFundProgress: 0 });
    expect(buf.solar).toBe(10);
  });

  it('returns legal buff at threshold', () => {
    const buf = getBuildBuffState({ kitchenProgress: 0, solarGridProgress: 0, legalFundProgress: 100 });
    expect(buf.legal).toBe(8);
  });

  it('returns all buffs when fully built', () => {
    const buf = getBuildBuffState({ kitchenProgress: 100, solarGridProgress: 100, legalFundProgress: 100 });
    expect(buf.kitchen).toBe(12);
    expect(buf.solar).toBe(10);
    expect(buf.legal).toBe(8);
  });
});
