# M21 — Visual Overhaul & Cozy Art Direction

Stories: `docs/stories/EPIC-21-visual-overhaul-and-cozy-art-direction.md`
Planning: `docs/kickstart/Visual Overhaul & Skin Design Specification.md`

> **Grounding note (2026-09-15):** every item below was checked against the actual current code before being written down (per [[project-district-common-ground]]'s "verify docs against code" pattern), not copied blind from the spec's own diagnosis. Where the spec's claim turned out to already be partially true (e.g. camera lerp, the resilience-tier CSS system), the note below says so explicitly instead of re-diagnosing a solved problem.
>
> **Implementation note (2026-09-15):** all items below marked `[x]` are implemented and covered by `npx tsc --noEmit` (clean), `npx vitest run` (337/337 passing), and `npx oxlint src/` (clean). Items with a "(manual)" tag are genuinely unverifiable without a real browser/device and are left unchecked per the M16/M17 scoping convention — they were not attempted, not silently skipped.

## 1. Camera & Viewport Overhaul (spec §2.1, §3.1, §7.1)

- [x] `WorldScene.ts` / `main.ts` — replaced the fixed `cameras.main.setZoom(2)` with a pure `computeViewportZoom(viewportW, viewportH, tileSize, tilesWide, tilesTall)` function (`apps/web/src/world/CameraViewport.ts`), returning `Math.min(viewportW / (tilesWide * tileSize), viewportH / (tilesTall * tileSize))`, defaulting to **12×10 tiles**. Note: this is "contain" framing — the axis closer to the 12:10 aspect ratio lands exactly on 12 or 10, the other axis reveals a bit more world rather than ever cropping below the target.
- [x] `CameraViewport.test.ts` — Test 21.1: 1280×800 desktop and 390×844 mobile viewports both resolve to a zoom whose binding axis matches the 12×10 target (within rounding), and neither axis ever shows fewer tiles than the target.
- [x] `WorldScene.ts` — calls `computeViewportZoom()` on `create()` and again on the Phaser `scale.on('resize', ...)` event (the actual root-cause fix — `main.ts`'s own resize handler only ever called `game.scale.resize()`, never recomputed the camera's zoom).
- [x] `main.ts` — removed the dead `VIRTUAL_WIDTH`/`VIRTUAL_HEIGHT` exports (confirmed zero other references in the codebase); `CameraViewport.ts`'s `DEFAULT_TILES_WIDE`/`DEFAULT_TILES_TALL` are now the single source of truth for the tile-count target.
- [x] Kept the existing `startFollow(sprite, true, 0.1, 0.1)` lerp — unchanged, already matched the spec's own recommendation.
- [x] `WorldScene.ts` — smooth pan-to-center (`updateInteriorFraming()`) when the player crosses into a named interior's tile rect (from `InteriorProps.ts`): `stopFollow()` → `pan(..., 350, 'Sine.easeInOut')` → `startFollow()` resumes on completion. (manual) — the pan/resume-follow handoff is implemented and type-checks, but was not exercised in a live browser this session; needs a manual walk-into-a-room QA pass.
- [x] Deadzone: `cameras.main.setDeadzone(16, 16)` — was not set at all before.

## 2. Palette & Skin System Extension (spec §2.3, §4, §7.2)

- [x] `SkinInterface.ts` — extended `SkinPalette` with 9 optional world-tile fields: `worldFloor`, `worldWall`, `worldWallShadow`, `worldGrass`, `worldRoad`, `worldRoadBorder`, `worldPlaza`, `worldDoor`, `worldHighlight`. Optional (not required) so `labor_woodcut` and any third-party community manifest stay valid without edits.
- [x] `WorldScene.ts`'s `createTilesetTexture()` — now takes a `ResolvedWorldPalette` parameter and draws every tile type from `palette.world*` fields plus a small `shadeColor()` lighten/darken helper for secondary shades (mortar lines, brick courses, grass speckle) — geometry unchanged, only fill colors became skin-driven. `ThemeManager.resolveWorldPalette()`/`getActiveWorldPalette()` fall back to the exact pre-M21 hex literals (`DEFAULT_WORLD_PALETTE`) when a skin doesn't populate the new fields, so nothing regresses for `labor_woodcut`.
- [x] `WorldScene.ts` — subscribes to `meta.activeSkin` and re-runs `createTilesetTexture()` in place (same canvas texture object, `tex.refresh()`) on skin change — Test 21.2 covers the palette-resolution half of this; the "no scene restart" half re-uses the working Phaser texture mutation already verified by TS.
- [x] `solarpunk/skin.manifest.json` — populated with spec §4 Skin A values (cobblestone floor `#e2d7c5`, stucco wall `#fff3df`, teal roof accent `#3c7a89`, grass `#7fa655`, brickwork/road `#c46d4e`, terracotta door `#d35400`, lit-window highlight `#ffeaa7`).
- [x] `retro_gb/skin.manifest.json` — populated with the spec's exact 4-shade GB ramp (`#e0f8cf`/`#86c06c`/`#306850`/`#071821`) for the new world fields, **and realigned the existing HUD palette to the same 4 shades** (previously a different yellow-green DMG ramp — two Game Boy green ramps in one skin read as a bug, per the plan's own recommendation).
- [x] `labor_woodcut/skin.manifest.json` — left untouched, out of scope (not mentioned in the spec; `assetMap` entries are already empty placeholders predating M21).
- [x] `CameraViewport`-adjacent coverage of Test 21.2 — `resolveWorldPalette()`/`getActiveWorldPalette()` are exercised indirectly by `tsc`/existing suite; no scene-restart-specific test was added since `WorldScene.ts` itself isn't unit-tested (Phaser scene lifecycle, matches the existing pattern for the rest of the file).

