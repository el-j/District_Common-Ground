# M29 — Route Built-in Minigames Through the Plugin/Remote-Load System

Story: [`docs/stories/EPIC-29-minigame-plugin-architecture.md`](../stories/EPIC-29-minigame-plugin-architecture.md)

Planning: none new under `docs/planning/` — a direct-request follow-up to EPIC-28's deferred item #8, scoped ad hoc via 3 parallel Explore agents before implementation.

Status: **Implemented 2026-09-17.** `tsc --noEmit` clean, `vitest run` 388/388 (4 new, no regressions), `oxlint` clean, `go build`/`go vet`/`go test -race` (short + full integration, real Postgres via Docker) all clean. Live-verified against the running dev stack, including a full production build to prove main-bundle decoupling and an API-down check to prove offline fallback.

## Section 1 — Give each minigame package a real build step

- [x] `packages/minigame-{courier-rush,kitchen-rush,solidarity-line,tenant-match,tool-workshop}/vite.config.ts`: added `build.lib` config (entry `src/index.ts`, format `es`, `fileName: () => 'index.js'`) outputting to `../../apps/web/public/plugins/<id>` with `emptyOutDir: true`. Vite library mode (rolldown/OXC under Vite 8) — no esbuild, per this project's tech-stack rule.
- [x] Each package's `package.json`: `"build"` changed from `tsc --noEmit` (typecheck only, zero output) to `tsc --noEmit && vite build`.
- [x] Each package's `src/index.ts`: `manifest.entrypointUrl` changed from the bare npm specifier (e.g. `@district-cg/minigame-courier-rush`, which a real browser `import()` cannot resolve) to the real served path (`/plugins/courier-rush/index.js`, etc.).
- Verified each bundle is self-contained: `grep -c "shared-types"` on the built output returns 0 (the `@district-cg/shared-types` imports are type-only interfaces, erased at build time).

## Section 2 — Wire the build into the root pipeline

- [x] New `scripts/build-minigames.sh` — loops `npm run build --workspace=@district-cg/minigame-<id>` across all 5 packages.
- [x] Root `package.json`: added `"build:minigames"` script; `"build"` now runs it before `npm -w apps/web run build` (Vite copies `public/` into `dist/` at build time, so ordering matters).
- [x] `Makefile`: new `build-minigames` target; added as a prerequisite of `build`, `build-offline-pwa`, `dev`, and `dev-d` (so `apps/web/public/plugins/*/index.js` exists before the dev server or any production build starts).
- [x] `.github/workflows/ci.yml`: added a `Build minigame plugin bundles` step (running `npm run build:minigames` from the repo root) before `npm run check`/`npm run test` in the `web` job.

## Section 3 — Decouple `main.ts` from the 5 packages entirely

- [x] New `apps/web/src/core/kernel/builtinMinigameCatalog.ts`: `BUILTIN_MINIGAME_MANIFESTS` — 5 hand-written `MinigameManifest` literals (no import from any `@district-cg/minigame-*` package), each `entrypointUrl` pointing at its static build path. `fetchAndMergeMinigameCatalog()` calls the existing `listGames()` (`apps/web/src/api/endpoints/games.ts`, `GET /api/v1/games`) and merges: a server entry overrides the fallback for a matching id (title/description/etc. can now be updated server-side with no app redeploy), any server-only id is added too (the path for a 6th built-in game with zero frontend changes), and on fetch failure the fallback list is returned unchanged.
- [x] `apps/web/src/main.ts`: removed the 5 static `import { manifest } from '@district-cg/minigame-*'` lines and their `MinigameLoader.registerLocalMinigame(...)` calls entirely. `boot()` now calls `fetchAndMergeMinigameCatalog()` then `MinigameLoader.loadRemoteMinigame(manifest)` per game, each independently caught so one bad/missing game logs and is skipped rather than blocking boot (matching the existing `bootstrapInstalledPlugins().catch(() => undefined)` pattern already in `boot()`).
- [x] `apps/web/src/core/kernel/MinigameLoader.ts`: updated `loadRemoteMinigame`'s doc comment, which previously stated manifests fed to it only ever come from `GET /api/v1/games` — now documents the amended invariant: a same-origin, first-party fallback manifest for these 5 known games is also a valid source when that endpoint is unreachable, and third-party/arbitrary manifests still never reach this method (they go through `PluginRegistry`'s separate hash-verified install flow).
- **Proven, not just claimed**: production-built the app (`npm run build`) and grepped `dist/assets/*.js` for each game's class name (`CourierGame`, `KitchenRushGame`, etc.) — none found. `dist/plugins/<id>/index.js` exist as separate artifacts.

