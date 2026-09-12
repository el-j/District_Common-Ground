# EPIC 07 — Infrastructure, Docker & Go Backend

**Milestone:** M7 — Sprint 7
**Status:** [~] In Progress

## Context

The game currently runs entirely client-side. This epic transforms it into a proper product:
a mono-repo with an independently deployable frontend and a Go API backend, the entire
stack running locally with a single `docker compose up`, and a PostgreSQL database that
holds user accounts, cloud saves, and crisis history. The Go backend is also designed so
that a future Wails build can embed it as a native desktop/mobile app without any
architectural changes.

The guiding principle: **every layer must be slim, typed, and testable in isolation.**
No magic frameworks, no heavy ORMs, no generated code. Raw SQL + pgx, stdlib HTTP
(enhanced with `chi` for routing), table-driven Go tests, and Vitest for the frontend.

---

## User Stories

### S7.1 — Mono-Repo Structure
As a developer joining the project,
I want a single repository with clearly separated `apps/web` and `apps/api` workspaces,
so that I can work on the frontend or backend independently, with each having its own
Dockerfile, dependency tree, and CI step.

**Acceptance criteria:**
- `apps/web/` contains the complete Vite/Phaser frontend (moved from root)
- `apps/api/` contains the Go service
- `packages/shared-types/` holds cross-app TypeScript types (e.g. `GameState`, `CrisisScenario`)
- Root `package.json` uses npm workspaces; `npm run dev` at root starts the web dev server
- `docker compose up` at root starts both apps + the database
- `go test ./...` runs from `apps/api/`

---

### S7.2 — One-Command Dev Stack
As a developer,
I want `docker compose up` to bring up a fully working local environment in under 60 seconds,
so that onboarding a new contributor requires zero manual setup beyond Docker and an `.env` file.

**Stack:**
| Service | Image | Port |
|---|---|---|
| `web` | multi-stage nginx:alpine | 9300 |
| `api` | multi-stage scratch (Go) | 8080 |
| `db` | postgres:17-alpine | 5432 (dev only) |

**Acceptance criteria:**
- All 3 services declare health checks; `docker compose ps` shows all `healthy`
- `docker-compose.dev.yml` overrides add volume mounts for hot-reload and expose the DB port
- `.env.example` documents every required secret (`POSTGRES_PASSWORD`, `JWT_SECRET`, `VITE_API_URL`)
- Images: `web` ≤ 80 MB, `api` ≤ 25 MB (Go scratch build)

---

### S7.3 — Go REST API
As a developer,
I want a slim Go API service following standard project layout,
so that every handler, service, and repository is independently testable and the binary
compiles to a single static file for Docker scratch images.

**Endpoints (v1):**
```
POST /api/v1/auth/register   → {token, userId}
POST /api/v1/auth/login      → {token, userId}
GET  /api/v1/save            → GameState JSON        (auth required)
PUT  /api/v1/save            → 204 No Content        (auth required)
GET  /api/v1/data/crises     → CrisisScenario[]      (public)
GET  /health                 → {"status":"ok"}
```

**Acceptance criteria:**
- Stateless JWT auth (HS256, 30-day expiry)
- Passwords hashed with bcrypt (cost 12)
- pgx/v5 for all DB queries — no ORM, raw SQL
- `golang-migrate` runs migrations on startup
- `chi` router with structured middleware chain: recover → logger → CORS → auth
- All config from environment variables (no config files committed)

---

### S7.4 — Cloud Save & Session Persistence
As a player,
I want my game progress synced to the server whenever I advance a day,
so that I can close the tab, switch devices, or clear my browser without losing my save.

**Persistence strategy (layered):**
1. On `advanceDay()`: write to IndexedDB immediately (fast, offline-safe)
2. If authenticated: `PUT /api/v1/save` in the background (fire-and-forget, no UI block)
3. On boot: if authenticated, `GET /api/v1/save` from server; else fall back to IndexedDB

**Acceptance criteria:**
- Server save is always preferred over local IndexedDB when a token is present
- Network failure does NOT block gameplay — IndexedDB is the source of truth offline
- Auth state stored in `localStorage` (token only, never password)
- An `AuthOverlay.ts` HTML component handles register/login before the character select

---

### S7.5 — Automated Tests (Rocksolid CI)
As a developer,
I want every PR verified by automated tests before merge,
so that no regression slips through and the game is always in a releasable state.

**Test layers:**

| Layer | Tool | Scope |
|---|---|---|
| Go unit | `go test` | Service + token logic (table-driven, no DB) |
| Go integration | `testcontainers-go` | Repository queries against real PostgreSQL |
| Go HTTP | `net/http/httptest` | Handler request/response cycle |
| Frontend unit | Vitest | State actions, archetype seeding, persistence logic |
| CI | GitHub Actions | Runs all layers on every push + PR |

**Acceptance criteria:**
- `go test -race ./...` passes (race detector enabled in CI)
- `go test -cover ./...` reports ≥ 80% coverage on `internal/` packages
- `vitest run` passes for all `*.test.ts` files
- CI workflow: lint (`oxlint`) → typecheck (`tsc`) → Go tests → Vitest → Docker build
- No test mocks the database — integration tests use a real PostgreSQL container

---

### S7.6 — Wails-Ready Go Binary
As a developer planning future native app distribution,
I want the Go API structured so that a Wails v3 build can embed the frontend and expose
the same handlers locally,
so that a native desktop/mobile app can ship from this exact codebase without a rewrite.

**Wails path (deferred to M8+):**
- Wails v3 project: `wails init -n district-cg-desktop`
- `//go:embed all:frontend/dist` embeds the Vite build
- Same `internal/` handlers serve locally (no external DB needed for offline desktop)
- Build produces a single native binary per platform: macOS, Windows, Linux

**Acceptance criteria (M7):**
- Go binary compiles as a pure static binary: `CGO_ENABLED=0 go build -ldflags="-s -w"`
- No C dependencies or runtime OS libraries required
- API service runs identically whether launched by Docker or by Wails
