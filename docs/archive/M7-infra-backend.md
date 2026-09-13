# M7 Tasks — Infrastructure, Docker & Go Backend

**Sprint:** 7
**Status:** [~] In Progress
**Stories:** EPIC-07
**Depends on:** M1–M3 complete

---

## Phase 1 — Mono-Repo Restructure

Move the existing frontend into `apps/web/` and initialise the Go service at `apps/api/`.
The root becomes a workspace coordinator only.

### Target directory layout

```
district-common-ground/             ← repo root (workspace root)
├── apps/
│   ├── web/                        ← Vite/Phaser frontend (moved from root)
│   │   ├── src/
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts          ← add VITE_API_URL proxy for dev
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   ├── nginx.conf              ← NEW
│   │   └── Dockerfile              ← NEW
│   └── api/                        ← Go service (all new)
│       ├── cmd/server/main.go
│       ├── internal/
│       │   ├── auth/
│       │   │   ├── handler.go
│       │   │   ├── handler_test.go
│       │   │   ├── service.go
│       │   │   ├── service_test.go
│       │   │   └── token.go
│       │   ├── save/
│       │   │   ├── handler.go
│       │   │   ├── handler_test.go
│       │   │   ├── repository.go
│       │   │   └── repository_test.go
│       │   ├── gamedata/
│       │   │   ├── handler.go
│       │   │   └── handler_test.go
│       │   ├── config/
│       │   │   └── config.go
│       │   ├── db/
│       │   │   └── db.go
│       │   └── middleware/
│       │       ├── auth.go
│       │       ├── cors.go
│       │       └── recover.go
│       ├── db/migrations/
│       │   ├── 001_create_users.up.sql
│       │   ├── 001_create_users.down.sql
│       │   ├── 002_create_saves.up.sql
│       │   ├── 002_create_saves.down.sql
│       │   ├── 003_create_crisis_log.up.sql
│       │   └── 003_create_crisis_log.down.sql
│       ├── testutil/
│       │   └── db.go               ← shared test DB setup (testcontainers)
│       ├── go.mod
│       ├── go.sum
│       └── Dockerfile
├── packages/
│   └── shared-types/
│       ├── package.json
│       └── src/index.ts            ← GameState, CrisisScenario, ApiUser
├── docker-compose.yml              ← production-like stack
├── docker-compose.dev.yml          ← dev overrides (hot-reload, exposed DB)
├── .env.example
├── oxlint.json                     ← stays at root (applies to all apps/web/src)
├── CLAUDE.md                       ← updated with mono-repo layout
└── docs/
```

### Tasks

