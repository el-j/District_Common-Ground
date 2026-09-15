# M10 Follow-up — Weather System (Rain & Cold-Snap Visuals)

Found: 2026-09-15, full repo audit
Status: `[ ] Not Started`
Parent: [`M10-district-expansion.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M10-district-expansion.md), [`EPIC-10-district-expansion.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-10-district-expansion.md)

---

## The Gap

`EPIC-10-district-expansion.md`'s vision describes a weather system: rain particle effects and a cold-snap frost overlay, driven by the heat/climate indices already available from M8's `DistrictPulseState`. No rain, frost, or precipitation code exists anywhere in `apps/web` — no CSS, no Canvas/Phaser particle emitter, nothing.

To be clear: this is **not** a case of a false checkbox — `M10-district-expansion.md`'s own checklist never listed weather as an item, so nothing was dishonestly marked done. It's a vision-to-task-breakdown gap: the EPIC promised it, the milestone task doc never captured it as a discrete deliverable, so it was quietly dropped between planning and execution.

Related precedent already in the codebase to build on: M12's `SoundSynth.ts` already has a real `playRain()` generator (bandpass white noise + droplet spikes) — it's *audio* rain that exists today with no visual counterpart. The day/night tint-overlay pattern in `WorldScene.ts` (`updateDayNight()`, depth-90 scrollFactor-0 rectangle) is the natural template for a weather overlay too.

## Options to Resolve

1. **(Recommended)** Build a real, minimal weather overlay: a Canvas/Phaser rain particle emitter (reuse the existing `playRain()` SFX as the audio half) gated on `DistrictPulseState.heat`/`climate` crossing a threshold, plus a CSS frost/frozen filter on `#game-container` for a cold-snap state — following the exact same visual-tier pattern `resilienceTier()`/`.world--crisis` etc. already established in M10.
2. Explicitly drop it from the vision: edit `EPIC-10-district-expansion.md` to remove the Weather System promise, noting it was superseded by the resilience-tier visual system as the game's primary "world mood" signal.
3. Do nothing for now — acceptable short-term (nothing is broken; this is unbuilt, not failing), but the EPIC should not keep promising something that was silently dropped.

## Acceptance Criteria (once picked up)

- [ ] Decide between Option 1 (build it) and Option 2 (formally drop it from the vision doc).
- [ ] If Option 1: rain/frost visuals render correctly at both the 4 existing day/night phases and independent of them (weather and time-of-day should compose, not conflict); a Vitest test covers the threshold logic (pure function, not the Phaser rendering itself, mirroring how `resilienceTier()` is tested).
- [ ] If Option 2: `EPIC-10-district-expansion.md` no longer promises unbuilt weather visuals.
