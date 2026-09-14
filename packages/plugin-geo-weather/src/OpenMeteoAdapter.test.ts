import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as idbKeyval from 'idb-keyval';

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key)),
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    __store: store,
  };
});

import { fetchWeather, offlineSeasonalWeather, OPEN_METEO_ENDPOINT } from './OpenMeteoAdapter';

function mockOkResponse(current: Record<string, number>) {
  return { ok: true, json: async () => ({ current }) } as Response;
}

describe('OpenMeteoAdapter', () => {
  beforeEach(() => {
    (idbKeyval as unknown as { __store: Map<string, unknown> }).__store.clear();
    vi.restoreAllMocks();
  });

  it('parses a live Open-Meteo response into a WeatherReading', async () => {
    const fetchImpl = vi.fn(async () => mockOkResponse({
      temperature_2m: -5,
      apparent_temperature: -8,
      precipitation: 4.2,
      snowfall: 0,
      cloud_cover: 90,
      wind_speed_10m: 22,
    }));

    const reading = await fetchWeather(52.5, 13.4, fetchImpl as unknown as typeof fetch);
    expect(reading.source).toBe('live');
    expect(reading.temperatureC).toBe(-5);
    expect(reading.precipitationMm).toBe(4.2);
    expect(reading.isRaining).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining(OPEN_METEO_ENDPOINT));
  });

  it('reuses the cached reading for the same coordinate within the 1h TTL instead of re-fetching', async () => {
    const fetchImpl = vi.fn(async () => mockOkResponse({ temperature_2m: 18, cloud_cover: 20, wind_speed_10m: 5, precipitation: 0, snowfall: 0 }));
    await fetchWeather(40.0, -74.0, fetchImpl as unknown as typeof fetch);
    await fetchWeather(40.0, -74.0, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('falls back to the offline seasonal estimate when the network request rejects', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    const reading = await fetchWeather(51.5, -0.1, fetchImpl as unknown as typeof fetch, new Date('2026-06-21T00:00:00Z'));
    expect(reading.source).toBe('offline-sample');
  });

  it('falls back to the offline seasonal estimate on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) } as Response));
    const reading = await fetchWeather(51.5, -0.1, fetchImpl as unknown as typeof fetch);
    expect(reading.source).toBe('offline-sample');
  });

  it('offline seasonal estimate never throws and stays within a plausible temperature band', () => {
    for (const lat of [-80, -30, 0, 30, 80]) {
      const reading = offlineSeasonalWeather(new Date('2026-01-15T00:00:00Z'), lat);
      expect(reading.temperatureC).toBeGreaterThan(-40);
      expect(reading.temperatureC).toBeLessThan(45);
      expect(reading.source).toBe('offline-sample');
    }
  });
});
