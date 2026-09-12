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
- Rain particle system: bandpass-noise drops + asphalt ripple sprites
- Cold-snap frost overlay CSS class (`filter: hue-rotate(-10deg) brightness(0.9)`)
- Weather state driven by $M_\text{heat}$ and $M_\text{climate}$ indices from pulse service

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
- **Test 10.3:** Rain overlay triggers during storm weather events
