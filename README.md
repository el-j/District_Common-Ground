# District: Common Ground

A 2D top-down browser game about how a neighbourhood holds together under economic stress. You work, pay rent, and build shared infrastructure: a community kitchen, a solar co-op, a legal fund, a tool library and a land trust. When a crisis hits, you choose between scapegoating your neighbours and standing with them.

It is an installable PWA that runs on desktop and mobile. It works fully offline, and an account is only needed for cloud saves and the social features.

## Play locally

Requirements: Docker (with Compose), Node 22, Go 1.26, `make`.

```bash
make setup   # creates .env from .env.example, installs npm + Go deps
make dev     # dev stack with hot reload → http://localhost:9300
```

Frontend only, with no account features:

```bash
npm install
npm run build:minigames && npm run build:skins   # plugin bundles into apps/web/public/plugins/
cd apps/web && npm run dev
```

## Self-host (production-like)

```bash
cp .env.example .env    # set POSTGRES_PASSWORD, JWT_SECRET, GAME_SESSION_SECRET (≥ 32 chars), VITE_ORIGIN
make up                 # web (nginx) on :9300, API and PostgreSQL on the internal network
```

Before you put it on the internet, read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). It covers TLS, backups, monitoring and the legal pages you must fill in.

## Checks

```bash
make check                          # oxlint + go vet + unit tests (web + API)
cd apps/web && npx playwright test  # end-to-end (desktop + mobile)
make test-integration               # Go tests against real PostgreSQL (Docker)
```

## Repository

| Path | What |
|---|---|
| `apps/web` | Phaser 3 + TypeScript client (Vite 8, Zustand, native DOM overlays) |
| `apps/api` | Go REST API (chi, pgx, golang-migrate) |
| `packages/*` | Shared types and runtime-loaded plugins (minigames, skins, interiors, weather) |
| `docs/` | Planning, audits (`docs/AUDIT-2026-09-29-LAUNCH-READINESS.md`), workflow |

For contributor notes and the architecture rules, see [`CLAUDE.md`](CLAUDE.md) and [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

## License

No license has been chosen yet. Until a `LICENSE` file is added, all rights are reserved.
