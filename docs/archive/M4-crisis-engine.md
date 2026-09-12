# M4 Tasks — Crisis Engine & Real-World News System

**Sprint:** 4
**Status:** [ ] Not Started
**Stories:** EPIC-04
**Depends on:** M3 complete

---

## crisis_scenarios.json

- [ ] Create `public/assets/data/crisis_scenarios.json`
- [ ] Define JSON schema for scenarios:
  ```json
  {
    "id": "string",
    "title": "string",
    "context": "string",
    "choiceA": {
      "label": "string",
      "type": "authoritarian",
      "description": "string",
      "consequences": {
        "cashDelta": 0,
        "trustDelta": 0,
        "resilienceDelta": 0,
        "stressDelta": 0,
        "worldEffect": "desaturate | bloom | none"
      }
    },
    "choiceB": { "...same shape..." }
  }
  ```
- [ ] Encode all 5 crisis scenarios:
  1. **winter-power-surge** — energy monopoly raises rates, scapegoats immigrant families
  2. **social-app-disinfo** — viral false video about cultural center
  3. **housing-speculation** — private equity buys 3 apartment buildings, mass eviction notices *(content TBD)*
  4. **utility-shutoff** — water authority threatens disconnection for unpaid bills *(content TBD)*
  5. **mutual-aid-raid** — city cites a community fridge for "code violations" *(content TBD)*
- [ ] Validate JSON against schema before shipping

---

## CrisisEngine.ts

- [ ] Create `src/core/simulation/CrisisEngine.ts`
- [ ] Load `crisis_scenarios.json` on game boot
- [ ] Maintain event queue (drawn from `crisisState.pendingQueue` in Zustand)
- [ ] Trigger logic: check for pending crisis on each `advanceDay()` call
- [ ] Expose `triggerCrisis(id)` and `resolveCrisis(choice)` methods
- [ ] `resolveCrisis(choice)`:
  - Apply stat deltas from chosen path to Zustand store
  - Append to `crisisState.historyLog`
  - Clear `activeCrisisId`
  - Trigger world effect (desaturate / bloom) via event

---

## CrisisWireModal.ts

- [ ] Create `src/ui/CrisisWireModal.ts`
- [ ] Render as full-screen HTML overlay (highest z-index)
- [ ] "Breaking wire" visual treatment: newspaper/alert styling
- [ ] Display: scenario title, context paragraph, two choice buttons
- [ ] Choice A button: scapegoating option (warm/amber styling to imply urgency)
- [ ] Choice B button: solidarity option (cool/green styling)
- [ ] No dismiss without choosing — both buttons call `CrisisEngine.resolveCrisis()`
- [ ] Animate in on crisis trigger; animate out after choice made

---

## World Visual Consequence System

- [ ] Define `worldEffect` types: `'desaturate'`, `'bloom'`, `'crisis-emergency'`
- [ ] Implement desaturate effect: CSS filter or canvas post-processing, applied to game container
- [ ] Implement bloom effect: brighter palette, unlock additional tile variants
- [ ] Emergency state (3 consecutive scapegoating choices): flickering red overlay, alarm audio cue
- [ ] Effects stack across crisis resolutions (not reset between events)

---

## Crisis History Log (Town Hall)

- [ ] Town Hall building triggers history log view on interaction
- [ ] Create history log UI overlay:
  - Chronological list of resolved crises
  - Each entry: Day N | Crisis Title | Choice Made | Consequence Summary
- [ ] Read from `crisisState.historyLog` in Zustand (persisted in IndexedDB)
- [ ] Scrollable; mobile touch-friendly

---

## EconomyMath.ts

- [ ] Create `src/core/simulation/EconomyMath.ts`
- [ ] Daily upkeep calculation: subtract base costs from energy and cash on `advanceDay()`
- [ ] Apply commons completion buffs (from `commons.*Progress` thresholds)
- [ ] Stress regeneration: passive stress increase per day, reduced by high trust
- [ ] Energy regen: passive recovery per day (modified by archetype and buffs)
- [ ] Export `applyDailyTick(state): Partial<GameState>` — pure function, no side effects

---

## Acceptance Tests (M4)

- [ ] **Test 4.1:** Triggering a crisis event halts player movement and displays the decision modal
  - Advance day until a crisis triggers (or force via `triggerCrisis('winter-power-surge')`) → confirm player movement paused → confirm modal visible
- [ ] **Test 4.2:** Selecting "Scapegoating" decrements the resilience score; repeating this 3 times triggers an emergency visual state
  - Resolve 3 crises with choice A → confirm `resilienceScore` drops each time → confirm emergency overlay appears
- [ ] **Test 4.3:** Resolved events persist accurately in the history log with choices and outcomes intact
  - Resolve 3 crises with various choices → open Town Hall log → confirm all 3 entries correct after page refresh
