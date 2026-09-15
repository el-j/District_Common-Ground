# M20 — Standalone Package Architecture Cleanup

Story: [`docs/archive/EPIC-20-standalone-package-architecture.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/archive/EPIC-20-standalone-package-architecture.md)
Planning: [`docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md)
Status: `[x] Complete` — all 3 gaps closed 2026-09-15, see `docs/SPRINT-2026-09-15-PLAN.md` §4.

> This milestone's core architectural requirement — every minigame/transport as a standalone `packages/*` package — is **already true** of the codebase (`minigame-courier-rush`, `plugin-geo-weather`, `plugin-mesh-comms`, `plugin-mutual-credit`, `plugin-bitchat` all qualify). This doc tracks the 3 concrete, verified gaps between that existing convention and the planning doc's full contract — nothing more was fabricated to pad this out.

---

## 1. Per-Package Script Surface — ✅ Done 2026-09-15
- [x] Every `packages/plugin-*` and `packages/minigame-*` `package.json` now has real `dev`/`build`/`check` scripts (`"dev": "vite"`, `"build": "tsc --noEmit"`, `"check": "tsc --noEmit"`, `typecheck` kept for anything already calling it) plus a minimal per-package `vite.config.ts` + `index.html` dev harness.
- [x] Confirmed `npm run dev --workspace=@district-cg/<pkg>` actually starts for all 5 packages (smoke-tested each with a real HTTP request against the dev server, then stopped) — including the exact invocation the planning doc names.

## 2. Remote Dynamic-Loading Path — ✅ Done 2026-09-15
- [x] `apps/web/src/core/kernel/MinigameLoader.ts` — added `static async loadRemoteMinigame(manifest: MinigameManifest): Promise<void>`, a real `await import(/* @vite-ignore */ manifest.entrypointUrl)` that validates the module exports `createMinigame()` before registering it.
- [x] Documented (in code, via a comment on the method) that trust enforcement is structural, not new logic: this method is only ever called with manifests sourced from `GET /api/v1/games`, which already merges only the local-registry's healthy plugins with the Go backend's owner-approved verified catalog (`verification_requests.go`) — there's no other path that feeds it a manifest, so remote loading can't bypass that gate.
- [x] Tests added to `MinigameLoader.test.ts` using two new fixtures (`__fixtures__/remoteMinigameFixture.ts`, `__fixtures__/malformedMinigameFixture.ts`): the real path loads and mounts correctly; the malformed path rejects with a clear, catchable error without corrupting loader state; a missing-`entrypointUrl` manifest also rejects clearly; loading an already-locally-registered id is a safe no-op.

## 3. Naming Consistency — ✅ Done 2026-09-15
- [x] Corrected `docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`'s topology diagram (`transport-bitchat` → `plugin-bitchat`) and `docs/planning/00-MASTER-INDEX-AND-DESIGN-BIBLE.md`'s summary row, matching the convention all shipped plugins already use. The shipped package itself was not renamed.

---

## Out of Scope (unchanged from existing convention, not a gap)
- The Go-side plugin registration model (static `Register()` calls, not filesystem/runtime discovery) is intentional per M14's original decision — see [`TD1`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/TD1-native-plugin-loader-cgo-conflict.md) for the one place this was violated and needs resolving separately.
