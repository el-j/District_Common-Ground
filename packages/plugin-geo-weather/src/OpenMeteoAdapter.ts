// M17 — Live hyper-local weather via Open-Meteo (free, no API key). Caches
// the last successful fetch for an hour in IndexedDB (mirrors GeoCache.ts's
// convention) and falls back to an offline sinusoidal seasonal estimate when
// the network is unreachable, so the game never blocks on connectivity.
import { get, set } from 'idb-keyval';

export interface WeatherReading {
  temperatureC: number;
  apparentTempC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  isRaining: boolean;
  isSnowing: boolean;
  source: 'live' | 'offline-sample';
}

interface CachedWeather {
  reading: WeatherReading;
  fetchedAt: number;
}

const CACHE_PREFIX = 'district-cg-weather-';
const CACHE_TTL_MS = 60 * 60 * 1000;
export const OPEN_METEO_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

function weatherCacheKey(lat: number, lon: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}`;
}

/** A plausible, dependency-free seasonal estimate used only when the live API is unreachable. */
export function offlineSeasonalWeather(date: Date, latDeg: number): WeatherReading {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(Date.UTC(date.getUTCFullYear(), 0, 0)).getTime()) / 86_400_000,
  );
  const hemisphereShift = latDeg < 0 ? 182.5 : 0; // flip the curve south of the equator
  const seasonalPhase = ((dayOfYear + hemisphereShift - 172) / 365.25) * 2 * Math.PI; // peak ~ Jun 21
  const latitudeAmplitude = 8 + Math.min(20, Math.abs(latDeg) * 0.35);
  const baseTemp = 14 - Math.abs(latDeg) * 0.15;
  const temperatureC = baseTemp + latitudeAmplitude * Math.cos(seasonalPhase);

  return {
    temperatureC,
    apparentTempC: temperatureC,
    precipitationMm: 0,
    cloudCoverPct: 40,
    windSpeedKmh: 10,
    isRaining: false,
    isSnowing: false,
    source: 'offline-sample',
  };
}

function parseOpenMeteoResponse(json: unknown): WeatherReading {
  const current = (json as { current?: Record<string, number> })?.current;
  if (!current) {
    throw new Error('Open-Meteo response missing "current" block');
  }
  const precipitationMm = current['precipitation'] ?? 0;
  const snowfallCm = current['snowfall'] ?? 0;
  return {
    temperatureC: current['temperature_2m'] ?? 0,
    apparentTempC: current['apparent_temperature'] ?? current['temperature_2m'] ?? 0,
    precipitationMm,
    cloudCoverPct: current['cloud_cover'] ?? 0,
    windSpeedKmh: current['wind_speed_10m'] ?? 0,
    isRaining: precipitationMm > 0 && snowfallCm === 0,
    isSnowing: snowfallCm > 0,
    source: 'live',
  };
}

async function readCache(key: string): Promise<WeatherReading | undefined> {
  try {
    const cached = await get<CachedWeather>(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.reading;
    }
  } catch {
    // IndexedDB unavailable — fall through to a live/offline fetch.
  }
  return undefined;
}

async function writeCache(key: string, reading: WeatherReading): Promise<void> {
  try {
    await set(key, { reading, fetchedAt: Date.now() } satisfies CachedWeather);
  } catch {
    // Non-fatal: caching is a performance optimization, not a correctness requirement.
  }
}

/** Fetches current weather for a coordinate, using the 1h cache and an offline seasonal fallback on any failure. */
export async function fetchWeather(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<WeatherReading> {
  const key = weatherCacheKey(lat, lon);
  const cached = await readCache(key);
  if (cached) return cached;

  try {
    const url = `${OPEN_METEO_ENDPOINT}?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,snowfall,cloud_cover,wind_speed_10m`;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo request failed: ${response.status}`);
    }
    const reading = parseOpenMeteoResponse(await response.json());
    await writeCache(key, reading);
    return reading;
  } catch {
    return offlineSeasonalWeather(now, lat);
  }
}
