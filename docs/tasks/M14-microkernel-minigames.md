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
