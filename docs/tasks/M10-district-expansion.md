# M10 — District Expansion & Living World Systems

Stories: `docs/stories/EPIC-10-district-expansion.md`
Planning: `docs/planning/04-DISTRICT-EXPANSION-AND-WORLD.md`

## Resilience Visual Tier System (Priority 1 — implement first)
- [x] `EconomyMath.ts` — export `resilienceTier(score: number)` returning 'crisis'|'stabilising'|'thriving'
- [x] `WorldScene.ts` — subscribe to store; on resilience change update `#game-container` CSS class
- [x] `style.css` — `.world--crisis` (grayscale 70%, sepia 20%, vignette), `.world--stabilising` (mild), `.world--thriving` (saturate 120%, warm +5° hue, glow)
- [x] `style.css` — `.world--emergency` (pulse animation when resilience < 15)
- [x] `CrisisEngine.ts` / `actions.ts` — apply `worldEffect` immediately on crisis resolution

## Day/Night Lighting
- [x] `WorldScene.ts` — in-game time state (tick-based, 2-minute real-time cycle)
- [x] Tint overlay rectangle (depth 90, scrollFactor 0) — 4 phases: dawn (warm peach α0.22) → midday (transparent) → dusk (amber α0.18) → night (indigo α0.40)
- [ ] Streetlamp alpha overlay sprite (night-only, preload canvas texture)

## Map Expansion
- [ ] Expand `buildMap()` to 64×80 tiles (currently 48×64)
- [ ] North Transit Hub zone (rows 0–15): rail platform, ticket booth, cargo dock
- [ ] East Canal zone (cols 35–47): flood dikes, Tool Library build node location
- [ ] South Solar Quarter (rows 60–79): rooftop solar area, greenhouse garden node

## Ambient Life — Scraps the Cat
- [x] `ScrapsEntity.ts` — plain class with 3 patrol waypoints, proximity prompt
- [x] Proximity prompt: "[E] Pet Scraps 🐱"
- [x] Interaction: purr audio, floating heart particles (canvas tween), Stress −5
- [ ] Feed interaction (if cash > 0): Stress −10 buff flagged in store
- [x] `WorldScene.ts` — instantiate ScrapsEntity after character select

## Pigeon Entities
- [ ] `PigeonEntity.ts` — simple scatter AI (flee vector on player approach < 2 tiles)
- [ ] Spawn 4–6 pigeons in Central Plaza

## Zone Detection
- [ ] `WorldScene.ts` — row-based zone detection → `hud.setZone()` on zone change
- [ ] Zone names: "North — Transit Hub" / "Central Plaza" / "East Canal" / "South Quarter"

## Tests
- [ ] Manual: walk all 4 zones, confirm zone label updates
- [ ] Manual: 3× scapegoat → resilience drops → crisis class applies → grayscale visible
- [ ] Manual: pet Scraps → stress drops → hearts float
