/**
 * M10 follow-up (audit 2026-09-15) — EPIC-10's Weather System.
 *
 * Pure threshold logic only, mirroring how `resilienceTier()` in
 * EconomyMath.ts is isolated from the Phaser rendering it drives. Reuses
 * DistrictPulseState.multipliers.heat (already fetched for the Economic
 * Barometer) rather than a new index — a heat extreme in either direction is
 * the weather signal: a deep cold snap reads as frost, a heat spike as an
 * unstable-weather rainstorm. This is a deliberate simplification (one index
 * driving both states), not a full climate model.
 */

export type WeatherTier = 'none' | 'rain' | 'frost';

// heat is clamped to [0.4, 1.5] by apps/api/internal/pulse/economy.go.
const FROST_THRESHOLD = 0.65;
const RAIN_THRESHOLD = 1.2;

export function weatherTier(heat: number): WeatherTier {
  if (heat < FROST_THRESHOLD) return 'frost';
  if (heat > RAIN_THRESHOLD) return 'rain';
  return 'none';
}
