import { describe, it, expect } from 'vitest';
import { manifest, register, geoWeatherPlugin } from './plugin';

describe('geo-weather kernel plugin', () => {
  it('exposes a manifest matching the standard kernel plugin shape', () => {
    expect(manifest.id).toBe('geo-weather');
    expect(geoWeatherPlugin.manifest).toBe(manifest);
  });

  it('register() is a no-op that resolves without a KernelContext', () => {
    expect(() => register()).not.toThrow();
  });
});
