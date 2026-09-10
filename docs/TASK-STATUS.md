# Task Status — District: Common Ground

Last updated: 2026-09-10
Current sprint: **M2 — State Store, Archetype Selection & HUD**

---

## Milestone Overview

| # | Milestone | Status | Acceptance Tests |
|---|---|---|---|
| M1 | Engine Foundation & Top-Down Canvas | `[x] Complete` | 3 tests |
| M2 | State Store, Archetype Selection & HUD | `[~] In Progress` | 3 tests |
| M3 | NPC Interactions & Commons Construction | `[ ] Not Started` | 3 tests |
| M4 | Crisis Engine & Real-World News System | `[ ] Not Started` | 3 tests |
| M5 | Multi-Skin Architecture & IRL Quests | `[ ] Not Started` | 2 tests |
| M6 | PWA Packaging, Performance & Release | `[ ] Not Started` | 3 tests |

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

Task file: `docs/tasks/M2-state-hud.md`
Stories: `docs/stories/EPIC-02-state-hud.md`

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

Task file: `docs/tasks/M3-npc-construction.md`
Stories: `docs/stories/EPIC-03-npc-construction.md`

| Task | Status |
|---|---|
| NPCEntity.ts — proximity detection | `[ ]` |
| Context Action Button — dynamic state | `[ ]` |
| DialogueOverlay.ts — typewriter + choices | `[ ]` |
| Construction node A: Community Kitchen | `[ ]` |
| Construction node B: Rooftop Solar | `[ ]` |
| Construction node C: Legal Defense Fund | `[ ]` |
| Dynamic tilemap swap on build completion | `[ ]` |
| **Test 3.1:** NPC proximity → action button → dialogue | `[ ]` |
| **Test 3.2:** Contribution updates progress + HUD | `[ ]` |
| **Test 3.3:** Build threshold → tilemap swap + buff | `[ ]` |

---

## M4 — Crisis Engine

Task file: `docs/tasks/M4-crisis-engine.md`
Stories: `docs/stories/EPIC-04-crisis-engine.md`

| Task | Status |
|---|---|
| crisis_scenarios.json — schema + 5 scenarios | `[ ]` |
| CrisisEngine.ts — queue + resolve logic | `[ ]` |
| CrisisWireModal.ts — breaking news overlay | `[ ]` |
| World visual consequence system | `[ ]` |
| EconomyMath.ts — daily tick + buffs | `[ ]` |
| Town Hall crisis history log | `[ ]` |
| **Test 4.1:** Crisis triggers → movement paused → modal shown | `[ ]` |
| **Test 4.2:** 3x scapegoat → resilience drops → emergency state | `[ ]` |
| **Test 4.3:** History log persists across sessions | `[ ]` |

---

## M5 — Multi-Skin Architecture & IRL Quests

Task file: `docs/tasks/M5-skins-quests.md`
Stories: `docs/stories/EPIC-05-skins-quests.md`

| Task | Status |
|---|---|
| SkinInterface.ts — SkinManifest type + EntityToken | `[ ]` |
| solarpunk/skin.manifest.json | `[ ]` |
| retro_gb/skin.manifest.json | `[ ]` |
| ThemeManager.ts — runtime skin switcher | `[ ]` |
| Solarpunk skin assets (all EntityTokens) | `[ ]` |
| Retro GB skin assets (all EntityTokens) | `[ ]` |
| Chiptune audio profile in SoundSynth | `[ ]` |
| Settings menu — skin switcher UI | `[ ]` |
| IrlQuestSystem.ts — 3 quests + daily reset | `[ ]` |
| **Test 5.1:** Skin switch — no state reset, within time budget | `[ ]` |
| **Test 5.2:** IRL quest buffs + day-lock | `[ ]` |

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

## Legend

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| `[!]` | Blocked |
