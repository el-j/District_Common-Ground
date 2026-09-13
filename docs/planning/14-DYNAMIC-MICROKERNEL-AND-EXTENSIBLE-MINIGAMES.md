# 14 — Dynamic Microkernel Architecture, Living District Builder & Extensible Minigames Platform

**Studio Agent Consortium:** Game Designer 🎮, Narrative Designer 📖, Economy Designer 💰, Level Designer 🏛️, Backend Architect 🛠️, Frontend Developer 💻, Whimsy Injector ✨, Technical Artist 🎨  
**Status:** Living Architectural Specification & Vision Bible (Next Immediate Priority Refactor)  
**Parent Vision Document:** [`docs/kickstart/Architecture Vision & Epic.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/kickstart/Architecture%20Vision%20&%20Epic.md) · [`docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md)  

---

## 1. Executive Summary & The Problem Statement

### 1.1 The Critique: "Sad Gray-to-Green Clicker" vs. Joyful Living World
Playtesting reveals that the current gameplay experience is fundamentally lacking dopamine, agency, and tactile delight. 
* **The Symptom:** Contributing resources to a construction node merely flips a progress integer and tints a flat pixel cluster from monochrome gray to olive green. Nothing physically transforms in the world. The player wanders through a desolate street with no tangible feedback, emotional attachment, or visual reward.
* **The Antidote:** Modern genre-defining games like **Farmville**, **Last Stronghold**, and **Pizza Taxi / Crazy Taxi** prove that satisfying simulation gameplay requires:
  1. **A Tactile District Builder ("Farmville for the Commons"):** An inviting, isometric/top-down builder where players claim abandoned plots, break ground, plant urban crops, raise community greenhouses, erect solar pergolas, and watch their neighborhood visually flourish with bustling pedestrian life, smoke puffing from the kitchen chimney, colorful banners, street trees, and communal harvest cycles.
  2. **The Street-Level "Walk-Around" as a Quest & Action Minigame ("Street Action Mode"):** Walking is no longer dead traversal—it is an active, immersive street-level exploration mode where players dive into their custom-built district to run high-stakes quests, talk face-to-face with neighbors, defuse corporate eviction squads, rescue stray animals, and trigger interactive micro-events.
  3. **Extensible Minigames with Instant Gratification ("Pizza Taxi" Courier Runs, Kitchen Frenzy, Solar Wiring):** Players actively earn cash, energy, and mutual-aid tokens by jumping into fast, joyful minigames seamlessly loaded into the platform.

### 1.2 The Architectural Mandate: Microkernel & Zero-Core-Modification Plugins
To make this evergreen, scalable, and sustainable over the next decade (2026–2036+), **the game engine must be completely decoupled into a Microkernel Architecture**:
* **Zero Core Modifications:** Creating a new minigame, new city district, or seasonal narrative level must be **100% additive**. It must NEVER require touching the core engine or redeploying the backend.
* **Runtime Dynamic Discovery:** The Go backend and TypeScript frontend discover, validate, sandbox, and load minigame bundles dynamically at runtime from registries, manifests, or remote URLs.
* **Strict Contract Separation:** The core platform provides platform services (Player Identity, Wallet, Shared Commons State, Achievements, Leaderboards, Real-World News Pulse) while minigames conform to strict, sandboxed lifecycle interfaces.
* **Trust-Gated Plugin Store:** Third-party bundles are quarantined on install, inspected before activation, and only promoted into the live catalog after owner approval and server verification.

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           DISTRICT: COMMON GROUND PLATFORM                            │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    TIER 1: LIVING DISTRICT BUILDER (MACRO)                      │  │
│  │  • Interactive Town Grid & Plots (Farmville / Townscaper tactile placement)      │  │
│  │  • Multi-stage Visual Construction (Foundation -> Timber Frame -> Solarpunk)    │  │
│  │  • Thriving Street Life (Pedestrian density, market stalls, greenery bloom)     │  │
│  └──────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                         │                                             │
│                        [ DIVE INTO DISTRICT / ZOOM IN ]                               │
│                                         ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │             TIER 2: STREET-LEVEL EXPLORATION & QUESTING (MICRO)                 │  │
│  │  • Direct Character Control (Pip, Morgan, Arthur) in their own created city    │  │
│  │  • Street Quests, NPC Dialogues, Land Defense, Scraps the Cat Interactions      │  │
│  │  • Portals & Trigger Points to Active District Minigames                       │  │
│  └──────────────────────────────────────┬──────────────────────────────────────────┘  │
│                                         │                                             │
│                    [ RUNTIME DYNAMIC PLUGIN DISCOVERY ]                               │
│                                         ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    TIER 3: EXTENSIBLE MINIGAME ECOSYSTEM                        │  │
│  │  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐  │  │
│  │  │   "CARGO COURIER"   │  │ "KITCHEN SOLIDARITY"│  │   "SOLAR GRID WIRE-UP"  │  │  │
│  │  │ (Fast Pizza-Taxi Run│  │(Overcooked-style    │  │ (Pipe-puzzle micro-game │  │  │
│  │  │  through traffic)   │  │ batch soup cooking) │  │  balancing circuit load)│  │  │
│  │  └─────────────────────┘  └─────────────────────┘  └─────────────────────────┘  │  │
│  │   [Plugin Bundle A]        [Plugin Bundle B]        [Plugin Bundle C]           │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                         │                                             │
│  ═══════════════════════════════════════╪═══════════════════════════════════════════  │
│                         DYNAMIC MICROKERNEL PLATFORM                                  │
│   • Go Backend Registry (Wasm / HashiCorp IPC / Manifest Service Engine)             │
│   • TypeScript Frontend Shell (Micro-Frontend Sandboxed Dynamic Module Loader)       │
│   • Shared State, Wallet, Progression, Leaderboard & District Pulse Event Bus         │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Trust & Verification Flow