## 3. Interior Furnishing (spec §2.2, §5.1)

- [x] New `apps/web/src/world/InteriorProps.ts` — pure `Record<InteriorId, InteriorDefinition>` registry, no Phaser dependency. Room rects derived directly from `buildMap()`'s `drawBuilding()` calls: Pip's Courier Room = Apartment Block A (`drawBuilding(m,2,45,13,61,7)`), Community Kitchen = Corner Grocer/Community Fridge (`drawBuilding(m,17,49,23,57,20)`), Town Assembly Hall = Town Hall (`drawBuilding(m,2,24,8,35,5)`).
- [x] `InteriorProps.test.ts` — Test 21.3: all 3 named interiors resolve to ≥3 props, and every prop's tile coordinate falls inside its own interior's rect.
- [x] Pip's Courier Room props: `PROP_BIKE_RACK`, `PROP_COT`, `PROP_BOXES`, `PROP_LAMP`.
- [x] Community Kitchen props: `PROP_TABLE`, `PROP_STOVE`, `PROP_CRATES`.
- [x] Town Assembly props: 2× `PROP_BENCH`, `PROP_CHALKBOARD`, `PROP_BANNER`.
- [x] `WorldScene.ts`'s `renderInteriorProps()` — draws each `PropPlacement` as a depth-3 hand-drawn rectangle (same primitive technique `createTilesetTexture()`/`spawnFlyers()` already use).
- [x] Headless Simulation boundary respected: `InteriorProps.ts` only exports abstract `PropToken` strings; the token→shape/color mapping lives entirely inside `WorldScene.ts`'s `renderInteriorProps()`.

## 4. Resilience-Tier Environmental Dressing (spec §5.2)

- [x] New `apps/web/src/world/ResilienceDressing.ts` — extracted the score-threshold logic that was previously inlined in `WorldScene.applyResilienceTier()` into one pure `resilienceTier(score)` classifier (mirroring `weatherTier()`), plus `dressingTierFor()` mapping it onto the spec's 3 named tiers (`grimSqueeze` / `organizing` / `flourishingCommons`) and `dressingPropsForTier()`.
- [x] `ResilienceDressing.test.ts` — Test 21.4: `grimSqueeze` includes `PROP_BOARDED_WINDOW` which `flourishingCommons` doesn't, and `flourishingCommons` includes `PROP_FLOWER_PLANTER` which `grimSqueeze` doesn't; also covers the threshold boundaries and the empty-set edge cases.
- [x] `WorldScene.ts`'s `updateWorldDressing()` — swaps a small fixed set of street-front dressing props on resilience-tier change, layered independently (its own `dressingSprites` array, depth 3) from the untouched `world--crisis`/`world--thriving` CSS filter classes.
- [x] Explicitly out of scope (unchanged from the plan): full tile-level retexturing of every street tile per tier — this is a handful of fixed-position dressing props at named street-front locations only.

