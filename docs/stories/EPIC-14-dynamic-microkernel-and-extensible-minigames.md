# EPIC-14 — Dynamic Microkernel Architecture, Living District Builder & Extensible Minigames

**Agent roles:** engineering-backend-architect, engineering-frontend-developer, game-designer, technical-artist, whimsy-injector  
**Planning doc:** [`docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md)  
**Vision source:** [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md)  
**Priority:** 🚨 **Immediate Next Refactor & Core Foundation**

## Vision
Transform the game from a static, disappointing clicker into a joyful, tactile **Living District Builder (Farmville / Last Stronghold)** paired with an active **Street-Level Questing Mode** and high-energy **Pluggable Minigames (Pizza Taxi Courier, Kitchen Solidarity Frenzy, Solar Wiring)**.

Under the hood, implement an evergreen **Microkernel Architecture**: the Go backend and TypeScript frontend discover and run minigames dynamically at runtime via strict contracts, enabling infinite new games, levels, and mechanics with **zero core code modifications**.
Third-party extensions are trust-gated: the frontend quarantines incoming bundles, owners can approve verification requests, and approved plugins roll into the live catalog/store without touching core game code.

---

## The Tri-Tier Experience
1. **Tier 1 — Macro District Builder ("Farmville for the Commons"):**
   - 12 customizable district plots (Community Kitchen, Solar Roof, Urban Garden, Tool Library, Clinic).
   - 4 visual progression stages: Blighted ➔ Foundation ➔ Framing ➔ Solarpunk Bloom with particle effects, chimney smoke, and cheering neighbors.
   - Daily tactile harvest loops (fresh sourdough bread, stored kilowatt batteries, mutual-aid vouchers).
2. **Tier 2 — Street-Level Questing ("Street Minigame"):**
   - Seamless zoom transition into direct 2D action control of Pip, Morgan, or Arthur in their customized neighborhood.
   - Street encounters, NPC conversations, eviction defense human chains, lost pet rescues.
   - In-world physical portals that launch dedicated action minigames.
3. **Tier 3 — Pluggable Action Minigames:**
   - Autonomous, sandboxed mini-games with instant dopamine rewards.
   - Reference Minigame: **"Cargo Courier Rush"** (*Pizza Taxi* arcade cargo-bike delivery run dodging traffic, drifting corners, ringing bells, and delivering hot meals).

---

## Architecture Contracts & Technical Breakdown

### 1. Shared Contracts (`packages/shared-types`)
- `MinigameManifest`: ID, version, title, category, thumbnail, entrypointUrl, permissions.
- `GameSessionContext`: User stats, session token, host API bridge (`grantRewards`, `playSFX`, `notify`).
- `MinigameInstance`: Lifecycle interface (`mount`, `unmount`, `onGameStateUpdate`).

### 2. Go Backend Microkernel (`apps/api/internal/kernel/`)
- Dynamic plugin registry and directory manifest scanner (`registry.go`, `manifest_loader.go`).
- Anti-cheat session signing & score evaluation pipeline (`contracts.go`).
- Endpoints:
  - `GET /api/v1/games` — list verified, active minigames.
  - `POST /api/v1/games/:id/session` — initiate authenticated session.
  - `POST /api/v1/games/:id/complete` — verify score and commit resource grants to database.

### 3. TypeScript Frontend Shell (`apps/web/src/core/kernel/`)
- `MinigameLoader.ts` — asynchronous ESM dynamic module loader.
- `MinigameContainer.ts` — sandboxed DOM/Canvas mount container with full cleanup on unmount.
- `HostPlatformAPI.ts` — secure bridge connecting isolated minigames to the Zustand store.

### 4. Living District Builder & Quests (`apps/web/src/builder/`)
- `DistrictGrid.ts` — grid state management, parcel purchase, upgrade levels.
- `ConstructionStages.ts` — dynamic visual rendering of multi-stage construction assets.
- `CourierRush/` — complete reference minigame demonstrating the plugin contract end-to-end.

### 5. Plugin Trust & Store Operations

- `PluginRegistry.ts` should own quarantine, local bundle persistence, update checks, and verified-store promotion.
- `PluginSandbox.ts` should inspect untrusted bundles in an isolated iframe before they are eligible for approval.
- Verification requests should flow through the API and be reviewable by the configured owner account.

---

## Acceptance Criteria
- **Test 14.1 (Zero Core Modifications):** A new minigame directory can be added and registered via manifest. It appears in `/api/v1/games` and mounts in the frontend with **0 modifications to core engine code**.
- **Test 14.2 (Visual Construction Flourishing):** Upgrading a parcel from 0% to 100% displays 4 distinct visual and animated states, generates celebratory particles and audio, and produces harvestable resources.
- **Test 14.3 (Street Zoom & Portal Launch):** Pressing `[Space]` zooms camera down to street level; walking up to the Cargo Bike triggers "Cargo Courier Rush" seamlessly.
- **Test 14.4 (Score & Progression Commitment):** Completing a 90-second "Cargo Courier Rush" run submits a signed session payload, verifies score server-side, updates player cash and trust, and writes to PostgreSQL.
- **Test 14.5 (Trusted Plugin Review Pipeline):** Installing a third-party plugin quarantines it locally, submits a verification request, and only exposes it in the live store after owner approval.
