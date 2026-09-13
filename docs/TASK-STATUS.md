# Task Status — District: Common Ground

Last updated: 2026-09-13
Status: **Phase 1 code-complete. Phase 2 (M8–M12) in active development.**

Phase 1 task files and story epics are archived under `docs/archive/`.

---

## Milestone Overview

### Phase 1 — MVP Foundation (Archived)
All Phase 1 task files and story epics are archived under [`docs/archive/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive).

| # | Milestone | Status | Acceptance Tests |
|---|---|---|---|
| M1 | Engine Foundation & Top-Down Canvas | `[x] Complete` | 3 tests |
| M2 | State Store, Archetype Selection & HUD | `[x] Complete` | 3 tests |
| M3 | NPC Interactions & Commons Construction | `[x] Complete` | 3 tests |
| M4 | Crisis Engine & Real-World News System | `[x] Complete` | 3 tests |
| M5 | Multi-Skin Architecture & IRL Quests | `[x] Complete` | 2 tests |
| M6 | PWA Packaging, Performance & Release | `[x] Complete` | 3 tests |
| M7 | Infrastructure, Docker & Go Backend | `[x] Complete` | 3 tests |

### Phase 2 — Living World & Real-World Data Expansion (Active Development)
Specifications authored under [`docs/planning/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning).
Story epics under [`docs/stories/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories).
Task files under [`docs/tasks/`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks).

| # | Milestone | Focus Area | Status | Story | Tasks |
|---|---|---|---|---|---|
| M8 | The Living Economy & District Pulse Engine | Real-world macroeconomic indices, dynamic income/upkeep math, NOAA climate indices | `[~] In Progress` | [EPIC-08](stories/EPIC-08-living-economy.md) | [M8 tasks](tasks/M8-living-economy.md) |
| M9 | "The District Dispatch" & Dynamic AI Narrative Engine | Free AI model pipeline (Ollama/Groq), news-to-crisis synthesis, dynamic NPC rumors | `[~] In Progress` | [EPIC-09](stories/EPIC-09-district-dispatch.md) | [M9 tasks](tasks/M9-district-dispatch.md) |
| M10 | District Expansion & Living World Systems | North Transit Hub, East Canal, day/night cycles, resilience visual tiers, Scraps the cat | `[~] In Progress` | [EPIC-10](stories/EPIC-10-district-expansion.md) | [M10 tasks](tasks/M10-district-expansion.md) |
| M11 | Shared Commons, Climate Migration & Anti-Fascist Defense | Community Land Trust, Tool Library, climate migrant mechanic, solidarity pool | `[~] In Progress` | [EPIC-11](stories/EPIC-11-shared-commons.md) | [M11 tasks](tasks/M11-shared-commons.md) |
| M12 | Procedural Web Audio Synth v2, Mobile Polish & Release QA | Rain/cat purr synthesis, mobile haptics, accessibility WCAG AA, Lighthouse 95+ | `[~] In Progress` | [EPIC-12](stories/EPIC-12-audio-v2-polish.md) | [M12 tasks](tasks/M12-audio-v2-polish.md) |

---

## M8 — Living Economy & District Pulse Engine

Story: `docs/stories/EPIC-08-living-economy.md`
Tasks: `docs/tasks/M8-living-economy.md`

| Task | Status |
|---|---|
| `apps/api/internal/pulse/` package skeleton | `[x]` |
| `economy.go` — seasonal sinusoidal multipliers + 24h in-memory cache | `[x]` |
| `economy.go` — fail-safe defaults on network error | `[x]` |
| `news.go` stub — placeholder empty array | `[x]` |
| `GET /api/v1/pulse/economy` + climate endpoints | `[x]` |
| `packages/shared-types` — `DistrictPulseState` type | `[x]` |
| `apps/web/src/api/endpoints/pulse.ts` | `[x]` |
| `EconomyMath.ts` — multiplier integration | `[x]` |
| `SeasonalWave.ts` — offline sinusoidal fallback | `[x]` |
| `useGameStore.ts` — `pulseState` field | `[x]` |
| `TopHUD.ts` — Economic Barometer chip | `[x]` |
| Vitest: multiplier combos + seasonal peaks | `[x]` |
| Go httptest: pulse economy + fail-safe | `[x]` |

---

## M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Story: `docs/stories/EPIC-09-district-dispatch.md`
Tasks: `docs/tasks/M9-district-dispatch.md`

| Task | Status |
|---|---|
| `BroadsheetModal.ts` — 3D unfold, newsprint, headline citation, crossword | `[x]` |
| `RadioWidget.ts` — pirate FM tuner, amber LED, 3 frequencies | `[x]` |
| `advanceDay()` — broadsheet trigger before day advances | `[x]` |
| `pulse/news.go` — RSS ingestion + 7-archetype classifier | `[x]` |
| `narrative/client.go` — multi-provider AI client (Ollama/Groq/Cloudflare) | `[x]` |
| `narrative/prompts.go` — system prompt, character voice pillars, lore bible | `[x]` |
| `narrative/validator.go` — JSON schema validator + mathematical clamp | `[x]` |
| `narrative/cache.go` — DB persistence (`dynamic_scenarios` table) | `[x]` |
| `GET /api/v1/pulse/news` & `GET /api/v1/narrative/daily-scenarios` | `[x]` |
| `crisis_scenarios.json` expanded to 25+ curated fallback scenarios | `[x]` |
| Dynamic NPC Rumor Mill (`NPCEntity.ts` & `DialogueOverlay.ts`) | `[ ]` |
| Tests (Vitest + Go httptest + validator clamping tests) | `[~]` |

---

## M10 — District Expansion & Living World Systems

Story: `docs/stories/EPIC-10-district-expansion.md`
Tasks: `docs/tasks/M10-district-expansion.md`

| Task | Status |
|---|---|
| Resilience visual tier CSS (crisis/stabilising/thriving/emergency) | `[x]` |
| `resilienceTier()` in EconomyMath + WorldScene subscribe | `[x]` |
| Day/night lighting — tint overlay rect, 4 phases, 2-min cycle | `[x]` |
| `ScrapsEntity.ts` — cat NPC, patrol, purr, hearts, Stress −5 | `[x]` |
| `WorldScene.ts` — instantiate ScrapsEntity | `[x]` |
| Map expansion to 64×80 (4 named zones) | `[ ]` |
| `PigeonEntity.ts` — scatter AI | `[ ]` |
| Zone detection → HUD zone label | `[ ]` |
| Streetlamp night overlay sprite | `[ ]` |
| Feed interaction for Scraps (cash > 0, Stress −10) | `[ ]` |
| Tests (manual) | `[ ]` |

---

## M11 — Shared Commons, Climate Migration & Anti-Fascist Defense

Story: `docs/stories/EPIC-11-shared-commons.md`
Tasks: `docs/tasks/M11-shared-commons.md`

| Task | Status |
|---|---|
| `useGameStore.ts` — `toolLibraryProgress` + `landTrustProgress` fields | `[x]` |
| Node D: Community Tool Library — WorldScene node + ConstructionModal | `[x]` |
| Node E: Community Land Trust — WorldScene node + ConstructionModal | `[x]` |
| `solidarity_pool.go` + `GET /api/v1/district/resilience` | `[x]` |
| Tool Library 20% upkeep buff wired in EconomyMath | `[ ]` |
| Climate migration crisis archetype (3 scenarios) | `[ ]` |
| Anti-fascist flyer objects + tear-down action | `[ ]` |
| `TownHallAssembly.ts` — monthly vote modal | `[ ]` |
| `TopHUD.ts` — District Pulse badge (global solidarity dot) | `[ ]` |
| Tests | `[ ]` |

---

## M12 — Audio Synth v2, Mobile Polish & Release QA

Story: `docs/stories/EPIC-12-audio-v2-polish.md`
Tasks: `docs/tasks/M12-audio-v2-polish.md`

| Task | Status |
|---|---|
| `SoundSynth.ts` v2 — rain, purr, bell, static, lo-fi, crisis, solidarity, BGM | `[x]` |
| Mobile haptics (`navigator.vibrate`) — bell, purr, crisis | `[x]` |
| All modals: `role="dialog"`, `aria-modal`, `aria-labelledby` | `[x]` |
| HUD `statsEl`: `aria-live="polite"` | `[x]` |
| `Escape` closes ConstructionModal + HistoryModal | `[x]` |
| `:focus-visible` 2px #66dd88 outline on `.interactive` / `button` / `input` | `[x]` |
| `@media (prefers-reduced-motion)` CSS | `[x]` |
| Arrow keys navigate dialogue choices | `[ ]` |
| WCAG AA contrast check: all text 4.5:1 | `[ ]` |
| Vitest: EconomyMath multiplier combos (applyDailyTick) | `[ ]` |
| Vitest: CrisisEngine — enqueue, resolve, history | `[ ]` |
| Vitest: IrlQuestSystem — day lock, buff application | `[ ]` |
| Vitest: SeasonalWave — seasonal peaks | `[ ]` |
| Go: pulse economy + solidarity pool httptest | `[ ]` |
| Lighthouse audit — `docs/lighthouse-report.md` | `[ ]` |

---

## M1 — Engine Foundation

Task file: `docs/archive/M1-engine-foundation.md`
Stories: `docs/archive/EPIC-01-engine-foundation.md`

| Task | Status |
|---|---|
| Vite@8 (rolldown) + TypeScript project init | `[x]` |
| Dependency install (oxlint, phaser, zustand, idb-keyval) | `[x]` |
| Tailwind CSS config | `[x]` |
| Directory structure | `[x]` |
| WorldScene.ts — viewport + tilemap | `[x]` |
| InputManager.ts — WASD | `[x]` |
| InputManager.ts — virtual thumbstick | `[x]` |
| PlayerEntity.ts — movement + animation | `[x]` |
| CollisionSystem.ts — AABB tile checks | `[x]` |
| **Test 1.1:** Stable framerate mobile emulation | `[ ]` manual |
| **Test 1.2:** Collision stops player without clip | `[ ]` manual |
| **Test 1.3:** Touch release → velocity 0 | `[ ]` manual |

---

## M2 — State Store, Archetype Selection & HUD

Task file: `docs/archive/M2-state-hud.md`
Stories: `docs/archive/EPIC-02-state-hud.md`


| Task | Status |
|---|---|
| useGameStore.ts — GameState interface | `[x]` |
| actions.ts — all mutations | `[x]` |
| Archetype stat seeding (Pip/Morgan/Arthur) | `[x]` |
| IndexedDB persistence (idb-keyval) | `[x]` |
| Character Select Screen | `[x]` |
| TopHUD.ts — overlay component | `[x]` |
| SoundSynth.ts — procedural audio | `[x]` |
| **Test 2.1:** Archetype seeds correct stats | `[ ]` manual |
| **Test 2.2:** Browser refresh restores full state | `[ ]` manual |
| **Test 2.3:** Audio no autoplay errors on mobile | `[ ]` manual |

---

## M3 — NPC Interactions & Commons Construction

Task file: `docs/archive/M3-npc-construction.md`
Stories: `docs/archive/EPIC-03-npc-construction.md`

| Task | Status |
|---|---|
| NPCEntity.ts — proximity detection | `[x]` |
| Context Action Button — dynamic state | `[x]` |
| DialogueOverlay.ts — typewriter + choices | `[x]` |
| Construction node A: Community Kitchen | `[x]` |
| Construction node B: Rooftop Solar | `[x]` |
| Construction node C: Legal Defense Fund | `[x]` |
| Dynamic tilemap swap on build completion | `[x]` |
| EconomyMath.ts — resilience + buff scoring | `[x]` |
| **Test 3.1:** NPC proximity → action button → dialogue | `[ ]` manual |
| **Test 3.2:** Contribution updates progress + HUD | `[ ]` manual |
| **Test 3.3:** Build threshold → tilemap swap + buff | `[ ]` manual |

---

## M4 — Crisis Engine

Task file: `docs/archive/M4-crisis-engine.md`
Stories: `docs/archive/EPIC-04-crisis-engine.md`

| Task | Status |
|---|---|
| crisis_scenarios.json — schema + 5 scenarios | `[x]` |
| CrisisEngine.ts — queue + resolve logic | `[x]` |
| CrisisWireModal.ts — breaking news overlay | `[x]` |
| World visual consequence system | `[x]` |
| EconomyMath.ts — daily tick + buffs | `[x]` |
| Town Hall crisis history log | `[x]` |
| **Test 4.1:** Crisis triggers → movement paused → modal shown | `[ ]` manual |
| **Test 4.2:** 3x scapegoat → resilience drops → emergency state | `[ ]` manual |
| **Test 4.3:** History log persists across sessions | `[ ]` manual |

---

## M5 — Multi-Skin Architecture & IRL Quests

Task file: `docs/archive/M5-skins-quests.md`
Stories: `docs/archive/EPIC-05-skins-quests.md`

| Task | Status |
|---|---|
| SkinInterface.ts — SkinManifest type + EntityToken | `[x]` |
| solarpunk/skin.manifest.json | `[x]` |
| retro_gb/skin.manifest.json | `[x]` |
| ThemeManager.ts — runtime skin switcher | `[x]` |
| Solarpunk skin assets (all EntityTokens) | `[ ]` art assets |
| Retro GB skin assets (all EntityTokens) | `[ ]` art assets |
| Chiptune audio profile in SoundSynth | `[x]` (profile hooks; synthesis modes deferred) |
| Settings menu — skin switcher UI | `[x]` |
| IrlQuestSystem.ts — 3 quests + daily reset | `[x]` |
| **Test 5.1:** Skin switch — no state reset, within time budget | `[ ]` manual |
| **Test 5.2:** IRL quest buffs + day-lock | `[ ]` manual |

---

## M6 — PWA Packaging & Release

Task file: `docs/archive/M6-pwa-release.md`
Stories: `docs/archive/EPIC-06-pwa-release.md`

| Task | Status |
|---|---|
| vite-plugin-pwa config + service worker | `[x]` |
| manifest.webmanifest + PWA icons | `[x]` |
| All assets converted to WebP | `[x]` (skin art deferred; data JSON + manifests covered) |
| Bundle size within budget | `[x]` (Phaser 319 KB gz, app 18 KB gz, vendor 4 KB gz) |
| Social share link generator | `[x]` (ShareModal.ts, Web Share API + fallback) |
| Cross-browser test: Mobile Safari iOS | `[ ]` manual |
| Cross-browser test: Mobile Chrome Android | `[ ]` manual |
| Cross-browser test: Desktop Chrome | `[ ]` manual |
| Cross-browser test: Desktop Firefox | `[ ]` manual |
| **Lighthouse:** Performance 90+ | `[ ]` manual |
| **Lighthouse:** Accessibility 95+ | `[ ]` manual |
| **Lighthouse:** Best Practices 95+ | `[ ]` manual |
| **Lighthouse:** PWA 95+ | `[ ]` manual |
| Cold start under target threshold on 4G | `[ ]` manual |

---

## M7 — Infrastructure, Docker & Go Backend

Task file: `docs/archive/M7-infra-backend.md`
Stories: `docs/archive/EPIC-07-infra-backend.md`

| Task | Status |
|---|---|
| Mono-repo restructure → `apps/web/`, `apps/api/` | `[x]` |
| Root `package.json` npm workspaces | `[x]` |
| `packages/shared-types/` — cross-app TypeScript types | `[x]` |
| Go module init (`apps/api/go.mod`) | `[x]` |
| `cmd/server/main.go` — router + wiring | `[x]` |
| `internal/config/config.go` — env config | `[x]` |
| `internal/db/db.go` — pgx pool | `[x]` |
| `internal/middleware/` — CORS + JWT auth | `[x]` |
| `internal/auth/` — register, login, token | `[x]` |
| `internal/save/` — GET/PUT game state | `[x]` |
| `internal/gamedata/` — crisis scenarios endpoint | `[x]` |
| `db/migrations/` — users, saves, crisis_log | `[x]` |
| `apps/web/Dockerfile` — node build → nginx serve | `[x]` |
| `apps/web/nginx.conf` — SPA routing + caching | `[x]` |
| `apps/api/Dockerfile` — Go build → scratch image | `[x]` |
| `docker-compose.yml` — web + api + db + health checks | `[x]` |
| `docker-compose.dev.yml` — volume mounts, hot-reload | `[x]` |
| `.env.example` — all required secrets documented | `[x]` |
| `apps/web/src/api/client.ts` — typed fetch wrapper | `[x]` |
| `apps/web/src/api/endpoints/auth.ts` | `[x]` |
| `apps/web/src/api/endpoints/save.ts` | `[x]` |
| Hybrid persistence (server sync → IndexedDB fallback) | `[x]` |
| Auth overlay UI (`AuthOverlay.ts`) | `[x]` |
| Go unit tests — auth service (table-driven) | `[x]` |
| Go integration tests — save repository (testcontainers) | `[x]` |
| Go HTTP tests — all handlers (httptest) | `[x]` |
| `vitest.config.ts` + frontend unit tests | `[x]` |
| `.github/workflows/ci.yml` — lint + test + docker build | `[x]` |
| CLAUDE.md updated with mono-repo layout | `[x]` |
| **Test 7.1:** `docker compose up` → all services healthy ≤60s | `[ ]` manual |
| **Test 7.2:** Register → save → restart → state restored from server | `[ ]` manual |
| **Test 7.3:** `go test ./...` + `vitest run` both pass in CI | `[ ]` manual |

---

## Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked |
