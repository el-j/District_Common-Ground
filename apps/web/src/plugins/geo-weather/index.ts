// M17 — Public facade for the geo-weather plugin: combines SunCalcEngine +
// OpenMeteoAdapter + WeatherModifierBridge into one call a UI or WorldScene
// tick can use without knowing about the three modules underneath.
import { getSolarState } from './SunCalcEngine';
import { fetchWeather } from './OpenMeteoAdapter';
import { buildGeoWeatherState, type GeoWeatherState } from './WeatherModifierBridge';

export * from './SunCalcEngine';
export * from './OpenMeteoAdapter';
export * from './WeatherModifierBridge';

export async function getGeoWeatherState(
  lat: number,
  lon: number,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<GeoWeatherState> {
  const solar = getSolarState(now, lat, lon);
  const weather = await fetchWeather(lat, lon, fetchImpl, now);
  return buildGeoWeatherState(lat, lon, solar, weather, now);
}
