import { describe, it, expect } from 'vitest';
import { resilienceTier, dressingTierFor, dressingPropsForTier } from './ResilienceDressing';

describe('resilienceTier', () => {
  it('matches the exact thresholds WorldScene.applyResilienceTier used', () => {
    expect(resilienceTier(0)).toBe('emergency');
    expect(resilienceTier(14)).toBe('emergency');
    expect(resilienceTier(15)).toBe('crisis');
    expect(resilienceTier(29)).toBe('crisis');
    expect(resilienceTier(30)).toBe('stabilising');
    expect(resilienceTier(59)).toBe('stabilising');
    expect(resilienceTier(60)).toBe('thriving');
    expect(resilienceTier(100)).toBe('thriving');
  });
});

describe('dressingTierFor / dressingPropsForTier (Test 21.4)', () => {
  it('maps crisis and emergency to Grim Squeeze', () => {
    expect(dressingTierFor(5)).toBe('grimSqueeze');
    expect(dressingTierFor(20)).toBe('grimSqueeze');
  });

  it('maps stabilising to Organizing and thriving to Flourishing Commons', () => {
    expect(dressingTierFor(45)).toBe('organizing');
    expect(dressingTierFor(80)).toBe('flourishingCommons');
  });

  it('Grim Squeeze includes a boarded-window prop that Flourishing Commons does not', () => {
    const grim = dressingPropsForTier('grimSqueeze').map(p => p.token);
    const flourishing = dressingPropsForTier('flourishingCommons').map(p => p.token);
    expect(grim).toContain('PROP_BOARDED_WINDOW');
    expect(flourishing).not.toContain('PROP_BOARDED_WINDOW');
  });

  it('Flourishing Commons includes a flower-planter prop that Grim Squeeze does not', () => {
    const grim = dressingPropsForTier('grimSqueeze').map(p => p.token);
    const flourishing = dressingPropsForTier('flourishingCommons').map(p => p.token);
    expect(flourishing).toContain('PROP_FLOWER_PLANTER');
    expect(grim).not.toContain('PROP_FLOWER_PLANTER');
  });

  it('every dressing tier returns at least one prop', () => {
    expect(dressingPropsForTier('grimSqueeze').length).toBeGreaterThan(0);
    expect(dressingPropsForTier('organizing').length).toBeGreaterThan(0);
    expect(dressingPropsForTier('flourishingCommons').length).toBeGreaterThan(0);
  });
});
