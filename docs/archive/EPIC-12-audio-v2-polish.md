# EPIC-12 — Procedural Audio Synth v2, Mobile Polish & Release QA

**Agent roles:** game-audio-engineer, design-ux-architect, engineering-frontend-developer  
**Planning doc:** `docs/planning/05-WHIMSY-AND-TACTILE-UX.md`

## Vision
Zero external MP3s. All sounds procedurally synthesized in <1ms via Web Audio API. Mobile haptics enrich every tactile action. Lighthouse 95+. Full test suite green.

## SoundSynth v2 — New Synthesis Methods

| Sound | Method |
|---|---|
| 🌧️ Rain on tin roof | Bandpass-filtered white noise + high-resonance droplet spikes (random timing) |
| 🐱 Cat purr | Dual-triangle wave ±7Hz LFO modulating amplitude at ~25Hz |
| 🔔 Cargo bike bell | Two sine waves (659Hz + 880Hz) with exponential decay 0.8s |
| 📻 Radio static | White noise through narrow bandpass (AM sweep on tuning) |
| 🎵 Lo-fi radio chords | Slightly detuned triangle + square chord with vinyl-crackle noise layer |
| ⚡ Crisis sting | Dissonant chord (detuned sawtooth ×2) or chiptune descending arpeggio (by skin) |
| 🎉 Solidarity win | Rising sine arpeggio (C4-E4-G4-C5) or ascending pulse (by skin) |
| 🎸 BGM loop | Drone pad (two sines ±4Hz beating) or 4-bar square bass (by skin) |

## Mobile Haptics
- `navigator.vibrate(50)` on bike bell tap (as Pip)
- `navigator.vibrate([30, 20, 30])` on crisis alert
- `navigator.vibrate([10, 5, 10, 5, 10])` on cat purr

## Accessibility & Keyboard Navigation
- All `<button>` elements: `aria-label` or visible text
- All modals: `role="dialog"`, `aria-labelledby`
- `Escape` closes any open modal
- Arrow keys navigate dialogue choices
- `:focus-visible` outline on all `.interactive` elements
- `@media (prefers-reduced-motion: reduce)` disables all animations
- WCAG AA contrast verified on all text

## QA & Testing
- Vitest suite covering EconomyMath, CrisisEngine, store actions, IrlQuestSystem
- Go tests for pulse and news endpoints (httptest + testcontainers)
- Lighthouse audit: Performance >90, Accessibility >95, PWA >95
- Manual cross-browser: Mobile Safari iOS, Chrome Android, Desktop Chrome/Firefox

## Acceptance Criteria
- **Test 12.1:** Zero external audio requests; all sounds generated <1ms
- **Test 12.2:** All unit + integration tests pass in CI
- **Test 12.3:** PWA operates fully offline with valid service worker caching
