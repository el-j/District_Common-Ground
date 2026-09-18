# M30 — Hi-Fi Procedural Skin Plugin Architecture

Story: [`docs/stories/EPIC-30-hifi-skin-plugin-architecture.md`](../stories/EPIC-30-hifi-skin-plugin-architecture.md)

Planning: none new under `docs/planning/` — scoped ad hoc from a direct user request, grounded by reading the live skin/rendering code (`ThemeManager.ts`, `SkinInterface.ts`, `ThemePluginManager.ts`, `WorldScene.ts`, `apps/api/internal/theme/handler.go`) before writing this doc.

Status: **Planned — not yet implemented.**

## Section 1 — `SkinRenderer` plugin contract + loader

New file `apps/web/src/skins/SkinRendererInterface.ts`:
- [ ] `SkinRenderer` interface: `createTilesetTexture(scene: Phaser.Scene, palette: ResolvedWorldPalette): void`, `createPlayerTexture(scene: Phaser.Scene): void`, `createNPCTextures(scene: Phaser.Scene): void`. Signatures deliberately match `WorldScene.ts`'s existing hardcoded functions exactly, so `WorldScene` can call through either one interchangeably.
- [ ] `SkinRendererModule` interface: `{ createRenderer(): SkinRenderer }` — the shape a renderer bundle's default/named export must satisfy, mirroring `MinigameModule`'s `createMinigame()` contract in `apps/web/src/core/kernel/MinigameLoader.ts:6-9`.
- [ ] **Frame-layout contract, documented explicitly as a comment on `SkinRenderer`**: `createPlayerTexture` must produce an 8-frame 16×16 spritesheet in the exact `down×2, up×2, side×2, side-flipped×2` layout `WorldScene.create()`'s `anims.create()` calls assume (frame indices 0–7); `createNPCTextures` must produce exactly 6 16×16 frames in NPC-array order (mira, leo, elena, sal, marcus, higgins). A renderer that changes frame *count* or *order* breaks the existing animation/frame-index wiring — changing what's drawn inside each frame is the entire point, changing the layout is not allowed.

New file `apps/web/src/skins/SkinRendererLoader.ts` (mirrors `MinigameLoader.loadRemoteMinigame`):
- [ ] `loadRemoteSkinRenderer(rendererUrl: string): Promise<SkinRenderer>` — real `import(/* @vite-ignore */ rendererUrl)`, validates the module exports `createRenderer` as a function, calls it once, caches the resulting `SkinRenderer` by `rendererUrl` (not by skin id — lets two skins theoretically share a renderer bundle, though none do here).
- [ ] No sandboxing, no hash verification — same reasoning as `MinigameLoader.loadRemoteMinigame`'s doc comment: these are same-origin, same-deploy, first-party bundles. (Real risk for a *future* third-party renderer — see EPIC-30's Non-Goals — not addressed here.)

`apps/web/src/skins/SkinInterface.ts`:
- [ ] Add `rendererUrl?: string` to `SkinManifest`, alongside the existing `assetMap`/`uiKit` fields. Absent (all 5 existing manifests) → `WorldScene` uses today's 3 hardcoded functions, zero behavior change. Present (the 3 new hi-fi manifests) → `WorldScene` resolves the real renderer instead.

## Section 2 — `WorldScene` resolves a renderer instead of calling 3 hardcoded functions directly

`apps/web/src/world/WorldScene.ts`:
- [ ] Rename the 3 existing free functions' call sites to a `DEFAULT_RENDERER: SkinRenderer` constant (the functions' bodies don't move — they become the default/fallback implementation, used synchronously in `preload()` for the very first frame since `preload()` can't await a dynamic import).
- [ ] `preload()`: unchanged behavior — still calls `DEFAULT_RENDERER.createTilesetTexture/createPlayerTexture/createNPCTextures` synchronously, so first paint never blocks on a network fetch even for a hi-fi skin.
- [ ] Extend the existing `skinRevision`-keyed `useGameStore.subscribe()` callback (`WorldScene.ts:582-587`, the exact mechanism M28 added so a skin switch re-tints the tileset without a scene restart): after re-fetching the active manifest, if `manifest.rendererUrl` is set, `await SkinRendererLoader.loadRemoteSkinRenderer(url)` and call the *resolved* renderer's 3 methods instead of `DEFAULT_RENDERER`'s; on a fetch/import failure, fall back to `DEFAULT_RENDERER` and log — a broken hi-fi renderer degrades to the plain palette-only look, never a blank/crashed world.
- [ ] Cache the resolved `SkinRenderer` per active `skinId` (a small `Map` alongside `lastSkinRevision`) so switching back to an already-loaded hi-fi skin doesn't re-`import()` it.

