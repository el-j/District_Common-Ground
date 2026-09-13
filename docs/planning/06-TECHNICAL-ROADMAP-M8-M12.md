# 06 — Master Technical Roadmap: Milestones M8 through M12

**Authored by:** Engineering Backend Architect 🛠️ & Engineering Frontend Developer 💻  
**Status:** Living Engineering Plan (v2.0)  
**Parent Document:** [`CLAUDE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/CLAUDE.md)  

---

## 1. Roadmap Architecture Overview

The completed foundation (Milestones M1–M7) delivers an offline-capable PWA top-down engine with Go cloud saves, basic crisis logic, and community construction. 

**Phase 2 (Milestones M8–M12)** expands District: Common Ground into a fully reactive, living urban simulation tethered to real-world civic and economic data:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 2 MILESTONE PROGRESSION                        │
├────────────────────────────────────────────────────────────────────────┤
│ M8: The Living Economy & District Pulse Engine                         │
│     • Ingest macroeconomic indices (Food, Energy, Wages, Transit)      │
│     • Dynamic daily upkeep math & archetype income streams             │
│     • Offline deterministic seasonal economic waves                    │
├────────────────────────────────────────────────────────────────────────┤
│ M9: "The District Dispatch" News & Morning Paper System                │
│     • Civic RSS & municipal alert aggregator in Go backend             │
│     • Procedural crisis generator & scenario schema v2                 │
│     • Tactile Morning Broadsheet & Pirate Radio tuning UI              │
├────────────────────────────────────────────────────────────────────────┤
│ M10: District Expansion & Living World Systems                         │
│     • Expanded map: North Transit Hub, East Canal, South Solar Yard    │
│     • Dynamic day/night light cycle & real weather shaders             │
│     • Ambient life: Scraps the cat, pigeons, bustling NPC routines     │
├────────────────────────────────────────────────────────────────────────┤
│ M11: The Shared Commons & Asynchronous District Network                │
│     • Community Land Trust & Tool Library construction nodes           │
│     • Asynchronous solidarity index (shared cross-player district)     │
│     • End-of-month community assembly & policy voting                  │
├────────────────────────────────────────────────────────────────────────┤
│ M12: Procedural Audio Synth v2, Mobile Polish & Release                │
│     • Web Audio synthesis: rain on tin, cat purrs, lo-fi radio chords │
│     • Mobile haptics & gesture polish                                  │
│     • Comprehensive automated test suite & Lighthouse 95+ release      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Milestone M8 — The Living Economy & District Pulse Engine

**Objective**: Connect in-game daily resource flows to normalized macroeconomic data feeds, providing dynamic income for Pip, commuting friction for Morgan, and property dilemmas for Arthur.

### Tasks
- [ ] **Go API Ingestion Service**:
  - Implement `apps/api/internal/pulse/economy.go` to fetch, normalize, and cache indices for:
    - Food & Groceries ($M_{\text{food}} \in [0.8, 1.5]$)
    - Energy & Utilities ($M_{\text{energy}} \in [0.7, 1.8]$)
    - Gig Courier Wages ($M_{\text{wage}} \in [0.75, 1.4]$)
    - Transit Disruption ($M_{\text{transit}} \in [0.5, 1.5]$)
    - Climate Heat Anomaly ($M_{\text{heat}} \in [1.0, 2.2]$ via NOAA/Copernicus)
    - Climate Displacement Pressure ($M_{\text{migrant}} \in [0.8, 2.5]$ via UNHCR)
  - Expose `GET /api/v1/pulse/economy` and `GET /api/v1/pulse/climate` with 24-hour cache and fail-safe defaults.
- [ ] **Shared Types Expansion**:
  - Update `packages/shared-types/src/index.ts` with `DistrictPulseState` and `EconomicMultipliers`.
- [ ] **Frontend Dynamic Math**:
  - Refactor `apps/web/src/core/simulation/EconomyMath.ts` to compute daily upkeep using live multipliers and commons mitigations.
  - Implement archetype earning logic: Pip courier jobs, Morgan salary/commute, Arthur rental balance.
- [ ] **Offline Deterministic Fallback**:
  - Implement client-side sinusoidal seasonal wave generator for offline play.
- [ ] **HUD Economic Barometer**:
  - Add compact economic trend indicator to `TopHUD.ts` (showing inflation/energy status).

### Acceptance Tests
- **Test 8.1**: When $M_{\text{food}} = 1.30$, grocery upkeep increases by $30\%$ until Community Kitchen is built, after which food upkeep is $0.
- **Test 8.2**: Disconnecting the network seamlessly falls back to cached or deterministic seasonal indices without UI errors.
- **Test 8.3**: Pip's courier payouts scale accurately with $M_{\text{wage}}$.

---

## 3. Milestone M9 — "The District Dispatch" & Broadsheet News System

**Objective**: Ingest civic news and transit alerts, translating them into morning broadsheet newspapers, pirate radio broadcasts, and dynamic crisis scenarios.

### Tasks
- [ ] **Go API News Aggregator**:
  - Implement `apps/api/internal/pulse/news.go` to fetch civic RSS feeds and classify articles into 7 Crisis Archetypes (`LABOR_TRANSIT`, `CLIMATE_EXTREME`, `HOUSING_SPECULATE`, `FOOD_HEALTH`, `CIVIC_DISINFO`, `MIGRATION_SANCT`, `COMMUNITY_DIVISION`).
  - Expose `GET /api/v1/pulse/news`.
- [ ] **Scenario Generator & Vault**:
  - Expand `crisis_scenarios.json` to 25+ authored templates with real-world anchor hooks, including Heat Dome Cooling Sanctuaries, Divisive Agitator Rally defense, Bot-Farm Smear Campaigns, and Undocumented Labor Collectives.
  - Upgrade `CrisisEngine.ts` to match real news keywords to active scenarios.
- [ ] **Tactile Morning Broadsheet**:
  - Create `apps/web/src/ui/BroadsheetModal.ts` displaying *"The Daily District Ground"* with unfolding page animation, headline, weather, and editorial.
- [ ] **Radio Free Commons Widget**:
  - Create `apps/web/src/ui/RadioWidget.ts` with interactive tuning dial, static audio, and amber crisis ticker.

### Acceptance Tests
- **Test 9.1**: Advancing to a new day displays the morning paper with relevant economic and civic news.
- **Test 9.2**: Selecting solidarity or scapegoating logs the choice with real-world context into the Town Hall archive.
- **Test 9.3**: Radio tuning knob smoothly transitions between frequencies with audio static.

---

## 4. Milestone M10 — District Expansion & Living World Systems

**Objective**: Expand the physical map to incorporate the Transit Hub, East Canal, and Tenement courtyards, with dynamic day/night cycles and real weather shaders.

### Tasks
- [ ] **Tilemap Expansion**:
  - Expand `WorldScene.ts` tilemap from $32 \times 32$ to $64 \times 48$ tiles with distinct North, East, Central, and South zones.
  - Implement the North Transit Rail platform and East Canal dikes.
- [ ] **Dynamic Day/Night Lighting**:
  - Add smooth color grading in `WorldScene.ts` transitioning through Dawn (peach), Midday (sunlight), Dusk (amber/violet), and Night (indigo).
  - Add streetlamp and porch light illumination masks.
- [ ] **Weather Shader Pipeline**:
  - Implement rain particles with asphalt ripples and cold-snap frost overlays.
- [ ] **Ambient Street Life & Scraps the Cat**:
  - Add Scraps the stray cat entity with napping routines, petting interaction, and purr stress buffs.
  - Add scattered pigeons that fly off when approached.

### Acceptance Tests
- **Test 10.1**: Navigating across all zones maintains a solid 60 FPS on mobile devices.
- **Test 10.2**: Petting Scraps decrements player stress and triggers purr audio and heart particle effects.
- **Test 10.3**: Rain overlay triggers automatically during stormy weather events.

---

## 5. Milestone M11 — The Shared Commons & Asynchronous District Network

**Objective**: Allow players' collective solidarity choices to pool into a global district health index, and introduce the Community Land Trust endgame.

### Tasks
- [ ] **Go API Asynchronous Solidarity Pool**:
  - Implement `internal/save/solidarity_pool.go` aggregating anonymous solidarity decisions across all players.
  - Expose `GET /api/v1/district/resilience` returning the global community index.
- [ ] **New Construction Nodes**:
  - Add **Node D: Community Tool Library** (reduces appliance repair and vehicle upkeep).
  - Add **Node E: Community Land Trust** (locks buildings against corporate buyout).
- [ ] **End-of-Month Assembly**:
  - Create monthly Town Hall assembly modal where players vote on neighborhood policy initiatives.

### Acceptance Tests
- **Test 11.1**: Global solidarity index updates asynchronously without blocking local gameplay.
- **Test 11.2**: Completing the Community Land Trust unlocks the permanent "Safe Haven" district ending.

---

## 6. Milestone M12 — Procedural Audio Synth v2, Polish & Release

**Objective**: Finalize procedural Web Audio soundscapes, mobile haptics, full PWA caching, and automated QA verification.

### Tasks
- [ ] **SoundSynth v2 Implementation**:
  - Expand procedural synthesizer in `SoundSynth.ts`:
    - Generative rain and storm noise oscillators.
    - Cat purr dual-triangle LFO synthesis.
    - Cargo bicycle bell dual-sine decay.
    - Procedural lo-fi chords for radio broadcasts.
- [ ] **Mobile Tactile Haptics**:
  - Integrate `navigator.vibrate` for bicycle bells, crisis alerts, and cat purrs.
- [ ] **Testing & Quality Assurance**:
  - Vitest test suite covering all economic math, crisis pipelines, and store actions.
  - Go unit and integration tests for pulse and news endpoints.
  - Run Lighthouse audits ensuring Performance > 90 and PWA > 95.

### Acceptance Tests
- **Test 12.1**: Zero external MP3 or audio asset requests; all sounds generated in <1ms latency.
- **Test 12.2**: All unit and integration tests pass cleanly in CI.
- **Test 12.3**: PWA operates fully offline with valid service worker caching.
