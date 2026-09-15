import { describe, it, expect } from 'vitest';
import { weatherTier } from './WeatherSystem';

describe('weatherTier', () => {
  it('returns frost below the cold-snap threshold', () => {
    expect(weatherTier(0.4)).toBe('frost');
    expect(weatherTier(0.64)).toBe('frost');
  });

  it('returns none in the temperate mid-range', () => {
    expect(weatherTier(0.65)).toBe('none');
    expect(weatherTier(1.0)).toBe('none');
    expect(weatherTier(1.2)).toBe('none');
  });

  it('returns rain above the heat-spike threshold', () => {
    expect(weatherTier(1.21)).toBe('rain');
    expect(weatherTier(1.5)).toBe('rain');
  });

  it('covers the full clamp range from economy.go without throwing', () => {
    for (let h = 0.4; h <= 1.5; h += 0.05) {
      expect(['none', 'rain', 'frost']).toContain(weatherTier(h));
    }
  });
});
