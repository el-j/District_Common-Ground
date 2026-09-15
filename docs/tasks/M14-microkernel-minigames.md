# M14 — Dynamic Microkernel Architecture, Living District Builder & Extensible Minigames

Stories: [`docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md)  
Planning: [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)  
Kickstart Reference: [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md)  
Status: `[x] Complete` (sections 1–6 corrected below; QA coverage gaps in section 7 — see [`M14-FOLLOWUP-qa-coverage.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M14-FOLLOWUP-qa-coverage.md))

> **Audit note (2026-09-15):** sections 1–6 below were still showing every box unchecked despite the real implementation existing and passing (verified by reading the actual files, not just their presence). This was pure doc staleness — checked off below to match reality. The frontend courier-rush minigame also ended up at `packages/minigame-courier-rush/` (a standalone package, per the M20 convention) rather than the doc's originally-specified `apps/web/src/minigames/courier-rush/` — same deliberate path deviation pattern as M19's bitchat plugin.

---

## 1. Contracts & Shared Interfaces
- [x] `packages/shared-types/src/kernel.ts`:
  - [x] `MinigameManifest` (id, version, title, category, thumbnail, entrypointUrl, permissions, hardwareTarget)
  - [x] `GameSessionConfig` (sessionId, userId, archetype, difficulty, districtDay, customData)
  - [x] `GameSessionContext` (user stats, host platform bridge: `grantRewards`, `playSFX`, `notify`, `closeMinigame`)
  - [x] `MinigameInstance` interface (`mount`, `unmount`, `onResize`, `onPause`, `onResume`)
  - [x] `DistrictParcelState` (plotId, position, buildingType, stage: 0..3, progress: 0..100, lastHarvestDay)

---