- Third-party plugin bundles enter a quarantine cache first, not the live runtime.
- The frontend uses a sandbox inspector to read manifests and hash bundles before activation.
- Verification requests are stored in PostgreSQL and reviewed by the owner identified in `PLUGIN_OWNER_USER_ID`.
- Approved plugins are merged into the verified catalog and can launch as normal minigame extensions.

---

## 2. Gameplay Vision: The Tri-Tier Experience

### 2.1 Tier 1 — The Living District Builder ("Farmville for the Commons")
Instead of fixed immutable tiles that turn from gray to green:
* **Dynamic Buildable Parcels:** The district map contains designated municipal commons zones, brownfield lots, tenement rooftops, and community gardens.
* **Tactile Construction Stages:**
  - **Stage 0 — Abandoned / Blighted:** Trash heaps, broken fences, speculative real-estate eviction signs, cracked asphalt.
  - **Stage 1 — Breaking Ground (Clearing & Foundation):** Player spends energy and materials. Shovels dig, wood stakes appear, dust particles puff, scaffolding rises.
  - **Stage 2 — Active Community Framing:** Neighbors gather (visual NPCs hammering and sawing), brickwork laid, banners draped.
  - **Stage 3 — Thriving Functional Hub:** 
    - *Community Kitchen:* Warm lantern glow, chimney puffing gentle procedural steam, picnic tables filled with dining neighbors, bubbling stew cauldrons.
    - *Solar Cooperative:* Photovoltaic blue glass reflecting the sky, rotating tracking brackets, gentle humming LED transformers, battery storage bank with glowing neon charge meters.
    - *Urban Garden & Land Trust:* Raised cedar planter beds, tomato trellises, sunflowers swaying in the wind, irrigation drip lines, beehives buzzing.
* **Dopamine Harvest & Production Loops:**
  - Every morning, gardens yield fresh food bundles (reducing district food stress).
  - Solar arrays generate clean kW units (powering neighborhood cooling shelters during heatwaves).
  - Tool libraries reduce repair and construction costs across the entire grid.
  - Players click to collect or dispatch automated mutual-aid volunteers!

