# EPIC-29 — Route Built-in Minigames Through the Plugin/Remote-Load System

## Origin

The final deferred item from [EPIC-28](EPIC-28-eye-candy-audit-and-stability-fixes.md)'s 8-issue audit: "mini-games are build into the frontend and not loaded via plugin system independently." EPIC-28 scoped this out as a genuine infra build-out rather than a same-pass fix. The user asked to tackle it as a direct follow-up.

Three Explore agents audited the live code (the frontend loader, the Go backend catalog, and the 5 minigame packages themselves) before any implementation, to ground the design in what actually exists rather than what the code's own comments claimed.

## Design Intent

The remote-loading path already existed and was already tested — it was simply dead in production. `MinigameLoader.loadRemoteMinigame(manifest)` does a real `import(manifest.entrypointUrl)` and has its own passing test suite using a fixture module, but nothing in `main.ts` ever called it. The 5 built-in games (`courier-rush`, `kitchen-rush`, `solidarity-line`, `tenant-match`, `tool-workshop`) were instead wired via static top-level imports directly into the main app bundle.

Three concrete gaps stood between "the path exists" and "the games actually use it":

1. **No build step.** Each package's `"build"` script was `tsc --noEmit` — a typecheck, not a compile. `manifest.entrypointUrl` was a bare npm specifier (`@district-cg/minigame-courier-rush`), which a real browser `import()` cannot resolve — only Vite's own static-import resolution could. Fixed by giving each package a real Vite library-mode build emitting a self-contained ESM bundle to `apps/web/public/plugins/<id>/index.js`, wired into the root build pipeline (`npm run build:minigames`, and as a prerequisite of `make build`/`make dev`/`make dev-d`/CI).
2. **The Go catalog only knew about 1 of the 5 games**, and had a real pre-existing field-shape bug — `PluginMetadata`'s JSON tags (`name`/`entrypoint`) never matched what the frontend decoded for (`title`/`entrypointUrl`), so even the one working entry (`courier-rush`) rendered blank in the catalog UI. Fixed the tags, and added a lightweight metadata-only catalog entry for the other 4 games (no real backend session/anti-cheat logic — that's a separate, much larger effort scoped out below).
3. **`main.ts` still had to import something to get each game's manifest data.** Replaced the 5 static imports entirely with a small hand-written fallback catalog (`builtinMinigameCatalog.ts`) containing no import from any `@district-cg/minigame-*` package — verified by production-building the app and grepping the output bundles for each game's class names, finding none.

The result, proven live: `GET /api/v1/games` lists all 5 with real metadata; each game's actual code now loads as a separate network fetch of its own bundle, not as part of the app's main JS payload; and the games keep working even with the API stopped, via the same hardcoded fallback manifests pointing at the same static (same-origin, shipped-with-the-app) bundle paths.

## Non-Goals

- **Routing through `SandboxedPluginRuntime`/`PluginRegistry`'s iframe-sandbox + hash-verification + owner-review flow.** That machinery is for untrusted third-party code a user installs from an arbitrary URL. The 5 built-ins are first-party and already trusted; sandboxing them would add real complexity (iframe/postMessage hop, review-queue entries) for no security benefit. They keep mounting through the existing unsandboxed `MinigameContainer` DOM-mount path — only how the module gets registered changed.
- **Real server-side anti-cheat/session logic (`StartSession`/`ProcessInput`/`ComputeScore`) for the 4 games that don't have it.** Only `courier-rush` has a real Go `GamePlugin`. Porting real backend scoring for the other 4 is a separate, much larger effort per game, unrelated to "is this loaded via the plugin system."
- **Hash verification on `loadRemoteMinigame`.** These are same-origin static files shipped with the app's own deploy — no meaningful trust boundary exists to check against, unlike a third-party manifest URL.
- **Changing `PluginManagerModal`.** Confirmed by reading it directly: it never independently lists server-catalog games as "available to install" — it only cross-references `serverGames` against records the user has already installed. Adding the 5 built-ins to the server catalog doesn't create any confusing "install" affordance there.
