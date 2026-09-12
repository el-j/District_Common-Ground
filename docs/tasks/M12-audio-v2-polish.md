# M12 — Procedural Audio Synth v2, Mobile Polish & Release QA

Stories: `docs/stories/EPIC-12-audio-v2-polish.md`
Planning: `docs/planning/05-WHIMSY-AND-TACTILE-UX.md`

## SoundSynth v2 — New Generators
- [ ] `playRain()` — bandpass white noise with random high-resonance droplet spikes; starts on rain weather state
- [ ] `playCatPurr()` — dual-triangle wave ±7Hz LFO, ~25Hz amplitude modulation, 3s duration
- [ ] `playBikeBell()` — two sine waves 659Hz + 880Hz, exponential decay 0.8s
- [ ] `playRadioStatic(tuningFraction)` — white noise narrowband, sweeps with tuning 0–1
- [ ] `playLoFiChord(root)` — detuned triangle+square chord + vinyl-crackle noise layer
- [ ] `playCrisisString()` — profile-aware: dissonant detuned sawtooth pair OR chiptune descending arpeggio
- [ ] `playSolidarityWin()` — profile-aware: rising sine arpeg (C4-E4-G4-C5) OR ascending pulse
- [ ] `startBGMLoop()` / `stopBGMLoop()` — drone pad OR 4-bar square bass (by skin profile)
- [ ] BGM starts on first player move; pauses during crisis modal; resumes on close

## Mobile Haptics
- [ ] `navigator.vibrate(50)` on bike bell (Pip only)
- [ ] `navigator.vibrate([30,20,30])` on crisis alert
- [ ] `navigator.vibrate([10,5,10,5,10])` on cat purr

## Accessibility (WCAG AA + ARIA)
- [ ] All `<button>` elements: `aria-label` or visible text
- [ ] All modals: `role="dialog"`, `aria-labelledby` pointing to title
- [ ] HUD `statsEl`: `aria-live="polite"`
- [ ] `Escape` closes any open modal (add event listeners in each modal constructor)
- [ ] Arrow keys navigate dialogue choices
- [ ] `:focus-visible` 2px solid accent outline on all `.interactive`
- [ ] `@media (prefers-reduced-motion: reduce)` disables all CSS animations
- [ ] WCAG AA contrast check: all text passes 4.5:1

## Test Suite
- [ ] Vitest: EconomyMath with all multiplier combinations
- [ ] Vitest: CrisisEngine — enqueue, resolve, history log
- [ ] Vitest: IrlQuestSystem — day lock, buff application
- [ ] Vitest: SeasonalWave — seasonal peaks correct for each season
- [ ] Go: pulse economy endpoint unit + httptest
- [ ] Go: pulse news classification unit tests
- [ ] Go: solidarity pool integration test (testcontainers)
- [ ] Lighthouse audit report documented in `docs/lighthouse-report.md`