### 2.2 Tier 2 — Street-Level Adventure & Exploration Minigame
* **Seamless Transition:** Pressing `[Space]` or clicking **"Hit the Pavement"** smoothly zooms the camera down from the birds-eye district map into direct top-down 2D action control of Pip, Morgan, or Arthur.
* **Living, Dynamic Streets:** The street layout directly matches what the player built in Tier 1! If you placed a community kitchen on Lot 4, it is physically there in full detail with music pouring out of its open doors.
* **Active Quests & Environmental Challenges:**
  - *Eviction Defense:* Landlord bailiffs arrive on 4th Street; rally 3 neighbors to form a human chain.
  - *Lost Cat Alert:* Scraps the calico has escaped to the canal docks; track pawprints through the alleys.
  - *Emergency Triage:* During a summer blackout, deliver emergency insulin from the solar battery bank to Mrs. Higgins' apartment before the timer runs out.

### 2.3 Tier 3 — Pluggable Action Minigames
Minigames are autonomous, bite-sized, high-energy interactive experiences that reward the district with resources:

| Minigame | Genre / Inspiration | Gameplay Loop | District Reward |
|---|---|---|---|
| **"Cargo Courier Rush"** | *Pizza Taxi* / *Crazy Taxi* (Top-down arcade) | Ride Pip’s cargo bike through traffic, dodge potholes, pick up hot soup orders from the kitchen and deliver to isolated elderly tenants within 90 seconds. Combos for stylish drifts and tight turns! | Cash ($), Community Trust (+), Neighborhood Morale |
| **"Kitchen Solidarity Frenzy"** | *Overcooked* / *Cook, Serve, Delicious* | Chop vegetables, stir the lentil stew, wash dishes, package mutual-aid meal boxes in rhythm to energetic folk-punk beats. | Food Rations, Energy Buffs for all characters |
| **"Solar Grid Inverter"** | Pipe-puzzle / Circuit Flow | Route live solar power lines across neighborhood junction boxes while avoiding circuit overloads during peak heatwave hours. | Kilowatt Reserves, Blackout Immunity |
| **"Neighborhood Unity Flyer Sweep"** | Quick-reflex Whack-a-Mole / Scraper | Race down the boulevard scraping off divisive propaganda posters before school lets out; replace with colorful community solidarity posters. | Community Unity, District Safety |
| **"Town Hall Assembly"** | Interactive Narrative Debate | Pitch a community budget allocation to neighborhood factions (tenants, elderly, shopkeepers) balancing diplomacy, passion, and fiscal survival. | Land Trust Deeding, Policy Shield |

---

## 3. Microkernel Architecture Specification

### 3.1 Backend Architecture (Go)

```
apps/api/
├── cmd/server/main.go               # Microkernel Bootstrapper
└── internal/
    ├── kernel/                      # CORE ENGINE KERNEL
    │   ├── registry.go              # Dynamic Plugin & Minigame Registry
    │   ├── host_api.go              # Platform APIs exposed to plugins (Wallet, State, Leaderboard)
    │   ├── contracts.go             # Go standard interface specifications
    │   ├── wasm_runner.go           # WebAssembly (Wazero) isolated plugin execution
    │   └── manifest_loader.go       # Auto-discovery directory scanner & validator
    ├── plugins/                     # ISOLATED PLUGINS (Zero Core Touch)
    │   ├── courier_rush/            # Manifest, rules engine, score validation
    │   ├── kitchen_frenzy/
    │   └── solar_inverter/
    ├── auth/                        # Core Service: JWT, User Sessions
    ├── save/                        # Core Service: PostgreSQL Game Persistence
    └── pulse/                       # Core Service: Real-World Macroeconomic Feeds
```