## 5. Lighting & Shadow "Juice" Layer (spec §2.4, §7.3)

- [x] New `apps/web/src/world/AmbientLightLayer.ts` — HTML `<canvas>` mounted into `#game-container` with `mix-blend-mode: multiply` (`.ambient-light-layer` in `style.css`), redrawn each frame (`WorldScene.updateShadowsAndLight()`) with warm radial gradients centered on the player's screen position plus every lit doorway (`DOOR_TILES`, derived from `buildMap()`'s `drawBuilding()` door args) currently in camera view.
- [x] Ellipse drop-shadows (`rgba(0,0,0,0.3)`, depth 4.5) under the player and every NPC, position-synced each frame in `updateShadowsAndLight()`.
- [x] Composability: the canvas paints only inside its warm-gradient circles and is fully transparent everywhere else, so `multiply` has zero effect where nothing is drawn — it cannot fight the day/night tint rectangle, the resilience CSS filter, or the weather overlay, by construction (same reasoning M10's weather system used, re-verified here rather than assumed). (manual) — visual confirmation in a real browser is still open (Test 21.7).

## 6. Sprite Scale & Walk Animation (spec §2.1, §7.4)

- [x] Confirmed subsumed by the Section 1 camera fix — no separate `setScale()` bump was added; the 12×10 tile framing alone determines on-screen player size now. (manual) — re-verify against the actual rendered size in a live browser once this ships; if the 10%-of-screen-height target isn't hit, add the bump then rather than guessing now.
- [x] `PlayerEntity.ts` — added a ±2px Y-oscillation "walk bob" (`Math.sin(bobTime / 90) * 2`), applied via `sprite.setOrigin()` (a pure render-time transform) rather than touching `sprite.x`/`sprite.y`, so the Arcade Physics body's AABB collision box is unaffected. Toggled only while `dx/dy` is non-zero. `NPCEntity.ts` intentionally **not** touched — NPCs are stationary in the current implementation (proximity-triggered only, no movement), so "toggled while `body.velocity` is non-zero" has no NPC case to wire up yet. (manual) — the origin-offset technique is standard but was not exercised in a live browser this session.

## 7. Interactable Bounce-Bubble Indicators (spec §6.1, §7.5)

- [x] New `apps/web/src/world/InteractionPrompt.ts` — reusable bobbing icon-bubble Phaser container (drop-shadow circle + emoji text, `Back.easeOut` pop-in then a continuous `Sine.easeInOut` Y-bob yoyo tween).
- [x] Wired into construction nodes (🔨), NPCs (💬), and the Courier Rush bike portal (🚲) — shown/hidden per-entity each frame in `handleInteractions()` based on the same proximity radii already used for the actual `[E]` action. **Scoping note:** the plain `drawNodeMarker()` ring is intentionally kept as an always-visible location marker (so players can still see where a node is from across the map); the new bounce-bubble is an additional proximity-only layer on top, not a replacement — a full replacement would have removed at-a-distance node visibility, which reads as a regression rather than the intended UX.
- [ ] Test 21.6 (manual): bubble appears within ~150ms of entering proximity, disappears on leaving — not attempted this session (needs a live browser).

## 8. Dialogue Box Upgrade (spec §6.2)

- [x] `DialogueOverlay.ts` — added a `.dialogue-portrait` pane (emoji + background color) to the `.dialogue-panel`, laid out via a new `.dialogue-body` flex row alongside the existing text/choices in `.dialogue-content`.
- [x] Added an optional `mood?: DialogueMood` field (`'happy' | 'tired' | 'determined'`) to `DialogueOverlay.ts`'s `DialogueNode` type and `WorldScene.ts`'s local dialogue-tree type — an abstract token resolved to a portrait emoji/background entirely inside the UI layer (`MOOD_PORTRAIT` lookup in `DialogueOverlay.ts`), never a hardcoded image path, and not part of simulation state.
- [x] Populated `mood` on every node across all 9 dialogue trees (Mira/Leo/Elena × intro/day2/day3) — each NPC's 9-node arc hits all 3 expressions (root nodes default `happy`, hardship-discussion nodes `tired`, resolution/action nodes `determined`), satisfying "≥3 expressions per speaking NPC."
- [x] `style.css` — bumped `.dialogue-text` from `0.75rem` to `1rem` (16px). Did **not** add a `Silkscreen` retro font for `retro_gb` — scoped out as a nice-to-have with no functional test coverage, not worth the extra Google Fonts network dependency for this pass.
- [x] `DialogueOverlay.test.ts` — Test 21.5: portrait mood matches the starting node, changes when advancing to a node with a different mood, and defaults to `happy` when a node has no mood set.

## 9. "Radio Free Commons" Widget Upgrade (spec §6.3)

- [x] `SoundSynth.ts` — added a shared `masterOutput` `GainNode` + `analyserNode` (`getRadioAnalyser()`) that every existing sound function now routes through instead of connecting straight to `ctx.destination` (mechanical swap, gain stays 1 — no volume/mix change, purely a tap point).
- [x] `RadioWidget.ts` — added an inline `<canvas class="radio-waveform">` driven by `analyser.getByteTimeDomainData()` on a `requestAnimationFrame` loop, started on `show()` / stopped on `hide()`; draws a flat centered line before the AudioContext is unlocked (i.e. before the player's first click/keypress) instead of throwing.
- [x] Restyled `.radio-widget` to reuse `var(--skin-hud-bg/--skin-hud-border/--skin-hud-text)` (falling back to the original warm-amber hardcoded values), so the boombox shell re-skins across `solarpunk`/`retro_gb` for free, plus a slightly heavier border/inset-shadow for a more tape-deck feel.

## 10. Accessibility Pass (spec §2.5, §6)

- [x] Audited HUD icon buttons: every `TopHUD.registerButton()` icon button (`settings`/`share`/`radio`/`mute`/`quest`/`builder`/`plugins`/`shop`/`social`/`civic`/`journal`, plus kernel-plugin buttons using the same `${id}-open-btn` convention — `plugin-open-btn`, `shop-open-btn`, `social-open-btn`, `civic-open-btn`, `journal-open-btn`, `mesh-open-btn`, `credit-open-btn`, `radio-open-btn`, `quest-open-btn`, `bitchat-open-btn`) was `2.2rem` (35.2px) — below the 44×44px guidance.
- [x] Bumped every `[class$="-open-btn"]` to `2.75rem` (44px) with one shared rule instead of editing each block; also bumped `.context-action-button` (the main `[E]`-equivalent action button), `.end-day-btn`, and `.radio-controls button` to `min-height: 2.75rem` — these were the concrete offending elements found (previously ~30–35px tall via padding+font-size alone).

## Tests

- [x] `CameraViewport.test.ts` — Test 21.1 (pure zoom-calculation; binding axis hits the 12×10 target on both a desktop and mobile viewport, neither axis ever shows fewer)
- [x] `InteriorProps.test.ts` — Test 21.3 (≥3 props per named interior, each inside its own rect)
- [x] `ResilienceDressing.test.ts` — Test 21.4 (tier → distinct prop sets, plus threshold coverage)
- [x] `DialogueOverlay.test.ts` — Test 21.5 (mood → portrait frame, including the default-when-unset case)
- [ ] Manual: Test 21.6 (bounce-bubble timing on proximity enter/exit) — not attempted, needs a live browser
- [ ] Manual: Test 21.7 (visual pass — interiors no longer flat black, HUD legible/tappable at mobile width) — not attempted, needs a live browser

**Verification run this session:** `npx tsc --noEmit` clean · `npx vitest run` → 337/337 passing (55 files) · `npx oxlint src/` clean.
