# Task Status — District: Common Ground

Last updated: 2026-09-12
Current sprint: **M6 — PWA Packaging & Release**

---

## Milestone Overview

| # | Milestone | Status | Acceptance Tests |
|---|---|---|---|
| M1 | Engine Foundation & Top-Down Canvas | `[x] Complete` | 3 tests |
| M2 | State Store, Archetype Selection & HUD | `[x] Complete` | 3 tests |
| M3 | NPC Interactions & Commons Construction | `[x] Complete` | 3 tests |
| M4 | Crisis Engine & Real-World News System | `[x] Complete` | 3 tests |
| M5 | Multi-Skin Architecture & IRL Quests | `[x] Complete` | 2 tests |
| M6 | PWA Packaging, Performance & Release | `[ ] Not Started` | 3 tests |
| M7 | Infrastructure, Docker & Go Backend | `[x] Complete` | 3 tests |

---

## M1 — Engine Foundation

Task file: `docs/tasks/M1-engine-foundation.md`
Stories: `docs/stories/EPIC-01-engine-foundation.md`

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

Task file: `docs/tasks/M4-crisis-engine.md`
Stories: `docs/stories/EPIC-04-crisis-engine.md`

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

Task file: `docs/tasks/M5-skins-quests.md`
Stories: `docs/stories/EPIC-05-skins-quests.md`

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

Task file: `docs/tasks/M6-pwa-release.md`
Stories: `docs/stories/EPIC-06-pwa-release.md`

| Task | Status |
|---|---|
| vite-plugin-pwa config + service worker | `[ ]` |
| manifest.webmanifest + PWA icons | `[ ]` |
| All assets converted to WebP | `[ ]` |
| Bundle size within budget | `[ ]` |
| Social share link generator | `[ ]` |
| Cross-browser test: Mobile Safari iOS | `[ ]` |
| Cross-browser test: Mobile Chrome Android | `[ ]` |
| Cross-browser test: Desktop Chrome | `[ ]` |
| Cross-browser test: Desktop Firefox | `[ ]` |
| **Lighthouse:** Performance 90+ | `[ ]` |
| **Lighthouse:** Accessibility 95+ | `[ ]` |
| **Lighthouse:** Best Practices 95+ | `[ ]` |
| **Lighthouse:** PWA 95+ | `[ ]` |
| Cold start under target threshold on 4G | `[ ]` |

---

## M7 — Infrastructure, Docker & Go Backend

Task file: `docs/tasks/M7-infra-backend.md`
Stories: `docs/stories/EPIC-07-infra-backend.md`

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
