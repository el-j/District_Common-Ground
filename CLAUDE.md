# District: Common Ground — CLAUDE.md

## What This Is

A browser-based 2D top-down game about urban community resilience. Players navigate a neighborhood under economic stress, build community infrastructure, and face crises that force a choice between scapegoating neighbors or practicing solidarity. Ships as a PWA (Progressive Web App) playable on mobile and desktop, with a Go backend for cloud saves and a Docker stack for local development.

## Repository Layout (Mono-Repo)

```
district-common-ground/             ← workspace root
├── apps/
│   ├── web/                        ← Vite/Phaser frontend
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   ├── state/          useGameStore.ts, actions.ts, persistence.ts
│   │   │   │   ├── simulation/     EconomyMath.ts
│   │   │   │   └── audio/          SoundSynth.ts
│   │   │   ├── world/
│   │   │   │   ├── WorldScene.ts, InputManager.ts, CollisionSystem.ts
│   │   │   │   └── entities/       PlayerEntity.ts, NPCEntity.ts
│   │   │   ├── ui/
│   │   │   │   ├── TopHUD.ts, CharacterSelect.ts, AuthOverlay.ts
│   │   │   │   ├── DialogueOverlay.ts, ConstructionModal.ts
│   │   │   │   └── (CrisisWireModal.ts — M4)
│   │   │   ├── api/
│   │   │   │   ├── client.ts       typed fetch wrapper
│   │   │   │   └── endpoints/      auth.ts, save.ts
│   │   │   ├── skins/              ThemeManager.ts, SkinInterface.ts (M5)
│   │   │   └── main.ts
│   │   ├── public/
│   │   │   └── assets/
│   │   │       ├── skins/          solarpunk/, retro_gb/
│   │   │       └── data/           crisis_scenarios.json
│   │   ├── index.html
│   │   ├── vite.config.ts          proxy /api → localhost:8080
│   │   ├── vitest.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json            @district-cg/web
│   │   ├── nginx.conf              SPA routing + /api proxy
│   │   └── Dockerfile
│   └── api/                        ← Go REST API
│       ├── cmd/server/main.go      chi router + wiring
│       ├── internal/
│       │   ├── auth/               register, login, JWT token
│       │   ├── save/               GET/PUT game state (pgx, JSONB)
│       │   ├── gamedata/           crisis scenarios (embedded JSON)
│       │   ├── config/             env config (fail-fast)
│       │   ├── db/                 pgxpool + golang-migrate
│       │   │   └── migrations/     001–003 SQL files
│       │   └── middleware/         CORS, RequireAuth, Recover
│       ├── testutil/               shared testcontainers helper
│       ├── go.mod                  github.com/district-cg/api
│       └── Dockerfile              go → scratch (+ wget for healthcheck)
├── packages/
│   └── shared-types/               GameState, CrisisScenario, ApiUser
├── docker-compose.yml              web + api + db (production-like)
├── docker-compose.dev.yml          hot-reload overrides, exposes DB
├── .env.example                    required secrets documented
├── .github/workflows/ci.yml        lint → test → docker build
├── CLAUDE.md                       ← you are here
└── docs/
```

## Tech Stack

| Layer | Tool | Notes |
|---|---|---|
| Language | TypeScript 5.4+ | Strict mode: `noImplicitAny`, `strictNullChecks` |
| Bundler | Vite 8 (rolldown/OXC) | **NO esbuild anywhere** — verify with `npm ls esbuild` |
| Linter | oxlint | Replaces ESLint; `npm run lint` → `oxlint src/` |
| Testing | Vitest 4.x | Must use Vite 8 — esbuild-free |
| Tilemap Engine | Phaser 3 | AABB collision, tilemap, camera |
| UI | Tailwind CSS v4 + Native DOM | No React — overlays rendered as HTML |
| State | Zustand 4.x | Outside-React, vanilla store |
| Persistence | idb-keyval 6.x (offline) + Go API (cloud) | Hybrid: IndexedDB always, server sync when authed |
| Audio | Web Audio API (native) | Procedural synth — no MP3 downloads |
| Backend | Go 1.23 | `CGO_ENABLED=0`, static binary, Wails-compatible |
| Router | chi v5 | Lightweight HTTP router, no code generation |
| Database | PostgreSQL 17 via pgx/v5 | Raw SQL, no ORM; migrations via golang-migrate |
| Auth | HS256 JWT (golang-jwt/v5) | 30-day expiry, `sub` = userId |
| Passwords | bcrypt cost 12 | `golang.org/x/crypto/bcrypt` |
| Testing (Go) | `go test -race`, testcontainers-go | No mocks for DB — real PostgreSQL in containers |

## API Endpoints

```
POST /api/v1/auth/register   → {token, userId}
POST /api/v1/auth/login      → {token, userId}
GET  /api/v1/save            → GameState JSON       (auth required)
PUT  /api/v1/save            → 204 No Content       (auth required)
GET  /api/v1/data/crises     → CrisisScenario[]     (public)
GET  /health                 → {"status":"ok"}
```

## Persistence Strategy

```
boot:
  if (localStorage.getItem('dcg-token'))
    → GET /api/v1/save  (server-first; 401 clears token, falls through)
  else
    → IndexedDB load

advanceDay():
  1. saveToDB(state)           // IndexedDB — always, offline-safe
  2. if (token) uploadToServer // fire-and-forget, no UI block
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

## Security Constraints

- `JWT_SECRET` must be ≥ 32 bytes — never logged, never committed
- `POSTGRES_PASSWORD` never hardcoded — testcontainers generates its own
- Go binary must be `CGO_ENABLED=0` (scratch images + Wails portability)
- `VITE_ORIGIN` must be the deployed web URL in production (CORS)

## Running Locally

```bash
# Dev (Vite HMR + Go hot-reload via docker compose)
cp .env.example .env   # fill in secrets
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend only
cd apps/web && npm run dev        # → http://localhost:9300

# Go API only (needs PostgreSQL running)
cd apps/api && go run ./cmd/server

# Tests
cd apps/web && npm test           # Vitest
cd apps/api && go test -race -short ./...        # unit tests
cd apps/api && go test -race ./...               # unit + integration (needs Docker)
```

## Workflow

See `docs/WORKFLOW.md` for branching strategy and commit conventions.
See `docs/TASK-STATUS.md` for current sprint status.
See `docs/stories/` for user stories by epic.
See `docs/tasks/` for technical tasks by milestone.
