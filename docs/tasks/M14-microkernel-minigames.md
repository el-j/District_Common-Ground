# M14 — Dynamic Microkernel Architecture, Living District Builder & Extensible Minigames

Stories: [`docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-14-dynamic-microkernel-and-extensible-minigames.md)  
Planning: [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)  
Kickstart Reference: [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md)  
Priority: 🚨 **Immediate Next Refactor (Pre-M8/M9 Foundational Pipeline)**

---

## 1. Contracts & Shared Interfaces
- [ ] `packages/shared-types/src/kernel.ts`:
  - [ ] `MinigameManifest` (id, version, title, category, thumbnail, entrypointUrl, permissions, hardwareTarget)
  - [ ] `GameSessionConfig` (sessionId, userId, archetype, difficulty, districtDay, customData)
  - [ ] `GameSessionContext` (user stats, host platform bridge: `grantRewards`, `playSFX`, `notify`, `closeMinigame`)
  - [ ] `MinigameInstance` interface (`mount`, `unmount`, `onResize`, `onPause`, `onResume`)
  - [ ] `DistrictParcelState` (plotId, position, buildingType, stage: 0..3, progress: 0..100, lastHarvestDay)

---

## 2. Go Backend Microkernel (`apps/api/internal/kernel/`)
- [ ] `contracts.go` — Go interface definitions for `GamePlugin`, `SessionConfig`, `GameSessionResult`, `ResourceGrant`
- [ ] `registry.go` — In-memory thread-safe dynamic plugin registry with concurrent lookup
- [ ] `manifest_loader.go` — Filesystem scanner discovering `plugin.json` manifests from `apps/api/plugins/`
- [ ] `session_manager.go` — Ephemeral HMAC-signed session token generator and validator (anti-cheat scoring)
- [ ] Router endpoints in `apps/api/cmd/server/main.go`:
  - [ ] `GET /api/v1/games` — return list of active, verified minigames
  - [ ] `POST /api/v1/games/:id/session` — authenticate and issue signed session token
  - [ ] `POST /api/v1/games/:id/complete` — score submission, verification, and atomic database wallet credit
- [ ] Built-in reference plugin: `apps/api/internal/plugins/courierrush/plugin.go`

---

## 3. TypeScript Frontend Shell (`apps/web/src/core/kernel/`)
- [ ] `MinigameLoader.ts` — Dynamic ESM `import()` loader with remote URL caching and error recovery
- [ ] `MinigameContainer.ts` — Sandboxed DOM/Canvas wrapper managing mount lifecycle and unmount teardown
- [ ] `HostPlatformAPI.ts` — Bridge connecting isolated minigame context to Zustand store (`useGameStore`)
- [ ] Top-level Minigame Overlay modal in `index.html` with backdrop blur, pause controls, and close button

---

## 4. Tier 1 — Living District Builder ("Farmville for the Commons")
- [ ] `apps/web/src/builder/DistrictGrid.ts`:
  - [ ] Interactive 12-plot isometric/top-down district grid
  - [ ] Plot selection, inspection card, and blueprint picker
- [ ] `apps/web/src/builder/ConstructionStages.ts`:
  - [ ] 4-Tier visual state machine (Blighted ➔ Groundwork ➔ Framing ➔ Solarpunk Bloom)
  - [ ] Animated elements: Chimney smoke particles, solar panel glint, wind-swayed garden crops, bustling NPC helpers
- [ ] `apps/web/src/builder/TactileEffects.ts`:
  - [ ] Procedural Web Audio construction hammering sounds and celebratory level-up chimes
  - [ ] Canvas dust puff particles and confetti upon stage completion
- [ ] `apps/web/src/builder/ProductionManager.ts`:
  - [ ] Morning harvest cycles: click to gather fresh soup rations, stored kWh battery packs, tool repairs

---

## 5. Tier 2 — Street-Level Questing Minigame Mode
- [ ] Camera Zoom Controller: Smooth transition between Macro District Builder view and Micro Street Walk view (`[Space]` or Zoom Button)
- [ ] Dynamic Map Sync: `WorldScene.ts` dynamically reads `DistrictGrid` state and renders the exact buildings placed in Tier 1
- [ ] Physical Minigame Portals:
  - [ ] Glowing electric cargo bike near Tenements ➔ Launches "Cargo Courier Rush"
  - [ ] Kitchen door lantern ➔ Launches "Kitchen Solidarity Frenzy"
  - [ ] Solar battery control box ➔ Launches "Solar Grid Inverter"
- [ ] Emergent street encounters (Eviction defense rally, lost pet rescue, anti-hate flyer scraping)

---

## 6. Tier 3 — Reference Minigame: "Cargo Courier Rush" (*Pizza Taxi* style)
- [ ] `apps/web/src/minigames/courier-rush/`:
  - [ ] `manifest.json` conforming to `MinigameManifest`
  - [ ] `index.ts` exporting `createMinigame(): MinigameInstance`
  - [ ] `CourierScene.ts` — High-speed top-down cargo bike driving mechanics
  - [ ] Dynamic physics: Smooth acceleration, corner drifts, bicycle bell ringing (`[B]`)
  - [ ] Order delivery routing: Sal’s Kitchen pickup ➔ Navigation arrow ➔ Elderly tenant drop-off
  - [ ] Timer countdown (90s), combo multiplier for clean drifts and zero crashes
  - [ ] Game-over summary modal: Score calculation, rewards payout ($ cash, + social trust)

---

## 7. Quality Assurance & Verification Tests
- [ ] **Test 14.1 (Kernel Isolation):** Register a mock plugin without restarting Go backend; verify it appears in `GET /api/v1/games`
- [ ] **Test 14.2 (Zero Memory Leaks):** Mount and unmount "Cargo Courier Rush" 10 times consecutively; verify canvas and WebGL context are cleanly disposed
- [ ] **Test 14.3 (Tactile Builder Upgrades):** Upgrading parcel #1 increments tier from 0 to 1, changes visual sprite, emits particle burst, and registers in save game state
- [ ] **Test 14.4 (Full Courier Delivery Loop):** Start courier session ➔ deliver 3 soup orders ➔ submit score ➔ verify player cash and community trust increase in store and DB
- [ ] **Test 14.5 (Trusted Plugin Review Flow):** Install a third-party plugin from URL or bundle, verify it is quarantined, submit an owner review request, approve it, and confirm it appears in the verified store catalog.

---

## 8. Addendum — Frontend `Kernel`: generalizing beyond minigames

M17 added three real features (`geo-weather`, `mesh-comms`, `mutual-credit`) as plain files under `apps/web/src/plugins/*`, statically imported directly by `TopHUD.ts` — the exact thing this milestone's microkernel principle exists to avoid. This addendum extends the *trusted, first-party* half of the kernel (the `MinigameLoader` + `packages/minigame-courier-rush` pattern) to cover HUD buttons and skin bootstrap generally, without touching the separate, correctly-scoped untrusted/sandboxed half (`PluginRegistry.ts`/`PluginSandbox.ts`/`SandboxedPluginRuntime.ts`).

- [x] `apps/web/src/core/kernel/Kernel.ts` — a small registration surface (`use()`/`boot()`/`attachHudSink()`/`list()`) built on `KernelPluginManifest`/`KernelContext`/`KernelPluginModule` in `packages/shared-types/src/kernel.ts`. Host capabilities (`theme.switchSkin`, `audio.playUIClick`/`playSolidarityChime`, `input.setLocked`) are supplied to the constructor as `KernelHostBindings` by `main.ts` — kept out of `Kernel.ts` itself so it stays free of the Phaser/DOM/audio module graph and is unit-testable in plain Node (`Kernel.test.ts`).
- [x] `packages/plugin-geo-weather/`, `packages/plugin-mesh-comms/`, `packages/plugin-mutual-credit/` — the three M17 plugins, relocated out of `apps/web/src/plugins/*` into standalone workspace packages, same shape as `packages/minigame-courier-rush`. Each exports a `register(ctx)` (`plugin.ts`) that self-registers with the kernel; `mesh-comms`/`mutual-credit` register their own HUD button (📻/🪙) instead of `TopHUD.ts` importing their modals directly. `geo-weather`'s `register()` stays a no-op today (no HUD surface exists for it — see M17 scoping note 2, unchanged).
- [x] `apps/web/src/ui/TopHUD.ts` — the ~11 built-in icon buttons (Settings, Share, Radio, Mute, Quests, Builder, Plugins, Shop, Social, Civic, Journal) now go through the same `registerButton()`/`HudSink` mechanism a kernel plugin uses, instead of 11 copy-pasted `<button>` blocks. Bespoke HUD chrome (End Day, stats/zone/barometer/pulse/wallet, the context action button) is untouched.
- [x] `apps/web/src/skins/plugin.ts` — moves `activateDefaultSkin()`'s bootstrap call from `main.ts` behind the same registration contract (`ThemeManager.ts` itself is untouched).
- [x] `apps/web/src/world/plugin.ts` — **inventory-only, not a real decomposition.** `WorldScene` (Phaser scene: collision, dialogue, day/night, portals) is *not* rewritten to go through the plugin contract in this pass — there is exactly one WorldScene, nothing today needs a second one, and forcing its Phaser lifecycle through a generic plugin API would be a large, speculative rewrite with no concrete present benefit. `Phaser.Game`/`WorldScene` construction stays in `main.ts`'s `boot()`, unchanged. This module exists only so `kernel.list()` truthfully reports `world` alongside every other registered system. A genuinely swappable/multi-scene world is a distinct, much larger initiative and would need its own plan.
