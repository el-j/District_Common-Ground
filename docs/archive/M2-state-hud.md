# M2 Tasks — State Store, Archetype Selection & HUD

**Sprint:** 2
**Status:** [ ] Not Started
**Stories:** EPIC-02
**Depends on:** M1 complete

---

## useGameStore.ts (Zustand)

- [ ] Create `src/core/state/useGameStore.ts`
- [ ] Define `GameState` interface (see `CLAUDE.md` / System Architecture doc):
  - `meta`: day, tick, activeSkin
  - `player`: classRole, cash, energy, maxEnergy, socialTrust, stressLevel, position, facing
  - `commons`: resilienceScore, solarGridProgress, kitchenProgress, legalFundProgress
  - `crisisState`: activeCrisisId, pendingQueue, historyLog
- [ ] Create `src/core/state/actions.ts` with mutations:
  - `setArchetype(role)` — seeds initial stats per archetype
  - `spendCash(amount)`, `gainCash(amount)`
  - `spendEnergy(amount)`, `regenEnergy(amount)`
  - `addTrust(amount)`, `loseTrust(amount)`
  - `addStress(amount)`, `reduceStress(amount)`
  - `advanceDay()`
  - `updateCommonsProgress(node, amount)`
  - `setActiveCrisis(id)`, `resolveCrisis(choice, summary)`
- [ ] Seed correct archetype starting stats:
  - Pip (precarious): cash $25, energy 80, trust 40, stress 60
  - Morgan (commuter): cash $240, energy 40, trust 25, stress 45
  - Arthur (landlord): cash $1200, energy 65, trust 10, stress 30

---

## IndexedDB Persistence (idb-keyval)

- [ ] Create persistence layer using idb-keyval
- [ ] Auto-save full `GameState` to IndexedDB on every `advanceDay()` call
- [ ] Load saved state on game boot (before first render frame)
- [ ] Handle missing/corrupt save gracefully (reset to fresh state)
- [ ] Key: `'district-cg-save'`

---

## Character Select Screen

- [ ] Create character selection UI (`src/ui/CharacterSelect.ts` or HTML template)
- [ ] Display all 3 archetypes with name, description, and starting stat preview
- [ ] Selecting an archetype calls `setArchetype(role)` and transitions to WorldScene
- [ ] No back button (selection is final per session — or add confirmation dialog)

---

## TopHUD.ts

- [ ] Create `src/ui/TopHUD.ts`
- [ ] Render as HTML/CSS overlay (positioned absolute over canvas)
- [ ] **Top bar:** Avatar token (icon), Day counter, Commons Resilience progress bar (0–100)
- [ ] **Resource matrix:** Cash ($), Energy (⚡), Trust (🤝), Stress (🔥)
- [ ] Subscribe to Zustand store and re-render on state change
- [ ] Responsive layout: legible at 375px width minimum
- [ ] Style with Tailwind CSS

---

## SoundSynth.ts

- [ ] Create `src/core/audio/SoundSynth.ts`
- [ ] Initialize `AudioContext` on first user interaction event (click/touchstart)
- [ ] Procedural footstep SFX: noise burst timed to player movement frames
- [ ] UI click SFX: short sine wave ping
- [ ] Day transition chime: ascending arpeggio
- [ ] Export `playFootstep()`, `playUIClick()`, `playDayChime()` functions
- [ ] Guard all audio calls with `AudioContext.state === 'running'` check

---

## Acceptance Tests (M2)

- [ ] **Test 2.1:** Selecting a character profile correctly initializes asymmetric stats in the Zustand store
  - Select each archetype → open dev tools → inspect Zustand store → confirm exact stat values
- [ ] **Test 2.2:** Refreshing the browser tab fully restores player coordinates, current day, and resource values
  - Play until day 3, move to a non-default position → refresh → confirm state restored exactly
- [ ] **Test 2.3:** Audio initialization operates without browser autoplay policy errors following the first user tap
  - Open the game on mobile Safari → tap once → confirm audio plays without console errors