#### Go Plugin Contract (`internal/kernel/contracts.go`)
Every minigame backend module implements the immutable `GamePlugin` interface:
```go
package kernel

import "context"

type PluginMetadata struct {
    ID          string   `json:"id"`
    Version     string   `json:"version"`
    Name        string   `json:"name"`
    Author      string   `json:"author"`
    Category    string   `json:"category"`    // "arcade", "puzzle", "narrative", "management"
    Entrypoint  string   `json:"entrypoint"`  // URL or wasm file path
    Permissions []string `json:"permissions"` // ["wallet:read", "wallet:grant", "stats:write"]
}

type SessionConfig struct {
    SessionID   string            `json:"sessionId"`
    UserID      string            `json:"userId"`
    Archetype   string            `json:"archetype"`
    Difficulty  int               `json:"difficulty"`
    DistrictDay int               `json:"districtDay"`
    CustomData  map[string]any    `json:"customData"`
}

type GameInputEvent struct {
    Timestamp int64          `json:"timestamp"`
    Action    string         `json:"action"`
    Payload   map[string]any `json:"payload"`
}

type GameSessionResult struct {
    SessionID      string         `json:"sessionId"`
    Score          int64          `json:"score"`
    Completed      bool           `json:"completed"`
    DurationSec    float64        `json:"durationSec"`
    RewardsGranted ResourceGrant  `json:"rewardsGranted"`
    Telemetry      map[string]any `json:"telemetry"`
}

type ResourceGrant struct {
    CashDelta       int `json:"cashDelta"`
    EnergyDelta     int `json:"energyDelta"`
    TrustDelta      int `json:"trustDelta"`
    ResilienceDelta int `json:"resilienceDelta"`
}

type GamePlugin interface {
    // Metadata returns registration info
    Metadata() PluginMetadata
    
    // ValidateSession starts an authenticated session with anti-cheat seed
    StartSession(ctx context.Context, cfg SessionConfig) (sessionToken string, err error)
    
    // ProcessInput handles server-verified ticks or actions
    ProcessInput(ctx context.Context, sessionToken string, event GameInputEvent) error
    
    // ComputeScore evaluates game termination and calculates verified rewards
    ComputeScore(ctx context.Context, sessionToken string, finalPayload []byte) (GameSessionResult, error)
    
    // HealthCheck returns healthy status
    HealthCheck(ctx context.Context) error
}
```

---

### 3.2 Frontend Architecture (TypeScript)

```
apps/web/src/
├── core/
│   ├── kernel/                      # FRONTEND PLATFORM SHELL
│   │   ├── MinigameLoader.ts        # Dynamic remote bundle loader (ESM / Module Federation)
│   │   ├── MinigameContainer.ts     # Sandboxed Canvas/DOM Mount Wrapper
│   │   ├── HostPlatformAPI.ts       # Bridge between minigames and Zustand store
│   │   ├── PluginRegistry.ts        # Quarantine-first plugin store, update checks, verified promotion
│   │   └── PluginSandbox.ts         # Sandboxed manifest inspector for untrusted bundles
│   └── state/                       # Core state (Zustand, idb-keyval, DistrictPulse)
├── builder/                         # TIER 1: LIVING DISTRICT BUILDER
│   ├── DistrictGrid.ts              # Interactive parcel manager & isometric/top-down placement
│   ├── ConstructionStages.ts        # Visual progression tiers (Blight -> Framing -> Solarpunk)
│   ├── ProductionManager.ts         # Harvest cycles, energy distribution, mutual-aid counters
│   └── BuildingCatalog.ts           # Definable blueprints (Kitchen, Solar, Clinic, Nursery)
├── world/                           # TIER 2: STREET-LEVEL QUESTING MINIGAME
│   ├── WorldScene.ts                # Phaser street action scene
│   └── StreetQuestManager.ts        # In-district quest markers & interactive portals
└── minigames/                       # TIER 3: BUILT-IN & PLUGGABLE MINIGAMES
    └── courier-rush/                # Reference Minigame (Pizza-Taxi Style Bike Run)
        ├── manifest.json
        ├── index.ts                 # MinigameInstance entrypoint
        └── CourierScene.ts          # Phaser / Canvas arcade implementation
```

#### TypeScript Minigame Interface (`MinigameManifest` & `MinigameInstance`)
```typescript
export interface MinigameManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: 'delivery' | 'puzzle' | 'cooking' | 'defense' | 'assembly';
  entrypointUrl: string; // Dynamic module bundle URL
  requiredRole?: 'pip' | 'morgan' | 'arthur';
  targetHardware: 'canvas' | 'webgl' | 'dom';
}

export interface GameSessionContext {
  sessionId: string;
  userId: string;
  archetype: 'pip' | 'morgan' | 'arthur';
  activeSkin: string;
  day: number;
  currentStats: {
    cash: number;
    energy: number;
    socialTrust: number;
    stressLevel: number;
  };
  // Host APIs made available to the minigame
  host: {
    playSFX(sfxId: string): void;
    grantRewards(rewards: { cash?: number; trust?: number; resilience?: number }): Promise<void>;
    notify(message: string, type: 'info' | 'success' | 'warning'): void;
    closeMinigame(result?: { score: number; completed: boolean }): void;
  };
}

export interface MinigameInstance {
  mount(container: HTMLElement, context: GameSessionContext): Promise<void>;
  unmount(): Promise<void>;
  onResize?(width: number, height: number): void;
  onPause?(): void;
  onResume?(): void;
}
```

