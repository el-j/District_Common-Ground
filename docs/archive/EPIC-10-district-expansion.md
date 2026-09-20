# EPIC-10 — District Expansion & Living World Systems

**Agent roles:** level-designer, technical-artist, engineering-frontend-developer  
**Planning doc:** `docs/planning/04-DISTRICT-EXPANSION-AND-WORLD.md`

## Vision
Expand the physical map and bring it to life with dynamic day/night lighting, real weather overlays, ambient street life, and Scraps the district stray cat.

## World Zone Architecture
```
              [NORTH: Transit Hub & Cargo Dock]
                         │
    [WEST: Tenements]  [CENTRAL PLAZA]  [EAST: Canal & Tool Library]
                         │
          [SOUTH: Rooftop Solar & Community Greenhouse]
```

## Map Expansion Tasks
- Expand `WorldScene.ts` tilemap to 64×80 tiles with distinct zone bands
- North Transit Hub: rail platform, cargo dock, ticket booth NPCs
- East Canal: flood defense dikes, Community Tool Library build node
- South Solar Quarter: expanded rooftop solar area, greenhouse garden node

## Day/Night Lighting Tasks
- Smooth Phaser camera tint transitions: Dawn (warm peach) → Midday (sunlight) → Dusk (amber/violet) → Night (midnight indigo)
- Streetlamp & porch light illumination masks (night-only alpha overlay)
- In-game time advances with each `advanceDay()` call; tick counter drives time-of-day

## Weather System Tasks

> **Built 2026-09-15** (was a real vision-to-task gap until the M10 follow-up closed it — see [`M10-FOLLOWUP-weather-system.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M10-FOLLOWUP-weather-system.md)). Shipped as: a pure `weatherTier(heat)` classifier (`apps/web/src/world/WeatherSystem.ts`, fully unit-tested) driving a canvas frost tint overlay + a small pool of falling-streak "rain" rectangles in `WorldScene.ts`, plus the existing `SoundSynth.playRain()`/`stopRain()` for audio — reusing `DistrictPulseState.multipliers.heat` (one index, both states) rather than a separate `$M_\text{climate}$` index, since no such index exists. Not an asphalt-ripple/ambient-audio particle sim — a deliberate, documented simplification.

- Rain visual: pooled falling rectangles, canvas-rendered, reusing `playRain()` for audio — not a bandpass-noise-driven particle+ripple sim
- Cold-snap frost overlay: a canvas rectangle tint (depth-layered above the day/night tint so the two compose), not a CSS `filter` on `#game-container` — CSS filters on the same element don't compose with the existing resilience-tier filters, canvas layering does
- Weather state driven by `DistrictPulseState.multipliers.heat` only (no separate climate index exists)

## Ambient Life Tasks
- **Scraps the Cat**: procedural-roam NPC entity; naps at grocer (morning), plaza (midday), solar wall (dusk)
  - Proximity prompt: `[E] Pet Scraps`
  - Interaction: purr audio (dual-triangle LFO), floating heart particles, Stress −5%
  - Feed bread/soup: Stress −10% buff for the day
- Pigeon entities: scatter on player approach (simple flee AI)
- Visible NPC daily routines (walk in/out of buildings on time-of-day schedule)

## Resilience Visual Tier System (M10-critical)
- `resilienceTier()` → 'crisis' | 'stabilising' | 'thriving'
- `#game-container` class switches on store change
- CSS `.world--crisis` (grayscale 70%, heavy vignette), `.world--stabilising` (muted), `.world--thriving` (saturated + warm glow)
- `.world--emergency` pulse when resilience < 15

## Acceptance Criteria
- **Test 10.1:** All zones render at stable 60fps on mobile
- **Test 10.2:** Petting Scraps decrements stress and triggers purr + hearts
- **Test 10.3:** Rain overlay triggers during storm weather events — covered at the pure-logic level by `WeatherSystem.test.ts` (`weatherTier(heat)` crossing the rain threshold); the Phaser rendering itself is not chased down for automated coverage, matching how Test 10.1's day/night tint and the resilience-tier visuals are verified
