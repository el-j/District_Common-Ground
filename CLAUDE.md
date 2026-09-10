# District: Common Ground — CLAUDE.md

## What This Is

A browser-based 2D top-down game about urban community resilience. Players navigate a neighborhood under economic stress, build community infrastructure, and face crises that force a choice between scapegoating neighbors or practicing solidarity. Ships as a PWA (Progressive Web App) playable on mobile and desktop.

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Language | TypeScript 5.4+ | Strict mode: `noImplicitAny`, `strictNullChecks` |
| Bundler | Vite 5.x/6.x | HMR in dev, aggressive tree-shaking |
| Tilemap Engine | Phaser 3 (or PixiJS v8) | AABB collision, tilemap, camera |
| UI | Tailwind CSS + Native DOM | No React — overlays rendered as HTML |
| State | Zustand 4.x | Outside-React, zero-boilerplate |
| Persistence | idb-keyval 6.x (IndexedDB) | Saves on every day transition |
| Audio | Web Audio API (native) | Procedural synth — no MP3 downloads |
| PWA | vite-plugin-pwa | Offline, installable |

## Source Directory Layout

```
src/
  core/
    state/        useGameStore.ts, actions.ts
    simulation/   EconomyMath.ts, CrisisEngine.ts
    audio/        SoundSynth.ts
  world/
    WorldScene.ts, InputManager.ts, CollisionSystem.ts
    entities/     PlayerEntity.ts, NPCEntity.ts
  ui/
    TopHUD.ts, DialogueOverlay.ts, CrisisWireModal.ts
  skins/
    ThemeManager.ts, SkinInterface.ts
  main.ts
public/
  manifest.webmanifest
  assets/
    skins/        solarpunk/, retro_gb/
    data/         crisis_scenarios.json
```

## Critical Architecture Rule — Headless Simulation

**Game logic must never reference sprite filenames, color hex codes, or skin-specific assets.**

All entities use abstract `EntityToken` strings (`'HERO_AVATAR'`, `'BUILDING_COMMUNITY_KITCHEN'`, etc.). Skins resolve tokens at render time via `skin.manifest.json`. This is what makes runtime skin-switching possible without resetting game state.

Layers:
1. **Simulation State** (Zustand) — resources, day, commons progress, crisis queue
2. **Game Loop / Crisis Pipeline** — economy math, event branching
3. **Abstract Skin Interface** — resolves tokens to textures/audio
4. **Skin Modules** — Solarpunk, Retro Game Boy, Cozy Vector

## Character Archetypes

| Archetype | Name | Cash | Energy | Trust | Stress |
|---|---|---|---|---|---|
| Precarious Courier | Pip | $25 | 80 | 40 | 60% |
| Exhausted Commuter | Morgan | $240 | 40 | 25 | 45% |
| Solitary Landlord | Arthur | $1,200 | 65 | 10 | 30% |

## Crisis Choice Framework

Every crisis offers two branches:
- **Scapegoating (authoritarian):** Short-term cash gain → Resilience -15%, Trust -20, world desaturates
- **Solidarity (democratic):** Upfront energy cost → Resilience +20%, Trust +25, world blooms

## World Zones

- **North:** Utility Station & High-Rise Offices (Solar Co-op target)
- **Central Plaza:** Bulletin Board, Empty Lot (Garden), Old Warehouse (Tool Library), Town Hall
- **South:** Player apartment, Corner Grocer & Community Fridge, Courtyard (NPC hub)

## Community Build Nodes

- Node A: Community Kitchen & Fridge
- Node B: Rooftop Solar Cooperative
- Node C: Legal Defense Fund

## Workflow

See `docs/WORKFLOW.md` for branching strategy and commit conventions.
See `docs/TASK-STATUS.md` for current sprint status.
See `docs/stories/` for user stories by epic.
See `docs/tasks/` for technical tasks by milestone.
