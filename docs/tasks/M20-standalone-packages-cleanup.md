# M20 — Standalone Package Architecture Cleanup

Story: [`docs/stories/EPIC-20-standalone-package-architecture.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/stories/EPIC-20-standalone-package-architecture.md)
Planning: [`docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md)
Status: `[ ] Not Started`

> This milestone's core architectural requirement — every minigame/transport as a standalone `packages/*` package — is **already true** of the codebase (`minigame-courier-rush`, `plugin-geo-weather`, `plugin-mesh-comms`, `plugin-mutual-credit`, `plugin-bitchat` all qualify). This doc tracks the 3 concrete, verified gaps between that existing convention and the planning doc's full contract — nothing more was fabricated to pad this out.

---

## 1. Per-Package Script Surface
- [ ] Every `packages/plugin-*` and `packages/minigame-*` `package.json` gets real `dev`, `build`, and `check` scripts matching the planning doc's contract (`"dev": "vite"`, `"build": "tsc --noEmit"`, `"check": "tsc --noEmit"`) — today every one of them (`minigame-courier-rush`, `plugin-bitchat`, `plugin-geo-weather`, `plugin-mesh-comms`, `plugin-mutual-credit`) has only a bare `"typecheck": "tsc --noEmit"` script (verified by reading each `package.json` directly).
- [ ] Confirm each package can actually run `npm run dev --workspace=@district-cg/<pkg>` in isolation per the planning doc's "Verification & Testing Independence" section — this likely needs a minimal `vite.config.ts` per package, not just the script entry.

## 2. Remote Dynamic-Loading Path
- [ ] `apps/web/src/core/kernel/MinigameLoader.ts` currently only has `registerLocalMinigame()` — there is no `entrypointUrl`-based remote-loading method at all (verified by reading the full file: no `import()` call, no remote-URL handling exists anywhere in it). Add a `loadRemoteMinigame(manifest: MinigameManifest)` (or equivalent) that does a real `await import(/* @vite-ignore */ manifest.entrypointUrl)` and validates the returned module shape before registering it, matching the planning doc's Host Dynamic Loading Protocol section 3.2.
- [ ] The remote path must go through the same quarantine/owner-approval flow M14 already built (`verification_requests.go`) before a remotely-loaded plugin reaches the verified catalog — don't let remote loading bypass the trust gate local packages already get for free by being committed to the monorepo.
- [ ] Test: a same-origin fixture module (a tiny `.ts` file built as a test fixture, not a real 3rd-party host) loads via the remote path and mounts correctly; a malformed/missing-export module fails gracefully without crashing the loader.

## 3. Naming Consistency
- [ ] Resolve `transport-bitchat` (the planning doc's mockup name) vs. `plugin-bitchat` (the real, shipped package) — recommend correcting `docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`'s topology diagram to say `plugin-bitchat`, since that matches the convention all 4 existing plugins already use, rather than renaming the shipped package.

---

## Out of Scope (unchanged from existing convention, not a gap)
- The Go-side plugin registration model (static `Register()` calls, not filesystem/runtime discovery) is intentional per M14's original decision — see [`TD1`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/TD1-native-plugin-loader-cgo-conflict.md) for the one place this was violated and needs resolving separately.