## Section 3 — Give each hi-fi skin package a real build step

New packages `packages/skin-diorama-glow`, `packages/skin-flat-vector`, `packages/skin-neon-city` — same shape as `packages/minigame-*`:
- [ ] `vite.config.ts`: `build.lib` (entry `src/index.ts`, format `es`, `fileName: () => 'index.js'`), `outDir: '../../apps/web/public/plugins/skins/<id>'`, `emptyOutDir: true`. The `/plugins/skins/<id>/` path (not `/plugins/<id>/`) keeps skin bundles out of the minigame-id namespace `MinigameLoader`/`builtinMinigameCatalog.ts` already own.
- [ ] `package.json`: `"build": "tsc --noEmit && vite build"`.
- [ ] `src/index.ts`: exports `createRenderer(): SkinRenderer` (imports the `SkinRenderer` type from `@district-cg/web`'s skin module via a relative/type-only path the same way minigame packages import shared types — confirm the exact import route MinigameLoader's packages use for `MinigameManifest`/`MinigameInstance` from `@district-cg/shared-types` and match it; if `SkinRenderer` isn't cheap to share that way, define an equivalent local interface per package and keep it structurally compatible — no runtime dependency either way since it's a type-only need).
- [ ] **No `vite.config.ts` change needed for local dev serving** — the M29 dev-only middleware in `apps/web/vite.config.ts` (`serveMinigamePluginBundlesInDev`) already matches any request under `/plugins/` ending in `.js`, so `/plugins/skins/<id>/index.js` is served correctly by the exact same code, unmodified.

## Section 4 — Wire the build into the root pipeline

- [ ] New `scripts/build-skins.sh` (mirrors `scripts/build-minigames.sh`) looping the 3 new packages' `npm run build --workspace=@district-cg/skin-<id>`.
- [ ] Root `package.json`: `"build:skins"` script; `"build"` runs it alongside `"build:minigames"`, before `npm -w apps/web run build`.
- [ ] `Makefile`: new `build-skins` target, added as a prerequisite of `build`, `build-offline-pwa`, `dev`, `dev-d` (same list `build-minigames` is already on).
- [ ] `.github/workflows/ci.yml`: add a `Build hi-fi skin renderer bundles` step (`npm run build:skins`) next to the existing minigame-build step, before `npm run check`/test.

## Section 5 — The 3 hi-fi renderers themselves

Each package's `src/index.ts` implements `createTilesetTexture`/`createPlayerTexture`/`createNPCTextures` from scratch — not a copy of `WorldScene.ts`'s functions with different constants, but genuinely different draw logic per direction:

- [ ] **`skin-diorama-glow`**: `createTilesetTexture` fills each tile with a linear/radial gradient (`CanvasRenderingContext2D.createLinearGradient`) biased toward one fixed light direction instead of a flat `fillStyle`; wall/door tiles get an extra soft drop-shadow strip (`ctx.shadowBlur`/`ctx.shadowColor`) along their lower edge. `createPlayerTexture`/`createNPCTextures` redraw the same 16×16 silhouettes with rounder proportions (bigger head-to-body ratio, thicker outline stroke) and a 2-tone cel-shade (base fill + one lighter highlight patch) instead of flat single-tone fills.
- [ ] **`skin-flat-vector`**: `createTilesetTexture` drops the existing brick-course/grass-speckle detail entirely in favor of 2–3 flat fill bands per tile plus one precomputed low-alpha noise pattern (built once into an offscreen canvas and `drawImage`'d over every tile, not per-pixel `Math.random()` per frame). `createPlayerTexture`/`createNPCTextures` use bold flat capsule/rounded-rect body shapes with minimal internal detail (no separate shirt-shadow band, no per-strand hair pixels).
- [ ] **`skin-neon-city`**: `createTilesetTexture` fills near-black bases and strokes tile edges (wall courses, door frame, road border) with a saturated accent color using a layered-alpha-stroke glow (draw the stroke 3–4 times at decreasing alpha/increasing width, cheapest approximation of bloom on a 2D canvas without a shader — same idea already proven in `WorldScene.spawnStreetlamps()`'s `ADD`-blended circles). `createPlayerTexture`/`createNPCTextures` use sharp angular silhouettes with a thin emissive rim-light edge instead of the diorama skin's soft highlight patch.
- [ ] Each renderer reuses `shadeColor()`'s lighten/darken approach (or an equivalent local helper) rather than re-deriving color math from scratch — copy, don't share a runtime import, since these are meant to be fully standalone bundles with zero cross-package runtime dependency (same rule M29 already established for the minigame packages).
- [ ] Manifests: `apps/web/public/assets/skins/diorama_glow/skin.manifest.json`, `flat_vector/skin.manifest.json`, `neon_city/skin.manifest.json` — full `SkinPalette` (all 9 world-tile fields, tuned to each direction's own mood, not reused from an existing skin) + `SkinUIKit` (fonts/radii/shadows/gradients matching each direction — e.g. Neon City gets a real `shadowGlow`, Flat Vector gets sharp small radii) + `audioProfile` (new `sfxType`/`bgmType` label strings per skin, consumed by `SoundSynth.ts` the same way existing skins' labels already are — confirm `SoundSynth.ts`'s profile switch has (or gets) a sane default for an unrecognized label rather than throwing) + the new `rendererUrl: "/plugins/skins/<id>/index.js"`.

## Section 6 — Go catalog

`apps/api/internal/theme/handler.go`:
- [ ] Add 3 entries to `builtInThemes`, same shape as the existing 5 (`ID`/`Version`/`Name`/`Author`/`Category`/`Entrypoint` pointing at the new `skin.manifest.json` paths above — `Entrypoint` stays pointed at the manifest, exactly like every existing theme; the manifest itself is what carries the new `rendererUrl` field, so no Go struct change is needed).

`apps/web/src/skins/ThemePluginManager.ts`:
- [ ] Add the 3 new ids to `BUILT_IN_IDS`, and add matching entries to `getThemeCatalog()`'s offline fallback array — mirrors exactly how the existing 5 built-ins are listed there today (`ThemePluginManager.ts:15,34-39`).

## Section 7 — `SettingsModal` skin picker

`apps/web/src/ui/SettingsModal.ts`:
- [ ] Remove the hardcoded "Cozy Vector — Coming in a future update" locked placeholder card (`SettingsModal.ts:126-135`) — it was an M5 stretch goal that was never built; the 3 real hi-fi skins replace it.
- [ ] Add preview-swatch entries for `diorama_glow`/`flat_vector`/`neon_city` to whatever `KNOWN_PREVIEWS` lookup currently drives each skin card's accent/bg/description (confirm exact structure by reading the top of `SettingsModal.ts` before editing — not fully audited in this planning pass).

## Architecture notes / non-goals

See [EPIC-30](../stories/EPIC-30-hifi-skin-plugin-architecture.md)'s Non-Goals — no external art, no WebGL/Light2D pipeline, no sandboxing for future community renderer code (flagged as a real open risk, not solved here), no simulation/hitbox/animation-timing changes, no changes to the 5 existing skins' behavior.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green; new tests for `SkinRendererLoader` (success + "module has no createRenderer" failure case, mirroring `MinigameLoader.test.ts`'s existing coverage style) and for `WorldScene`'s renderer-resolution fallback-on-failure path.
3. `cd apps/web && npx oxlint src/` — clean.
4. `npm run build:skins` (from repo root) — all 3 `apps/web/public/plugins/skins/<id>/index.js` bundles produced, each self-contained (no runtime import of any other workspace package).
5. `cd apps/api && go build ./... && go vet ./... && go test -race -short ./...` — clean.
6. Live via `make dev-d`: switch to each of the 3 new skins in Settings and confirm the world tileset, hero, and NPCs visibly redraw with genuinely different shapes/shading (not just different hex tints) — screenshot each for a manual before/after comparison against the existing `retro_gb`/`solarpunk` look. Stop the `api` container and confirm all 8 skins (5 existing + 3 new) still list and still switch correctly via the offline fallback catalogs.
7. Confirm switching *away* from a hi-fi skin back to a palette-only one (e.g. `neon_city` → `solarpunk`) correctly restores `DEFAULT_RENDERER`'s output — no leftover hi-fi-renderer texture state bleeding into a plain skin.