---

## 4. Epic & User Stories Breakdown

### EPIC: Dynamic Microkernel & Living District Minigame Platform
**Goal:** Transform *District: Common Ground* from a static gray-to-green clicker into a vibrant, rewarding District Builder with high-energy street minigames, supported by an evergreen Go/TypeScript Microkernel plugin architecture.

```
                  ┌────────────────────────────────────────────────────────────┐
                  │ EPIC: Dynamic Microkernel & Extensible Minigame Platform   │
                  └─────────────────────────────┬──────────────────────────────┘
                                                │
         ┌──────────────────────────────┬───────┴───────────────────────┬──────────────────────────────┐
         ▼                              ▼                               ▼                              ▼
  ┌──────────────┐              ┌──────────────┐                ┌──────────────┐                ┌──────────────┐
  │   STORY 1    │              │   STORY 2    │                │   STORY 3    │                │   STORY 4    │
  │ Microkernel  │              │ Living Town  │                │ Street-Level │                │ Reference    │
  │ Plugin Engine│              │ Builder View │                │ Quest Mode   │                │ Minigame     │
  │ (Go + TS)    │              │ (Farmville)  │                │ (Minigame)   │                │(Courier Rush)│
  └──────────────┘              └──────────────┘                └──────────────┘                └──────────────┘
```

#### Story 1: The Microkernel Host & Dynamic Plugin Ingestion (Architecture Core)
* **As a** platform engineer and minigame author,
* **I want** the Go backend and TypeScript frontend to dynamically discover, validate, and mount minigames at runtime from manifests without modifying or redeploying core code,
* **So that** new games, seasonal challenges, and community-created levels can be added continuously over the next 10 years.
* **Key Deliverables:**
  - `apps/api/internal/kernel/`: Plugin registry, manifest scanner, session token verification, healthcheck.
  - `GET /api/v1/games`: Catalog endpoint returning verified minigames with thumbnail, version, and entrypoint.
  - `POST /api/v1/games/:id/session`: Starts authenticated game session with score verification seed.
  - `apps/web/src/core/kernel/MinigameLoader.ts`: Dynamic bundle loader mounting plugins in sandboxed DOM/canvas containers with clean lifecycle (`mount`, `unmount`).

#### Story 2: The Living District Builder ("Farmville for the Commons")
* **As a** player,
* **I want** to physically build, upgrade, customize, and cultivate my neighborhood plots with rich multi-stage visual construction,
* **So that** I feel deep pride, joy, and emotional connection seeing a blighted lot transform into a bustling, green solarpunk community.
* **Key Deliverables:**
  - Dynamic Plot Management: 12 interactable parcel plots across the district map.
  - 4-Tier Visual States: Blight (0%) ➔ Framing & Scaffolding (25%) ➔ Working Hub (75%) ➔ Solarpunk Bloom (100%).
  - Tactile Construction Actions: Tap to clear debris, frame timbers, install solar arrays, plant community beds with responsive particle effects, audio thuds, and visual cheering neighbors.
  - Daily Harvest & Production: Click to collect fresh kitchen bread, solar energy packets, and legal defense vouchers.

#### Story 3: Street-Level Exploration & Quest Mode ("Street Minigame")
* **As a** player,
* **I want** to zoom directly into my custom-built district as Pip, Morgan, or Arthur to explore the pavement, interact with NPCs, and run urgent neighborhood quests,
* **So that** walking around feels like an active, thrilling adventure instead of a boring stroll.
* **Key Deliverables:**
  - Smooth camera transition from Macro Builder View to Micro Street Exploration view.
  - In-world interactive portals: Walk up to the Kitchen door to trigger "Kitchen Solidarity Frenzy", walk up to Pip's cargo bike to trigger "Cargo Courier Rush".
  - Emergent Street Encounters: Corporate eviction scouts, stray cats needing petting, flyer scraping, street musicians giving mood buffs.

