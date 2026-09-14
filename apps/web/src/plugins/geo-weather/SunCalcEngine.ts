// M17 — Real-time astronomical solar geometry (SunCalc-style algorithm) plus
// a lunar-phase estimate for night brightness. Pure math, no I/O, so this is
// exactly as testable as EconomyMath.ts. Formulas follow the standard
// low-precision solar/lunar position equations (the same public-domain
// formulas underlying the widely-used `suncalc` npm package).

const RAD = Math.PI / 180;
const DAY_MS = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;

export type SolarPhaseName = 'dawn' | 'day' | 'goldenHour' | 'dusk' | 'night';

export interface SolarPosition {
  /** Compass direction of the sun, degrees, 0=north, measured clockwise. */
  azimuthDeg: number;
  /** Angle above the horizon, degrees; negative means below the horizon. */
  altitudeDeg: number;
}

export interface SolarDayTimes {
  nightEnd: Date;
  dawn: Date;
  sunrise: Date;
  goldenHourEnd: Date;
  solarNoon: Date;
  goldenHour: Date;
  sunset: Date;
  dusk: Date;
  night: Date;
  nadir: Date;
}

export interface SolarState {
  azimuthDeg: number;
  altitudeDeg: number;
  isNight: boolean;
  phaseName: SolarPhaseName;
}

export interface MoonState {
  /** Illuminated fraction, 0 (new) .. 1 (full). */
  fraction: number;
  phaseName:
    | 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous'
    | 'full' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent';
}

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970;
}

function fromJulian(julian: number): Date {
  return new Date((julian - J1970 + 0.5) * DAY_MS);
}

function toDays(date: Date): number {
  return toJulian(date) - J2000;
}

function rightAscension(eclipticLon: number, eclipticLat: number): number {
  return Math.atan2(
    Math.sin(eclipticLon) * Math.cos(OBLIQUITY) - Math.tan(eclipticLat) * Math.sin(OBLIQUITY),
    Math.cos(eclipticLon),
  );
}

function declination(eclipticLon: number, eclipticLat: number): number {
  return Math.asin(
    Math.sin(eclipticLat) * Math.cos(OBLIQUITY) +
    Math.cos(eclipticLat) * Math.sin(OBLIQUITY) * Math.sin(eclipticLon),
  );
}

function siderealTime(daysSinceJ2000: number, lngRad: number): number {
  return RAD * (280.16 + 360.9856235 * daysSinceJ2000) - lngRad;
}

function solarMeanAnomaly(daysSinceJ2000: number): number {
  return RAD * (357.5291 + 0.98560028 * daysSinceJ2000);
}

function eclipticLongitude(meanAnomaly: number): number {
  const equationOfCenter = RAD * (
    1.9148 * Math.sin(meanAnomaly) +
    0.02 * Math.sin(2 * meanAnomaly) +
    0.0003 * Math.sin(3 * meanAnomaly)
  );
  const perihelion = RAD * 102.9372;
  return meanAnomaly + equationOfCenter + perihelion + Math.PI;
}

function sunEclipticCoords(daysSinceJ2000: number): { dec: number; ra: number; meanAnomaly: number; eclipticLon: number } {
  const meanAnomaly = solarMeanAnomaly(daysSinceJ2000);
  const eclipticLon = eclipticLongitude(meanAnomaly);
  return {
    dec: declination(eclipticLon, 0),
    ra: rightAscension(eclipticLon, 0),
    meanAnomaly,
    eclipticLon,
  };
}

/** Sun azimuth/altitude in degrees for a given instant and location. */
export function getSolarPosition(date: Date, latDeg: number, lonDeg: number): SolarPosition {
  const lngRad = RAD * -lonDeg;
  const phiRad = RAD * latDeg;
  const days = toDays(date);
  const sun = sunEclipticCoords(days);
  const hourAngle = siderealTime(days, lngRad) - sun.ra;

  const altitude = Math.asin(
    Math.sin(phiRad) * Math.sin(sun.dec) + Math.cos(phiRad) * Math.cos(sun.dec) * Math.cos(hourAngle),
  );
  const azimuth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phiRad) - Math.tan(sun.dec) * Math.cos(phiRad),
  ) + Math.PI; // shift so 0 = north, clockwise

  return {
    azimuthDeg: (azimuth / RAD) % 360,
    altitudeDeg: altitude / RAD,
  };
}

const J0 = 0.0009;

function julianCycle(days: number, lngRad: number): number {
  return Math.round(days - J0 - lngRad / (2 * Math.PI));
}

function approxTransit(hourAngle: number, lngRad: number, cycle: number): number {
  return J0 + (hourAngle + lngRad) / (2 * Math.PI) + cycle;
}

function solarTransitJulian(approxTransitDays: number, meanAnomaly: number, eclipticLon: number): number {
  return J2000 + approxTransitDays + 0.0053 * Math.sin(meanAnomaly) - 0.0069 * Math.sin(2 * eclipticLon);
}

function hourAngleForAltitude(altitudeRad: number, phiRad: number, decRad: number): number {
  const cosH = (Math.sin(altitudeRad) - Math.sin(phiRad) * Math.sin(decRad)) / (Math.cos(phiRad) * Math.cos(decRad));
  return Math.acos(Math.max(-1, Math.min(1, cosH)));
}

function getSetJulian(altitudeRad: number, lngRad: number, phiRad: number, decRad: number, cycle: number, meanAnomaly: number, eclipticLon: number): number {
  const hourAngle = hourAngleForAltitude(altitudeRad, phiRad, decRad);
  const approx = approxTransit(hourAngle, lngRad, cycle);
  return solarTransitJulian(approx, meanAnomaly, eclipticLon);
}

