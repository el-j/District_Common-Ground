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
- [x] Tint overlay rectangle (depth 90, scrollFactor 0) — 4 phases: dawn (warm peach, α0→0.16) → midday (transparent) → dusk (amber, α0.12→0.26) → night (indigo, α0.26→0) (audit note 2026-09-15: corrected from this doc's original α0.22/0.18/0.40 figures, which didn't match `updateDayNight()`'s actual values — same 4-phase concept, different numbers, no functional gap)
- [x] Streetlamp alpha overlay sprite (night-only) — `WorldScene.ts`'s `spawnStreetlamps()`/`updateStreetlamps()`: additive-blend glow circles spaced along every road strip, fading in/out with `updateDayNight()`'s tint strength (this note previously, incorrectly, claimed the plain darkness tint rect alone satisfied this — it didn't add any lamp-specific visual, so real glow sprites were added)

## Map Expansion
- [x] Expand `buildMap()` to 64×80 tiles (was 48×64)
- [x] North Transit Hub zone (rows 0–15): rail platform, ticket booth, cargo dock
- [x] East Canal zone (cols 52–62): flood dikes, community buildings
- [x] South Solar Quarter (rows 66–78): rooftop solar area, greenhouse garden node

## Ambient Life — Scraps the Cat
- [x] `ScrapsEntity.ts` — plain class with 3 patrol waypoints, proximity prompt
- [x] Proximity prompt: "[E] Feed Scraps 🐱" (falls back to a "can't afford a treat" label when cash is 0)
- [x] Interaction: floating heart particles (canvas tween); purr audio was not added (no purr synth wired to this interaction — see `SoundSynth.ts`'s M12 profile hooks for the closest existing precedent)
- [x] Feed interaction (if cash > 0): spends a small treat cost and reduces stress by 10 (`ScrapsEntity.ts`'s `onFeed()`); if cash is 0, a free pet still reduces stress by 5 instead of blocking the interaction entirely (this note previously, incorrectly, claimed this was done — the code only had an unconditional free "pet" for Stress −5, no cash gate or distinct feed behavior)
- [x] `WorldScene.ts` — instantiate ScrapsEntity after character select

## Pigeon Entities
- [x] `PigeonEntity.ts` — simple scatter AI (flee vector on player approach < 2 tiles)
- [x] Spawn 4–6 pigeons in Central Plaza

## Zone Detection
- [x] `WorldScene.ts` — row-based zone detection → `hud.setZone()` on zone change
- [x] Zone names: "North — Transit Hub" / "Central Plaza" / "East Canal" / "South Quarter" / "South Solar Quarter"

## Tests
- [ ] Manual: walk all 4 zones, confirm zone label updates
- [ ] Manual: 3× scapegoat → resilience drops → crisis class applies → grayscale visible
- [ ] Manual: pet Scraps → stress drops → hearts float

---

> **Audit note (2026-09-15), resolved same day:** EPIC-10's "Weather System" vision (rain particles, cold-snap frost overlay driven by heat) was never implemented when this audit ran — no rain/frost code or CSS existed anywhere in `apps/web`. This task doc never actually listed weather as a checklist item, so nothing here was falsely marked done; it was a vision-to-task-breakdown gap, not a stale checkbox. **Built the same day:** `apps/web/src/world/WeatherSystem.ts` (pure, tested `weatherTier(heat)` classifier) + `WorldScene.ts` canvas frost tint / falling-rectangle rain + reused `SoundSynth.playRain()`. See [`M10-FOLLOWUP-weather-system.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M10-FOLLOWUP-weather-system.md) for what shipped vs. was simplified.

## Weather System (added 2026-09-15)
- [x] `apps/web/src/world/WeatherSystem.ts` — pure `weatherTier(heat): 'none'|'rain'|'frost'` classifier, fully unit-tested across the full `[0.4, 1.5]` clamp range `economy.go` produces
- [x] `WorldScene.ts` — frost: a canvas rectangle tint layered above the day/night tint overlay (composes with it and with the resilience-tier CSS filter, since it's a separate render layer rather than another `filter:` rule on `#game-container`)
- [x] `WorldScene.ts` — rain: a pool of 40 falling streak rectangles (same simple-rectangle-primitive style as `spawnStreetlamps()`/`spawnFlyers()`), animated only while the rain tier is active; `SoundSynth.playRain()`/`stopRain()` reused for audio, started/stopped exactly on tier transitions (not every frame)
- [x] Weather composes with (doesn't fight) day/night and resilience-tier visuals — verified by construction: three independent render layers/CSS rules, not three things overwriting one shared property
