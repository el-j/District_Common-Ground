import { describe, it, expect } from 'vitest';
import {
  getSolarPosition, getSolarDayTimes, classifySolarPhase,
  getSolarState, getMoonState, type SolarDayTimes,
} from './SunCalcEngine';

describe('SunCalcEngine — solar position', () => {
  it('places the sun near its highest altitude at solar noon vs. 6h before/after', () => {
    const lat = 52.5, lon = 13.4; // Berlin
    const date = new Date('2026-06-21T00:00:00Z');
    const times = getSolarDayTimes(date, lat, lon);
    const atNoon = getSolarPosition(times.solarNoon, lat, lon);
    const sixHoursBefore = getSolarPosition(new Date(times.solarNoon.getTime() - 6 * 3600_000), lat, lon);
    const sixHoursAfter = getSolarPosition(new Date(times.solarNoon.getTime() + 6 * 3600_000), lat, lon);

    expect(atNoon.altitudeDeg).toBeGreaterThan(sixHoursBefore.altitudeDeg);
    expect(atNoon.altitudeDeg).toBeGreaterThan(sixHoursAfter.altitudeDeg);
  });

  it('produces an ~12h day length at the equator near an equinox', () => {
    const times = getSolarDayTimes(new Date('2026-03-20T12:00:00Z'), 0, 0);
    const dayLengthHours = (times.sunset.getTime() - times.sunrise.getTime()) / 3600_000;
    expect(dayLengthHours).toBeGreaterThan(11.5);
    expect(dayLengthHours).toBeLessThan(12.5);
  });

  it('orders the named solar events chronologically across a day', () => {
    const times = getSolarDayTimes(new Date('2026-09-14T12:00:00Z'), 40.7, -74.0);
    const order: (keyof SolarDayTimes)[] = [
      'nightEnd', 'dawn', 'sunrise', 'goldenHourEnd', 'solarNoon', 'goldenHour', 'sunset', 'dusk', 'night',
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(times[order[i]!].getTime()).toBeGreaterThan(times[order[i - 1]!].getTime());
    }
  });
});

describe('SunCalcEngine — phase classification', () => {
  const times: SolarDayTimes = {
    nightEnd: new Date('2026-01-01T05:00:00Z'),
    dawn: new Date('2026-01-01T06:00:00Z'),
    sunrise: new Date('2026-01-01T06:30:00Z'),
    goldenHourEnd: new Date('2026-01-01T07:15:00Z'),
    solarNoon: new Date('2026-01-01T12:00:00Z'),
    goldenHour: new Date('2026-01-01T17:00:00Z'),
    sunset: new Date('2026-01-01T17:45:00Z'),
    dusk: new Date('2026-01-01T18:15:00Z'),
    night: new Date('2026-01-01T19:00:00Z'),
    nadir: new Date('2026-01-01T00:00:00Z'),
  };

  it.each([
    ['2026-01-01T04:00:00Z', 'night'],
    ['2026-01-01T05:30:00Z', 'night'],
    ['2026-01-01T06:15:00Z', 'dawn'],
    ['2026-01-01T07:00:00Z', 'goldenHour'],
    ['2026-01-01T12:00:00Z', 'day'],
    ['2026-01-01T17:20:00Z', 'goldenHour'],
    ['2026-01-01T18:00:00Z', 'dusk'],
    ['2026-01-01T20:00:00Z', 'night'],
  ] as const)('classifies %s as %s', (iso, expected) => {
    expect(classifySolarPhase(times, new Date(iso))).toBe(expected);
  });

  it('getSolarState reports isNight consistently with phaseName', () => {
    const state = getSolarState(new Date('2026-06-21T02:00:00Z'), 52.5, 13.4);
    expect(state.isNight).toBe(state.phaseName === 'night');
  });
});

describe('SunCalcEngine — moon phase', () => {
  it('reports an illuminated fraction within [0, 1]', () => {
    const { fraction, phaseName } = getMoonState(new Date('2026-09-14T00:00:00Z'));
    expect(fraction).toBeGreaterThanOrEqual(0);
    expect(fraction).toBeLessThanOrEqual(1);
    expect(typeof phaseName).toBe('string');
  });

  it('fraction rises toward 1 near a full moon and falls toward 0 near a new moon over the synodic cycle', () => {
    const samples = Array.from({ length: 30 }, (_, day) =>
      getMoonState(new Date(Date.UTC(2026, 0, 1 + day))).fraction);
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    expect(Math.min(...samples)).toBeLessThan(0.1);
  });
});
