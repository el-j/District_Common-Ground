# M41 — Building-Interior Plugin Architecture

Story: [`docs/stories/EPIC-34-buildings-as-plugins-and-interiors.md`](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 2.

Status: **Implemented 2026-09-19.**

## Section 1 — Resolve interior isolation at the generalized scope (supersedes M33 §1)

- [x] **Decision: real isolation via a dedicated second `Phaser.Scene`** (`apps/web/src/world/InteriorScene.ts`), registered alongside `WorldScene` in `main.ts`'s scene array. Entry: `WorldScene.enterInterior()` calls `this.scene.sleep()` (genuinely pauses WorldScene's update/render — not a camera pan) then `this.scene.launch('InteriorScene', {interiorId, returnX, returnY, returnFacing})`. Exit: `InteriorScene.exitInterior()` calls `this.scene.wake('WorldScene', data)` (fires a `WAKE` event `WorldScene` listens for, restoring the player at the exact stored tile) then `this.scene.stop()` on itself. `InteriorScene` reuses the *exact same* `INTERIORS`/`PropPlacement`/`rect` coordinates M21 already established — no coordinate remapping, it just draws that rect region in isolation (its own floor/wall graphics, its own camera bounded tightly to the room, its own physics-world bounds) instead of overlaying it onto the shared exterior tilemap. Texture keys (`'player'`) and animation keys (`walk_down` etc.) are reused as-is — Phaser's `TextureManager`/`AnimationManager` are game-level, not scene-level, confirmed by direct read of `WorldScene.create()`'s `anims.create()` calls, so no re-registration was needed.

## Section 2 — `BuildingInterior` plugin contract and loader

- [x] `packages/shared-types/src/building.ts` — `BuildingInteriorManifest { id, label, entrypointUrl? }` (pure data, no Phaser). **Deviation from this doc's original wording, recorded not silent:** the Phaser-coupled `BuildingInteriorModule`/`BuildingInteriorHostAPI` contract lives in `apps/web/src/world/BuildingInteriorInterface.ts` instead of `packages/shared-types`, mirroring where `SkinRenderer`/`SkinRendererModule` actually live (`SkinRendererInterface.ts`, in `apps/web/src/skins/`) rather than the doc's original plan — the plain-data `MinigameManifest` precedent doesn't apply here since `createScene()` genuinely needs the `Phaser.Scene` type, and keeping shared-types Phaser-free (true of every other type in it) was worth the small deviation. `BuildingInteriorLoader.ts` mirrors `MinigameLoader`/`SkinRendererLoader`'s register/load-remote/get shape exactly. **No real `packages/building-*` package exists yet** — every interior shipped this milestone goes through `InteriorScene.ts`'s data-only path instead, matching M29's own precedent (the loader built ahead of real remote content) and EPIC-34's explicit non-goal that not every building needs to become a full package.
- [x] Enter/exit wiring: `InteriorProps.ts`'s 3 `InteriorDefinition`s each gained a `doorTile`/`exteriorReturnTile` pair (verified programmatically against `MapData.ts`'s real `DOOR_TILES`/`buildMap()`, same throwaway-script discipline as M38-M40 — all 3 door tiles confirmed real `T.DOOR` tiles, all 3 return tiles confirmed walkable). `WorldScene.ts` shows a door prompt (♻️-pattern `InteractionPrompt`, 24px radius) at each `doorTile` and calls `enterInterior()` on interact; `InteriorScene.ts` shows its own "Exit 🚪" prompt near the room's south wall.

## Section 3 — Prop redraw/destroy capability

- [x] `InteriorScene.propSprites: Phaser.GameObjects.Rectangle[]` (the `dressingSprites`-array pattern) + a public `redrawProps(propsOverride?)` method that destroys every stored sprite and re-renders — from the static `INTERIORS` definition by default, or from a caller-supplied `PropPlacement[]` (the hook M42's shop stock and M43's furniture editor will pass their own mutable prop lists through), built once here rather than each needing its own workaround.

## Architecture notes / non-goals

See [EPIC-34](../stories/EPIC-34-buildings-as-plugins-and-interiors.md)'s epic-wide non-goals. No new room-navigation/AI pathing system — interiors bound movement via `physics.world.setBounds()`/`setCollideWorldBounds()` on the room rect, not a new pathing system. No content for the workshop/retail/housing buildings themselves yet — that's M42/M43, built on this milestone's framework. The old rect-based `findInteriorAtTile()`/`updateInteriorFraming()` camera-pan mechanism (M21 §1) was removed entirely, not left dangling alongside the new door-based one — replaced by `findInteriorByDoorTile()` and `WorldScene.enterInterior()`/`onWakeFromInterior()`. `InteriorScene.ts` has no dedicated unit test file, matching `WorldScene.ts`'s own established precedent (zero direct unit tests for either Phaser-scene class in this codebase — both are verified via `tsc`/build/live-serve checks and manual QA, while their extracted pure data modules, `InteriorProps.ts`/`MapData.ts`, carry the real test coverage).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean (apps/web, which transitively typechecks `packages/shared-types`).
2. `cd apps/web && npx vitest run` — 500/500 passing (7 new: `BuildingInteriorLoader.test.ts`'s 5 loader tests mirroring `MinigameLoader.test.ts`/`SkinRendererLoader.test.ts`, plus `InteriorProps.test.ts`'s updated door-tile/return-tile tests replacing the removed rect-entry ones).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (150 modules, PWA precache regenerated).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 6 changed/new source files return HTTP 200. **The actual interactive door-entry → isolated-room → exit round-trip stays manual** — no headless browser available in this environment to drive real Phaser scene-lifecycle events (`scene.sleep()`/`launch()`/`wake()`/`stop()`), the same limitation noted for every prior visual/interaction milestone, now specifically flagged for this one since it's the first milestone to touch multi-scene lifecycle rather than single-scene rendering.