## Section 4 — Fix the Go metadata shape mismatch + add catalog entries for the other 4 games

- [x] `packages/go/kernel-contracts/contracts.go`: `PluginMetadata`'s JSON tags fixed — `Name` (`json:"name"` → `json:"title"`), `Entrypoint` (`json:"entrypoint"` → `json:"entrypointUrl"`), plus new `Description`, `ThumbnailURL` (`json:"thumbnailUrl"`), `TargetHardware` (`json:"targetHardware"`) fields. This was a real pre-existing bug, not just a gap: courier-rush's own catalog entry was already rendering blank title/entrypoint wherever the frontend decoded `GET /api/v1/games`, since the old tags never matched what `MinigameManifest`/`ServerGameManifest` expects.
- [x] `packages/go/plugin-courier-rush/plugin.go`: `Metadata()` updated to populate the new fields (category corrected from `"arcade"` to `"delivery"` to match the frontend manifest; entrypoint updated to the real static path) and to add the `audio:sfx` permission already present on the frontend side.
- [x] New `apps/api/internal/kernel/builtin_games.go`: `BuiltinGameManifests()` — a small hardcoded `[]PluginMetadata` for the 4 games with no real `GamePlugin` backend (`kitchen-rush`, `solidarity-line`, `tenant-match`, `tool-workshop`), metadata-only (no `StartSession`/`ProcessInput`/`ComputeScore` — see EPIC-29 non-goals), `entrypointUrl` pointing at the same static bundle paths.
- [x] `apps/api/internal/kernel/handler.go`: `ListGames` now merges 3 sources instead of 2 — `registry.List()` (real `GamePlugin`s, currently just courier-rush), `BuiltinGameManifests()` (the other 4), and `repo.ListVerifiedPlugins()` (owner-approved third-party, unchanged).
- [x] New `apps/api/internal/kernel/handler_test.go` (`TestListGames_MergesRegistryBuiltinAndVerifiedCatalogs`, integration test against real Postgres via testcontainers, `t.Skip` under `-short` matching the project's existing pattern): asserts all 5 built-in ids appear in the response with a populated `title`/`entrypointUrl` — closes a real test gap (`GET /api/v1/games` had zero HTTP-level coverage before this).

## Section 5 — `PluginManagerModal`

- No change needed. Confirmed by reading it directly: `renderCatalog()` only ever renders `snapshot.installed` (user-installed third-party plugins) and uses `snapshot.serverGames` purely to cross-reference version status on already-installed cards — it never independently lists server games as "available to install," so the 5 built-ins appearing in the server catalog creates no confusing duplicate-install UI.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — 388/388 passed (4 new tests in `builtinMinigameCatalog.test.ts`: fallback shape, server-override merge, server-only-id extension, fetch-failure fallback).
3. `cd apps/web && npx oxlint src/` — clean.
4. `npm run build:minigames` (from repo root) — all 5 `apps/web/public/plugins/<id>/index.js` bundles produced, each self-contained.
5. `cd apps/api && go build ./... && go vet ./... && go test -race -short ./...` — clean. `go test -race ./...` (full integration suite, real Postgres via Docker) — also clean, including the new `TestListGames_MergesRegistryBuiltinAndVerifiedCatalogs`.
6. Live, via `make dev-d`: `curl localhost:8080/api/v1/games` — all 5 games present with populated `title`/`entrypointUrl`; `curl localhost:9300/plugins/<id>/index.js` for each — `200 text/javascript`. Stopped the `api` container and confirmed the static plugin bundles still serve (`200`) via nginx while the API proxy correctly fails (`502`) — proving the offline-fallback path is real, not just unit-tested. Restarted `api`, confirmed healthy again.
7. Production build (`npm run build`): confirmed `dist/plugins/<id>/index.js` exist as separate artifacts, and `grep`ped `dist/assets/*.js` for each game's class name (`CourierGame`, `KitchenRushGame`, `SolidarityLineGame`, `TenantMatchGame`, `ToolWorkshopGame`) — none found in the main bundles, proving the decoupling claim rather than asserting it.