- [ ] `git mv` all frontend files: `src/`, `public/`, `index.html`, `tsconfig.json`,
      `vite.config.ts`, `package.json`, `oxlint.json` → `apps/web/`
      (keep root `oxlint.json` as a symlink or duplicate — oxlint doesn't recurse workspaces)
- [ ] Create root `package.json` with `"workspaces": ["apps/web", "packages/*"]` and
      delegate scripts:
      `"dev": "npm -w apps/web run dev"`,
      `"build": "npm -w apps/web run build"`,
      `"check": "npm -w apps/web run check"`
- [ ] Create `packages/shared-types/package.json` + `src/index.ts`
      (export `GameState`, `CrisisScenario`, `ApiUser`, `ClassRole`)
- [ ] Add `@district-cg/shared-types` as a dev dependency in `apps/web/package.json`
- [ ] Update `apps/web/vite.config.ts`: add `server.proxy` for `/api` → `http://localhost:8080`
- [ ] Update `CLAUDE.md` with the new full directory layout

---

## Phase 2 — Go API Service

### Dependencies (`apps/api/go.mod`)

```
module github.com/district-cg/api

go 1.26

require (
  github.com/go-chi/chi/v5             v5.x
  github.com/golang-jwt/jwt/v5         v5.x
  github.com/jackc/pgx/v5             v5.x
  github.com/golang-migrate/migrate/v4 v4.x
  golang.org/x/crypto                  latest
)
```

No ORM. All queries are raw SQL via pgx. No code generation.

### Config (`internal/config/config.go`)

```go
type Config struct {
  Port        string  // PORT (default "8080")
  DatabaseURL string  // DATABASE_URL (required)
  JWTSecret   string  // JWT_SECRET (required, ≥32 chars)
  GoEnv       string  // GO_ENV (default "production")
}
// Load() reads from os.Getenv, fails fast on missing required fields.
```

### Database (`internal/db/db.go`)

- `pgxpool.New(ctx, cfg.DatabaseURL)` — connection pool
- `ping()` on startup to fail fast if DB unreachable
- Run `golang-migrate` migrations before accepting requests

### Migrations

```sql
-- 001_create_users.up.sql
CREATE TABLE users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 002_create_saves.up.sql
CREATE TABLE game_saves (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)           -- one save per user, upserted
);

-- 003_create_crisis_log.up.sql
CREATE TABLE crisis_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  crisis_id  TEXT NOT NULL,
  day        INT  NOT NULL,
  choice     TEXT NOT NULL CHECK (choice IN ('scapegoat','solidarity')),
  summary    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON crisis_log (user_id, day);
```

### Auth (`internal/auth/`)

- `service.go`: `Register(email, password) → (userId, token, error)` — bcrypt cost 12
- `service.go`: `Login(email, password) → (userId, token, error)` — constant-time compare
- `token.go`: `Sign(userId) → token` — HS256, 30-day exp, `sub` = userId
- `token.go`: `Verify(token) → (userId, error)` — validates sig + exp
- `handler.go`: `POST /api/v1/auth/register` and `POST /api/v1/auth/login`
  - Validates: email format, password ≥ 8 chars
  - Returns: `{"token":"...", "userId":"..."}`
  - On error: structured JSON `{"error":"message"}` with appropriate HTTP status

### Save (`internal/save/`)

- `repository.go`: `Load(ctx, userId) → (*GameState, error)` — SELECT from game_saves
- `repository.go`: `Upsert(ctx, userId, state) → error` — INSERT … ON CONFLICT DO UPDATE
- `handler.go`: `GET /api/v1/save` — requires auth, returns GameState JSON or 404
- `handler.go`: `PUT /api/v1/save` — requires auth, body is GameState JSON, returns 204

### Game Data (`internal/gamedata/`)

- `handler.go`: `GET /api/v1/data/crises`
  - Reads `public/assets/data/crisis_scenarios.json` (embedded via `//go:embed`)
  - Returns JSON array — public, no auth needed
  - Enables M4 to fetch crises from the server rather than a bundled file

### Middleware chain (applied in order)

```
Recover → Logger → CORS → (route-level: RequireAuth)
```

- `cors.go`: allows `VITE_ORIGIN` env (default `http://localhost:9300`), methods GET/POST/PUT/DELETE
- `auth.go`: `RequireAuth` extracts `Authorization: Bearer <token>`, calls `token.Verify()`,
  sets `userId` in context; returns 401 on missing/invalid token
- `recover.go`: catches panics, logs, returns 500

### Router (`cmd/server/main.go`)

```go
r := chi.NewRouter()
r.Use(middleware.Recover, middleware.Logger, cors.Handler)
r.Get("/health", healthHandler)
r.Route("/api/v1", func(r chi.Router) {
  r.Post("/auth/register", auth.Register)
  r.Post("/auth/login",    auth.Login)
  r.With(requireAuth).Get("/save",  save.Load)
  r.With(requireAuth).Put("/save",  save.Upsert)
  r.Get("/data/crises", gamedata.Crises)
})
```

---

## Phase 3 — Docker Stack

### `apps/web/Dockerfile`

```dockerfile
# Stage 1: build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### `apps/web/nginx.conf`

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  gzip on;
  gzip_types text/plain application/javascript text/css application/json image/svg+xml;

  location /api/ {
    proxy_pass http://api:8080;
    proxy_set_header Host $host;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.(js|css|woff2|webp|png)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

### `apps/api/Dockerfile`

```dockerfile
# Stage 1: build
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server

# Stage 2: minimal runtime
FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
EXPOSE 8080
ENTRYPOINT ["/server"]
```

### `docker-compose.yml`

```yaml
name: district-cg

services:
  db:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: district_cg
      POSTGRES_USER: dcg
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dcg -d district_cg"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build:
      context: ./apps/api
    environment:
      DATABASE_URL: postgres://dcg:${POSTGRES_PASSWORD}@db:5432/district_cg?sslmode=disable
      JWT_SECRET: ${JWT_SECRET}
      PORT: "8080"
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3

  web:
    build:
      context: ./apps/web
    ports:
      - "9300:80"
    depends_on:
      api:
        condition: service_healthy

volumes:
  pgdata:
```

### `docker-compose.dev.yml` (override for local development)

```yaml
services:
  db:
    ports:
      - "5432:5432"        # expose for DB clients (TablePlus, psql)

  api:
    build:
      context: ./apps/api
      target: builder
    command: go run ./cmd/server
    volumes:
      - ./apps/api:/app
      - /app/vendor          # cache go vendor if used
    environment:
      GO_ENV: development

  web:
    build:
      context: ./apps/web
      target: builder
    command: npm run dev -- --host 0.0.0.0 --port 9300
    ports:
      - "9300:9300"
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:8080
```

### `.env.example`

```
POSTGRES_PASSWORD=changeme_in_production
JWT_SECRET=changeme_32_chars_minimum_required
VITE_API_URL=http://localhost:8080
```

---

## Phase 4 — Frontend API Client

### `apps/web/src/api/client.ts`

Thin typed `fetch` wrapper. No third-party HTTP library.

```typescript
const BASE = import.meta.env.VITE_API_URL ?? '';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

### `apps/web/src/api/endpoints/auth.ts`

```typescript
export function register(email: string, password: string): Promise<{token: string; userId: string}>
export function login(email: string, password: string): Promise<{token: string; userId: string}>
```

### `apps/web/src/api/endpoints/save.ts`

```typescript
export function loadFromServer(token: string): Promise<GameState>
export function uploadToServer(token: string, state: GameState): Promise<void>
```

### Updated `persistence.ts` — hybrid strategy

```
boot:
  token = localStorage.getItem('dcg-token')
  if (token) → loadFromServer(token) → hydrate store
  else        → loadFromIndexedDB() → hydrate store

advanceDay():
  1. saveToIndexedDB(state)           // always — offline-safe
  2. if (token) uploadToServer(state) // background, void — no UI block
```

### `AuthOverlay.ts`

Full-screen HTML overlay shown before CharacterSelect when no token present.
- Email + password fields → register or login
- On success: stores token in localStorage, dismisses overlay
- "Play offline" link skips auth (no token stored, IndexedDB-only session)

---

## Phase 5 — Testing

### Go tests

Every `internal/` package has a `_test.go` file alongside its implementation.

**Auth service (unit, no DB):**
```go
// service_test.go
func TestRegister_DuplicateEmail(t *testing.T) { ... }
func TestLogin_WrongPassword(t *testing.T)     { ... }
func TestToken_RoundTrip(t *testing.T)         { ... }
```

**Save repository (integration, real PostgreSQL):**
```go
// repository_test.go — uses testcontainers-go
func TestUpsertAndLoad(t *testing.T)           { ... }
func TestLoad_NotFound(t *testing.T)           { ... }
```

**Handler HTTP tests:**
```go
// handler_test.go — uses net/http/httptest
func TestRegisterHandler_BadEmail(t *testing.T) { ... }
func TestSaveHandler_Unauthenticated(t *testing.T) { ... }
```

All Go tests run with `-race`. CI requires ≥ 80% coverage on `internal/`.

### Frontend unit tests (Vitest)

- [ ] `vitest.config.ts` — extend `vite.config.ts`, point at `src/**/*.test.ts`
- [ ] `src/core/state/actions.test.ts`:
  - `setArchetype('pip')` seeds exact stats ($25, 80 energy, 40 trust, 60 stress)
  - `setArchetype('morgan')` seeds exact stats ($240, 40 energy, 25 trust, 45 stress)
  - `setArchetype('arthur')` seeds exact stats ($1200, 65 energy, 10 trust, 30 stress)
  - `spendCash` never goes below 0
  - `advanceDay` increments day counter
- [ ] `src/core/state/persistence.test.ts`:
  - `loadSave` with valid JSONB → hydrates store
  - `loadSave` with corrupt data → graceful reset, no throw
  - `saveToDB` failure → no exception propagated
- [ ] `src/core/simulation/EconomyMath.test.ts`:
  - `computeResilienceScore({0,0,0})` → 0
  - `computeResilienceScore({100,100,100})` → 100
  - `getBuildBuffState` returns correct bonuses at threshold

### CI (`apps/api/`) — `.github/workflows/ci.yml`

```yaml
name: CI
on: [push, pull_request]
jobs:
  web:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run check        # tsc + oxlint
      - run: npm run test         # vitest run

  api:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: "1.26" }
      - run: go test -race -cover ./...

  docker:
    runs-on: ubuntu-latest
    needs: [web, api]
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build   # verifies both Dockerfiles compile
```

---

## Acceptance Tests (M7)

- [ ] **Test 7.1:** `docker compose up --wait` → all 3 services report `healthy` within 60s;
      `curl http://localhost:9300` returns the game HTML;
      `curl http://localhost:9300/api/v1/health` (proxied via nginx) returns `{"status":"ok"}`

- [ ] **Test 7.2:** Register account → select archetype → advance to day 3 → note position →
      kill browser session → reopen → login → confirm: day 3, same archetype, same resource values
      (state restored from server, not IndexedDB)

- [ ] **Test 7.3:** `go test -race ./... && vitest run` both exit 0 in the CI workflow on main branch

---

## Notes & Constraints

- **No esbuild.** Vite 8 (rolldown) is already in place. Vitest must use the same Vite config
  and must not pull in esbuild as a transitive dependency. Verify with `npm ls esbuild` after
  adding Vitest — it must remain empty.
- **Go binary must be `CGO_ENABLED=0`.** This is required for scratch images and for Wails
  portability. Any library that requires CGO is forbidden.
- **Wails-ready structure.** All game logic goes in `internal/`. `cmd/server/main.go` wires
  them. A future `cmd/desktop/main.go` can reuse the same `internal/` packages with a Wails
  frontend embed, changing nothing in the business logic.
- **Secrets.** `JWT_SECRET` must be ≥ 32 bytes. It is never logged. `POSTGRES_PASSWORD`
  is never hardcoded — not even in tests (testcontainers generates its own).
- **CORS.** In production, `VITE_ORIGIN` must be set to the deployed web URL.
  In dev it defaults to `http://localhost:9300`.