// [angle below horizon in degrees, morning event name, evening event name]
const DAY_TIME_ANGLES: Array<[number, keyof SolarDayTimes, keyof SolarDayTimes]> = [
  [-0.833, 'sunrise', 'sunset'],
  [-6, 'dawn', 'dusk'],
  [-18, 'nightEnd', 'night'],
  [6, 'goldenHourEnd', 'goldenHour'],
];

/** All named solar events (dawn, sunrise, golden hour, solar noon, sunset, dusk, night) for the local day containing `date`. */
export function getSolarDayTimes(date: Date, latDeg: number, lonDeg: number): SolarDayTimes {
  const lngRad = RAD * -lonDeg;
  const phiRad = RAD * latDeg;
  const days = toDays(date);
  const cycle = julianCycle(days, lngRad);
  const approxNoon = approxTransit(0, lngRad, cycle);
  const meanAnomaly = solarMeanAnomaly(approxNoon);
  const eclipticLon = eclipticLongitude(meanAnomaly);
  const dec = declination(eclipticLon, 0);
  const noonJulian = solarTransitJulian(approxNoon, meanAnomaly, eclipticLon);

  const result: Partial<SolarDayTimes> = {
    solarNoon: fromJulian(noonJulian),
    nadir: fromJulian(noonJulian - 0.5),
  };

  for (const [angleDeg, riseName, setName] of DAY_TIME_ANGLES) {
    const setJulian = getSetJulian(RAD * angleDeg, lngRad, phiRad, dec, cycle, meanAnomaly, eclipticLon);
    const riseJulian = noonJulian - (setJulian - noonJulian);
    result[riseName] = fromJulian(riseJulian);
    result[setName] = fromJulian(setJulian);
  }

  return result as SolarDayTimes;
}

/** Buckets `now` into one of the five narrative phases using the day's named solar events. */
export function classifySolarPhase(times: SolarDayTimes, now: Date): SolarPhaseName {
  const t = now.getTime();
  if (t < times.nightEnd.getTime() || t >= times.night.getTime()) return 'night';
  if (t < times.dawn.getTime()) return 'night';
  if (t < times.sunrise.getTime()) return 'dawn';
  if (t < times.goldenHourEnd.getTime()) return 'goldenHour';
  if (t < times.goldenHour.getTime()) return 'day';
  if (t < times.sunset.getTime()) return 'goldenHour';
  return 'dusk';
}

/** Full solar state (position + narrative phase) for `now` at a coordinate. */
export function getSolarState(date: Date, latDeg: number, lonDeg: number): SolarState {
  const position = getSolarPosition(date, latDeg, lonDeg);
  const times = getSolarDayTimes(date, latDeg, lonDeg);
  const phaseName = classifySolarPhase(times, date);
  return {
    azimuthDeg: position.azimuthDeg,
    altitudeDeg: position.altitudeDeg,
    isNight: phaseName === 'night',
    phaseName,
  };
}

function moonEclipticCoords(daysSinceJ2000: number): { dec: number; ra: number; dist: number } {
  const eclipticLon = RAD * (218.316 + 13.176396 * daysSinceJ2000);
  const meanAnomaly = RAD * (134.963 + 13.064993 * daysSinceJ2000);
  const meanDistance = RAD * (93.272 + 13.229350 * daysSinceJ2000);

  const lon = eclipticLon + RAD * 6.289 * Math.sin(meanAnomaly);
  const lat = RAD * 5.128 * Math.sin(meanDistance);
  const distKm = 385001 - 20905 * Math.cos(meanAnomaly);

  return { dec: declination(lon, lat), ra: rightAscension(lon, lat), dist: distKm };
}

const SUN_DISTANCE_KM = 149598000;

/** Illuminated fraction + named phase of the moon, for night ambient brightness. */
export function getMoonState(date: Date): MoonState {
  const days = toDays(date);
  const sun = sunEclipticCoords(days);
  const moon = moonEclipticCoords(days);

  const geocentricElongation = Math.acos(
    Math.sin(sun.dec) * Math.sin(moon.dec) +
    Math.cos(sun.dec) * Math.cos(moon.dec) * Math.cos(sun.ra - moon.ra),
  );
  const phaseAngle = Math.atan2(
    SUN_DISTANCE_KM * Math.sin(geocentricElongation),
    moon.dist - SUN_DISTANCE_KM * Math.cos(geocentricElongation),
  );
  const positionAngle = Math.atan2(
    Math.cos(sun.dec) * Math.sin(sun.ra - moon.ra),
    Math.sin(sun.dec) * Math.cos(moon.dec) - Math.cos(sun.dec) * Math.sin(moon.dec) * Math.cos(sun.ra - moon.ra),
  );

  const fraction = (1 + Math.cos(phaseAngle)) / 2;
  const cycle = 0.5 + 0.5 * phaseAngle * (positionAngle < 0 ? -1 : 1) / Math.PI;

  const phaseName: MoonState['phaseName'] =
    cycle < 0.03 || cycle > 0.97 ? 'new'
    : cycle < 0.22 ? 'waxingCrescent'
    : cycle < 0.28 ? 'firstQuarter'
    : cycle < 0.47 ? 'waxingGibbous'
    : cycle < 0.53 ? 'full'
    : cycle < 0.72 ? 'waningGibbous'
    : cycle < 0.78 ? 'lastQuarter'
    : 'waningCrescent';

  return { fraction, phaseName };
}
