# M12 — Procedural Audio Synth v2, Mobile Polish & Release QA

Stories: `docs/archive/EPIC-12-audio-v2-polish.md`
Planning: `docs/planning/05-WHIMSY-AND-TACTILE-UX.md`

## SoundSynth v2 — New Generators
- [x] `playRain()` — bandpass white noise with random high-resonance droplet spikes on interval
- [x] `playCatPurr()` — dual-triangle wave ±7Hz LFO, ~25Hz amplitude modulation, 3s duration
- [x] `playBikeBell()` — two sine waves 659Hz + 880Hz, exponential decay 0.8s
- [x] `playRadioStatic(tuningFraction)` — white noise narrowband, sweeps with tuning 0–1
- [x] `playLoFiChord(root)` — detuned triangle+square chord + vinyl-crackle noise layer
- [x] `playCrisisStab()` — dissonant detuned sawtooth pair 220Hz + 221.5Hz (note: renamed from playCrisisString)
- [x] `playSolidarityChime()` — rising sine arpeggio C4-E4-G4-C5 (note: renamed from playSolidarityWin)
- [x] `startBGMLoop()` / `stopBGMLoop()` — a 4-bar Am→F→C→G chord progression at 84 BPM with lookahead scheduling (audit note 2026-09-15: corrected from this doc's original "drone 55Hz triangle + rhythmic 110Hz tick at 500ms" description, which doesn't match the actual, materially richer implementation — no functional gap, just a stale description)
- [x] BGM starts on first player move

## Mobile Haptics
- [x] `navigator.vibrate(50)` on bike bell
- [x] `navigator.vibrate([30,20,30])` on crisis alert (playCrisisStab)
- [x] `navigator.vibrate([10,5,10,5,10])` on cat purr

## Accessibility (WCAG AA + ARIA)
- [x] All modals: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to title (CrisisWireModal, ConstructionModal, HistoryModal, BroadsheetModal)
- [x] HUD `statsEl`: `aria-live="polite"`
- [x] `Escape` closes ConstructionModal and HistoryModal
- [x] Crisis choice buttons: `aria-label` with label + first 80 chars of description
- [x] `:focus-visible` 2px solid #66dd88 outline on all `.interactive`, `button`, `input`
- [x] `@media (prefers-reduced-motion: reduce)` — collapses all animations; `#game-container { transition: none; filter: none !important; }`
- [x] Arrow keys navigate dialogue choices
- [ ] WCAG AA contrast check: all text passes 4.5:1

## Test Suite
- [x] Vitest: EconomyMath with all multiplier combinations (applyDailyTick + M_food=1.3, kitchen=100)
- [x] Vitest: CrisisEngine — enqueue, resolve, history log
- [x] Vitest: IrlQuestSystem — day lock, buff application
- [x] Vitest: SeasonalWave — seasonal peaks correct for each season
- [x] Go: pulse economy endpoint unit + httptest
- [x] Go: pulse news classification unit tests
- [x] Go: solidarity pool httptest (`solidarity_pool_test.go` — 4 test funcs: 2 plain unit tests (nil-pool defaults, cache-control header) plus 2 real testcontainers-backed integration tests (`ResponseShape`, `WithData`), both correctly skipped under `-short`. Audit note 2026-09-15: this line previously and incorrectly claimed there was *no* testcontainers test here — verified by reading the file directly, the two integration tests do exist.)
- [ ] Lighthouse audit report documented in `docs/lighthouse-report.md`
