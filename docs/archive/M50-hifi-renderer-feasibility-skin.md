# M50 — Hi-Fi Renderer Feasibility Skin

Story: [`docs/stories/EPIC-37-hifi-art-direction-rayman-pivot.md`](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 5.

Status: **Implemented.**

## Section 1 — Investigate the 3 art-sourcing approaches, pick one with evidence

- [x] Investigated all 3 approaches for real feasibility in this development environment (not just in the abstract):
  - **(a) Push the existing procedural-canvas technique further** — directly buildable: the 3 M30 packages already prove the `SkinRenderer` plugin contract end-to-end, so a 4th package following the exact same shape is zero new risk and immediately gradeable against the other 3.
  - **(b) Real illustrated sprite/background assets** — not feasible in this environment. The `skin.manifest.json` `assetMap` schema already supports external `textureUrl` paths structurally (confirmed by re-reading the 3 existing hi-fi manifests, none of which populate real image files behind that field — it's vestigial), but there is no image-generation tool available to this agent, and sourcing real illustrated art from the open web would mean shipping unlicensed/unverified assets. This absence is treated as the actual evidence Section 1 calls for, not a fallback chosen by default.
  - **(c) Hybrid** — inherits (b)'s blocker (still needs at least illustrated backgrounds from somewhere real), so also not feasible right now.
  - **Decision: (a), pushed further than any existing skin.** Recorded both here and in `packages/skin-painterly-depth/src/index.ts`'s own top-of-file doc comment, so the reasoning travels with the code, not just the task doc.

## Section 2 — New flagship skin package scaffold

- [x] `packages/skin-painterly-depth/` created as a `SkinRenderer` plugin, structurally identical to the 3 M30 packages (`package.json`, `tsconfig.json`, `vite.config.ts` lib-mode build, `src/index.ts`), emitting a standalone ESM bundle to `apps/web/public/plugins/skins/painterly_depth/index.js` via `scripts/build-skins.sh` (4th entry added to the `SKINS` array) — loaded at runtime only via `SkinRendererLoader.loadRemoteSkinRenderer()`, never compiled into the main app bundle.
- [x] Scoped to the full tileset/player/NPC texture surface (matching the other 3 hi-fi skins' scope exactly, not a narrower interior-only slice — this keeps it directly comparable card-for-card in the Settings skin picker rather than a partial proof that can't be fairly graded against its siblings) via the same 3-method `SkinRenderer` contract (`createTilesetTexture`, `createPlayerTexture`, `createNPCTextures`).
- [x] Registered at all 4 required integration points: `ThemePluginManager.ts` (`BUILT_IN_IDS` set + offline-fallback catalog array), `SettingsModal.ts` (`KNOWN_PREVIEWS` + `catalog` array), `apps/api/internal/theme/handler.go` (`builtInThemes` Go slice), plus the new `apps/web/public/assets/skins/painterly_depth/skin.manifest.json` (full 19-field palette, `audioProfile`, `uiKit`, `rendererUrl`).

## Section 3 — Evaluate and report

- [x] Techniques pushed genuinely beyond all 3 existing hi-fi skins, each compared directly against what those skins do *not* do:
  - **Painterly color**: `paintedFill()` — a 5-stop gradient fill, vs. the existing skins' 3-stop gradients.
  - **Depth**: `ambientOcclusionCorners()` — real per-tile ambient occlusion, radial darkening at each tile's 4 corners via `globalCompositeOperation = 'multiply'` (none of the 3 existing skins do per-tile AO at all); plus a whole-canvas depth vignette applied once after all tiles are drawn.
  - **Dynamic lighting / confident linework**: 3-tone character shading (shadow/base/highlight, vs. Diorama Glow's 2-tone), arc-drawn (not rectangle-drawn) heads for real curvature, and a genuine rim-light stroke (bright on the lit silhouette edge, dark on the shadow edge).
  - **Real parallax — explicitly NOT done here, flagged as a forward dependency.** The depth vignette stands in for true multi-layer parallax; actual parallax would require `WorldScene.ts` camera/render-layer changes, which are out of this milestone's scope (a texture-generation package) and are recorded here as unfinished work for [M52](M52-flagship-hifi-rollout.md) to pick up, not silently dropped.
  - **What a real production pipeline would need** (feeding directly into M51): actual illustrated source art (concept sketches → cleaned linework → color) rather than procedural generation, a defined palette/style guide per zone (this proof reuses the existing `ResolvedWorldPalette` shape wholesale), and a real parallax-capable rendering path in `WorldScene.ts` — none of which this milestone could build without an image-generation tool or a scoped follow-on milestone.

## Architecture notes / non-goals

See [EPIC-37](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)'s epic-wide non-goals — no engine/perspective change, no forced retirement of existing skins, no vendor/budget commitment in this milestone. Confirmed all upheld: `WorldScene.ts` itself was not modified, all 8 pre-existing skins remain fully intact and registered, and no external vendor/budget decision was made or implied.

## Verification

1. `cd packages/skin-painterly-depth && npm run check` — clean (`tsc --noEmit`).
2. `cd packages/skin-painterly-depth && npm run build` — clean, emitted `../../apps/web/public/plugins/skins/painterly_depth/index.js` (6.91 kB, gzip 2.16 kB).
3. `cd apps/api && go build ./... && go vet ./...` — clean (one pre-existing, unrelated `go.mod` diagnostic about `github.com/google/uuid` needing `go mod tidy`, not introduced by this change).
4. `cd apps/api && go test -race -short ./...` — all packages pass, no regressions.
5. `cd apps/web && npx tsc --noEmit` — clean.
6. `cd apps/web && npx vitest run` — 591/591 passing, no regressions. No new `.test.ts` file was written for the new package specifically — this matches the established zero-test precedent for all 3 existing skin renderer packages (`skin-diorama-glow`/`skin-flat-vector`/`skin-neon-city`), none of which have any test file, confirmed via an explicit `find` check before deciding not to add one.
7. `cd apps/web && npx oxlint src/` — clean (exit 0), same single pre-existing non-blocking `no-control-regex` warning from M48 (unrelated to this milestone).
8. Root `npm run build` (full monorepo build: `build:minigames` → `build:skins` → `apps/web build`) — all clean; PWA precache grew from 30 to 32 entries (the new manifest.json + renderer bundle).
9. **Live, via `make dev-d`** (first Go-backend-touching milestone this session, so verified against the real Docker stack rather than just the frontend dev server):
   - `GET http://localhost:8080/api/v1/themes` → confirmed `painterly_depth` present in the served JSON catalog (`id: "painterly_depth"`, `title: "Painterly Depth"`, `entrypointUrl: "assets/skins/painterly_depth/skin.manifest.json"`), proving the Go handler change is live and correct, not just compiling.
   - `GET http://localhost:9300/plugins/skins/painterly_depth/index.js` → `200`.
   - `GET http://localhost:9300/assets/skins/painterly_depth/skin.manifest.json` → `200`.
   - `GET http://localhost:9300/` → `200`.
   - Stack torn down cleanly afterward via `make down`.