#### Story 4: Reference Minigame — "Cargo Courier Rush" (*Pizza Taxi* style)
* **As a** player,
* **I want** to play a fast-paced, high-energy cargo bike delivery minigame through the bustling district traffic,
* **So that** I have immediate, exhilarating gameplay that earns cash and mutual-aid credits for my community.
* **Key Deliverables:**
  - Standalone plugin package conforming to `MinigameInstance`.
  - Top-down arcade vehicle handling (Pip on a heavy electric cargo bike with drift physics, bell ringing, obstacle dodging).
  - Multi-stop delivery rush: Pick up hot soups from Sal's kitchen, dodge oil slicks and delivery vans, make on-time drop-offs to grateful neighbors.
  - Score computation, combo meters, and verified reward payout back to the player's core wallet.

---

## 5. Phased Orchestration & Step-by-Step Task Plan

### Phase A: Microkernel Core & Contracts (Immediate Priority)
- [ ] **Task A.1**: Define shared Protobuf/JSON schema specifications for Minigame manifests, session lifecycles, and reward grants in `packages/shared-types`.
- [ ] **Task A.2**: Implement Go Microkernel Plugin Registry in `apps/api/internal/kernel/` with dynamic directory discovery and manifest validation.
- [ ] **Task A.3**: Add `/api/v1/games` and `/api/v1/games/:id/session` endpoints with session signing and score verification.
- [ ] **Task A.4**: Implement TypeScript `MinigameLoader.ts` and `MinigameContainer.ts` with sandboxed mounting and lifecycle cleanup.

### Phase B: The Living District Builder ("Farmville" System)
- [ ] **Task B.1**: Create `DistrictGrid.ts` supporting discrete parcel slots with state-persisted ownership, type, and construction level.
- [ ] **Task B.2**: Build multi-stage pixel artwork & procedural canvas representations for construction stages (Groundwork, Scaffolding, Operational, Bloom).
- [ ] **Task B.3**: Implement tactile particle effects (wood chips, smoke puffs, celebratory confetti) and Web Audio impact sounds upon upgrading.
- [ ] **Task B.4**: Implement daily production/harvest loops (Harvest Vegetables, Tap Solar Batteries, Collect Mutual-Aid Toolkits).

### Phase C: Street-Level Exploration & Minigame Portals
- [ ] **Task C.1**: Connect Builder Grid with `WorldScene.ts` so the street environment dynamically renders the buildings placed in the Builder view.
- [ ] **Task C.2**: Add interactive minigame entrance portals (e.g. Glowing bicycle stand for Courier Rush, Kitchen Dutch door).
- [ ] **Task C.3**: Implement zoom transition between District Overview (Macro) and Street Action (Micro).

### Phase D: Reference Minigame "Cargo Courier Rush"
- [ ] **Task D.1**: Build `apps/web/src/minigames/courier-rush/` as an autonomous, decoupled plugin adhering to `MinigameInstance`.
- [ ] **Task D.2**: Implement arcade bike physics (acceleration, friction, brake drifts, bicycle bell SFX).
- [ ] **Task D.3**: Implement order routing, waypoint markers, timer countdown, and delivery feedback.
- [ ] **Task D.4**: End-to-end integration test: Launch Courier Rush from street portal, complete delivery run, verify cash/trust rewards update in core Zustand store and PostgreSQL DB.

---

## 6. Verification and Success Metrics
* **Extensibility Criterion:** A new minigame can be added simply by dropping a new folder into `minigames/` or registering a URL in the backend manifest. **Zero modifications to existing engine files.**
* **Joy & Tactile Quality:** Upgrading a district building triggers distinct visual, auditory, and mechanical changes in under 100ms.
* **Game Loop Engagement:** Players engage in a satisfying macro-micro loop:
  $$\text{Macro District Building} \longrightarrow \text{Street Questing} \longrightarrow \text{Action Minigame} \longrightarrow \text{Earn Resources} \longrightarrow \text{Upgrade Commons}$$
* **Performance:** Minigames load dynamically within 500ms; memory is 100% reclaimed upon unmounting with zero leaks.
