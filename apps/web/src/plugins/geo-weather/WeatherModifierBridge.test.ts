import { describe, it, expect } from 'vitest';
import { computeGeoWeatherModifiers, buildGeoWeatherState, isHeatwave } from './WeatherModifierBridge';
import { getSolarState } from './SunCalcEngine';
import type { SolarState } from './SunCalcEngine';
import type { WeatherReading } from './OpenMeteoAdapter';

const DAY: SolarState = { azimuthDeg: 180, altitudeDeg: 45, isNight: false, phaseName: 'day' };
const NIGHT: SolarState = { azimuthDeg: 0, altitudeDeg: -20, isNight: true, phaseName: 'night' };

function weather(overrides: Partial<WeatherReading> = {}): WeatherReading {
  return {
    temperatureC: 18, apparentTempC: 18, precipitationMm: 0, cloudCoverPct: 20,
    windSpeedKmh: 10, isRaining: false, isSnowing: false, source: 'live',
    ...overrides,
  };
}

describe('Test 17.1 (Solar Day/Night Sync)', () => {
  it('at 22:00 in a 52.5°N winter night, real solar state is night and solar generation drops to zero', () => {
    const lat = 52.5, lon = 13.4; // Berlin
    const solar = getSolarState(new Date('2026-01-15T22:00:00Z'), lat, lon);
    expect(solar.isNight).toBe(true);

    const modifiers = computeGeoWeatherModifiers(solar, weather());
    expect(modifiers.solarEfficiencyMult).toBe(0);
    // NOTE (scoping): `solar.isNight` is exactly the boolean a live WorldScene
    // streetlamp toggle would consume — the accelerated, 120s in-game
    // day/night tint in WorldScene.updateDayNight() is unrelated to real
    // clock time and isn't wired to this real-world solar state in this PoC.
    // See docs/tasks/M17-offgrid-mesh-weather-currency.md's scoping note.
  });
});

describe('WeatherModifierBridge — Test 17.2 (Live Weather Modifiers)', () => {
  it('increases heating upkeep and grants the garden water bonus for -5°C / 4.2mm rain', () => {
    const modifiers = computeGeoWeatherModifiers(DAY, weather({ temperatureC: -5, precipitationMm: 4.2, isRaining: true }));
    expect(modifiers.energyHeatingUpkeep).toBeGreaterThan(1);
    expect(modifiers.gardenWaterBonus).toBe(true);
  });

  it('leaves heating upkeep at baseline and denies the water bonus in mild, dry weather', () => {
    const modifiers = computeGeoWeatherModifiers(DAY, weather());
    expect(modifiers.energyHeatingUpkeep).toBe(1);
    expect(modifiers.gardenWaterBonus).toBe(false);
  });

  it('zeroes solar efficiency at night regardless of cloud cover', () => {
    const modifiers = computeGeoWeatherModifiers(NIGHT, weather({ cloudCoverPct: 0 }));
    expect(modifiers.solarEfficiencyMult).toBe(0);
  });

  it('reduces solar efficiency as cloud cover increases, floored at 0.35', () => {
    const clear = computeGeoWeatherModifiers(DAY, weather({ cloudCoverPct: 0 }));
    const overcast = computeGeoWeatherModifiers(DAY, weather({ cloudCoverPct: 100 }));
    expect(clear.solarEfficiencyMult).toBe(1);
    expect(overcast.solarEfficiencyMult).toBe(0.35);
  });

  it('applies the wet-road courier friction penalty when raining, snowing, or slick', () => {
    expect(computeGeoWeatherModifiers(DAY, weather({ isRaining: true })).courierFrictionMult).toBe(0.8);
    expect(computeGeoWeatherModifiers(DAY, weather({ isSnowing: true })).courierFrictionMult).toBe(0.8);
    expect(computeGeoWeatherModifiers(DAY, weather()).courierFrictionMult).toBe(1);
  });

  it('flags heatwave conditions above 30°C', () => {
    expect(isHeatwave(weather({ temperatureC: 31 }))).toBe(true);
    expect(isHeatwave(weather({ temperatureC: 29 }))).toBe(false);
  });

  it('buildGeoWeatherState bundles coordinates, solar, weather, and modifiers together', () => {
    const state = buildGeoWeatherState(52.5, 13.4, DAY, weather(), new Date('2026-09-14T12:00:00Z'));
    expect(state.coordinates).toEqual({ lat: 52.5, lon: 13.4 });
    expect(state.solar).toBe(DAY);
    expect(state.gameModifiers.solarEfficiencyMult).toBeGreaterThan(0);
    expect(state.timestamp).toBe(new Date('2026-09-14T12:00:00Z').getTime());
  });
});
