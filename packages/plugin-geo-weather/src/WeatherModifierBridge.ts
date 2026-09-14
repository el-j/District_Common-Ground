// M17 — Combines a solar state + a weather reading into the gameplay
// modifiers described in docs/planning/17-...md's GeoWeatherState shape.
// Pure function: no store writes here, so callers (a future WorldScene tick,
// or a preview UI) decide how/when to apply these deltas — mirrors how
// WeatherModifierBridge.ts is scoped as a bridge, not an owner, of state.
import type { SolarState } from './SunCalcEngine';
import type { WeatherReading } from './OpenMeteoAdapter';

export interface GeoWeatherModifiers {
  solarEfficiencyMult: number;
  energyHeatingUpkeep: number;
  gardenWaterBonus: boolean;
  courierFrictionMult: number;
}

export interface GeoWeatherState {
  timestamp: number;
  coordinates: { lat: number; lon: number };
  solar: SolarState;
  weather: WeatherReading;
  gameModifiers: GeoWeatherModifiers;
}

const FREEZING_C = 2;
const HEATWAVE_C = 30;
const RAIN_WATER_BONUS_THRESHOLD_MM = 1.0;
const SLICK_ROAD_PRECIPITATION_MM = 0.2;

export function computeGeoWeatherModifiers(solar: SolarState, weather: WeatherReading): GeoWeatherModifiers {
  const solarEfficiencyMult = solar.isNight
    ? 0
    : Math.max(0.35, 1 - (weather.cloudCoverPct / 100) * 0.65);

  const energyHeatingUpkeep = weather.temperatureC < FREEZING_C
    ? 1 + Math.min(1.5, (FREEZING_C - weather.temperatureC) / 10)
    : 1;

  const gardenWaterBonus = weather.precipitationMm > RAIN_WATER_BONUS_THRESHOLD_MM;

  const courierFrictionMult = (weather.isRaining || weather.isSnowing || weather.precipitationMm > SLICK_ROAD_PRECIPITATION_MM)
    ? 0.8
    : 1;

  return { solarEfficiencyMult, energyHeatingUpkeep, gardenWaterBonus, courierFrictionMult };
}

export function buildGeoWeatherState(
  lat: number,
  lon: number,
  solar: SolarState,
  weather: WeatherReading,
  now: Date = new Date(),
): GeoWeatherState {
  return {
    timestamp: now.getTime(),
    coordinates: { lat, lon },
    solar,
    weather,
    gameModifiers: computeGeoWeatherModifiers(solar, weather),
  };
}

/** Heatwave threshold helper, used by UI copy ("cooling center" prompts) rather than a numeric modifier. */
export function isHeatwave(weather: WeatherReading): boolean {
  return weather.temperatureC > HEATWAVE_C;
}