## 2. Go Backend Microkernel (`apps/api/internal/kernel/`)
- [x] `contracts.go` — Go interface definitions for `GamePlugin`, `SessionConfig`, `GameSessionResult`, `ResourceGrant`
- [x] `registry.go` — In-memory thread-safe dynamic plugin registry with concurrent lookup
- [x] Plugin discovery — implemented as static, explicit `Register()` calls (`apps/api/internal/plugins/register.go`'s `RegisterAll()`) rather than a `manifest_loader.go` filesystem scanner; a genuinely dynamic `.so`-based loader was attempted separately and is tracked as blocked tech debt — see [`TD1`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/TD1-native-plugin-loader-cgo-conflict.md)
- [x] `session_manager.go` — Ephemeral HMAC-signed session token generator and validator (anti-cheat scoring)
- [x] Router endpoints in `apps/api/cmd/server/main.go`:
  - [x] `GET /api/v1/games` — return list of active, verified minigames
  - [x] `POST /api/v1/games/:id/session` — authenticate and issue signed session token
  - [x] `POST /api/v1/games/:id/complete` — score submission, verification, and atomic database wallet credit
  - [x] Trusted plugin review flow: `POST /api/v1/plugins/verification-requests`, `GET .../verification-requests`, `POST .../verification-requests/{id}/review` (`verification_requests.go`)
- [x] Built-in reference plugin: `packages/go/plugin-courier-rush/plugin.go`, registered via `courierrush.Register(kernel.DefaultRegistry)` in `apps/api/internal/plugins/register.go`

---

## 3. TypeScript Frontend Shell (`apps/web/src/core/kernel/`)
- [x] `MinigameLoader.ts` — Dynamic ESM `import()` loader with remote URL caching and error recovery
- [x] `MinigameContainer.ts` — Sandboxed DOM/Canvas wrapper managing mount lifecycle and unmount teardown
- [x] `HostPlatformAPI.ts` — Bridge connecting isolated minigame context to Zustand store (`useGameStore`)
- [x] Top-level Minigame Overlay modal, backdrop blur, pause controls, and close button

---

## 4. Tier 1 — Living District Builder ("Farmville for the Commons")
- [x] `apps/web/src/builder/DistrictGrid.ts`:
  - [x] Interactive 12-plot district grid
  - [x] Plot selection, inspection card, and blueprint picker
- [x] `apps/web/src/builder/ConstructionStages.ts`:
  - [x] 4-Tier visual state machine (Blighted ➔ Groundwork ➔ Framing ➔ Solarpunk Bloom)
  - [x] Animated elements
- [x] `apps/web/src/builder/TactileEffects.ts`:
  - [x] Procedural Web Audio construction sounds and celebratory chimes
  - [x] Canvas dust puff particles and confetti upon stage completion
- [x] Morning harvest / production cycles — implemented via `DistrictGrid.ts`'s parcel-tier mechanics rather than a separate `ProductionManager.ts` file; functionally covered, not a gap.

---

## 5. Tier 2 — Street-Level Questing Minigame Mode
- [x] `apps/web/src/builder/DistrictGrid.ts` reads back into `WorldScene.ts` — dynamic map sync confirmed
- [ ] Camera Zoom Controller (Macro ↔ Micro view toggle) — not built as a distinct feature; genuinely out of scope still
- [ ] Physical Minigame Portals in the walkable world (bike near Tenements, kitchen lantern, solar control box launching minigames from inside `WorldScene`) — not built; the courier-rush minigame is reachable through the Minigame Overlay/HUD, not a walkable-world portal object
- [ ] Emergent street encounters (eviction defense rally, lost pet rescue, flyer scraping) — not built as a distinct system (flyer tear-down exists per M11, but as a standing world object, not a spawned "encounter")

---

## 6. Tier 3 — Reference Minigame: "Cargo Courier Rush" (*Pizza Taxi* style)
- [x] `packages/minigame-courier-rush/` (standalone package, not `apps/web/src/minigames/courier-rush/` — see path-deviation note above):
  - [x] `manifest.json` conforming to `MinigameManifest`
  - [x] `index.ts` exporting `createMinigame(): MinigameInstance`
  - [x] Cargo bike driving mechanics, delivery routing, timer, scoring, rewards payout — implementation present and exercised by `MinigameLoader.test.ts`'s `grantRewards` mutation test

---

## 7. Quality Assurance & Verification Tests
- [x] **Test 14.1 (Kernel Isolation):** covered by `TestRegistry_MockPlugin_CanBeRegisteredWithoutTouchingKernelPackage` (`registry_test.go`)
- [ ] **Test 14.2 (Zero Memory Leaks):** no dedicated mount/unmount-×10 test exists — `MinigameLoader.test.ts` only covers registration + reward-grant mutation, not lifecycle/teardown. **Gap, not covered.**
- [x] **Test 14.3 (Tactile Builder Upgrades):** covered by `DistrictGrid.test.ts`'s "upgrades parcel to next tier when player has sufficient resources"
- [ ] **Test 14.4 (Full Courier Delivery Loop):** no integration test exercises the full session→complete→DB-credit path end-to-end. **Gap, not covered.**
- [ ] **Test 14.5 (Trusted Plugin Review Flow):** `verification_requests.go` has no corresponding `verification_requests_test.go` — the submit/list/review handlers are untested. **Gap, not covered.**

See [`M14-FOLLOWUP-qa-coverage.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M14-FOLLOWUP-qa-coverage.md) for the tracked follow-up on the three uncovered tests.

---

## 8. Addendum — Frontend `Kernel`: generalizing beyond minigames

M17 added three real features (`geo-weather`, `mesh-comms`, `mutual-credit`) as plain files under `apps/web/src/plugins/*`, statically imported directly by `TopHUD.ts` — the exact thing this milestone's microkernel principle exists to avoid. This addendum extends the *trusted, first-party* half of the kernel (the `MinigameLoader` + `packages/minigame-courier-rush` pattern) to cover HUD buttons and skin bootstrap generally, without touching the separate, correctly-scoped untrusted/sandboxed half (`PluginRegistry.ts`/`PluginSandbox.ts`/`SandboxedPluginRuntime.ts`).

- [x] `apps/web/src/core/kernel/Kernel.ts` — a small registration surface (`use()`/`boot()`/`attachHudSink()`/`list()`) built on `KernelPluginManifest`/`KernelContext`/`KernelPluginModule` in `packages/shared-types/src/kernel.ts`. Host capabilities (`theme.switchSkin`, `audio.playUIClick`/`playSolidarityChime`, `input.setLocked`) are supplied to the constructor as `KernelHostBindings` by `main.ts` — kept out of `Kernel.ts` itself so it stays free of the Phaser/DOM/audio module graph and is unit-testable in plain Node (`Kernel.test.ts`).
- [x] `packages/plugin-geo-weather/`, `packages/plugin-mesh-comms/`, `packages/plugin-mutual-credit/` — the three M17 plugins, relocated out of `apps/web/src/plugins/*` into standalone workspace packages, same shape as `packages/minigame-courier-rush`. Each exports a `register(ctx)` (`plugin.ts`) that self-registers with the kernel; `mesh-comms`/`mutual-credit` register their own HUD button (📻/🪙) instead of `TopHUD.ts` importing their modals directly. `geo-weather`'s `register()` stays a no-op today (no HUD surface exists for it — see M17 scoping note 2, unchanged).
- [x] `apps/web/src/ui/TopHUD.ts` — the ~11 built-in icon buttons (Settings, Share, Radio, Mute, Quests, Builder, Plugins, Shop, Social, Civic, Journal) now go through the same `registerButton()`/`HudSink` mechanism a kernel plugin uses, instead of 11 copy-pasted `<button>` blocks. Bespoke HUD chrome (End Day, stats/zone/barometer/pulse/wallet, the context action button) is untouched.
- [x] `apps/web/src/skins/plugin.ts` — moves `activateDefaultSkin()`'s bootstrap call from `main.ts` behind the same registration contract (`ThemeManager.ts` itself is untouched).
- [x] `apps/web/src/world/plugin.ts` — **inventory-only, not a real decomposition.** `WorldScene` (Phaser scene: collision, dialogue, day/night, portals) is *not* rewritten to go through the plugin contract in this pass — there is exactly one WorldScene, nothing today needs a second one, and forcing its Phaser lifecycle through a generic plugin API would be a large, speculative rewrite with no concrete present benefit. `Phaser.Game`/`WorldScene` construction stays in `main.ts`'s `boot()`, unchanged. This module exists only so `kernel.list()` truthfully reports `world` alongside every other registered system. A genuinely swappable/multi-scene world is a distinct, much larger initiative and would need its own plan.
