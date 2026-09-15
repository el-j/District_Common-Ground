# M21 — Visual Overhaul & Cozy Art Direction

Stories: `docs/stories/EPIC-21-visual-overhaul-and-cozy-art-direction.md`
Planning: `docs/kickstart/Visual Overhaul & Skin Design Specification.md`

> **Grounding note (2026-09-15):** every item below was checked against the actual current code before being written down (per [[project-district-common-ground]]'s "verify docs against code" pattern), not copied blind from the spec's own diagnosis. Where the spec's claim turned out to already be partially true (e.g. camera lerp, the resilience-tier CSS system), the note below says so explicitly instead of re-diagnosing a solved problem.

## 1. Camera & Viewport Overhaul (spec §2.1, §3.1, §7.1)

- [ ] `WorldScene.ts` / `main.ts` — replace the fixed `cameras.main.setZoom(2)` with a pure `computeViewportZoom(viewportW, viewportH, tileSize, tilesWide, tilesTall)` function (new `apps/web/src/world/CameraViewport.ts`), returning `Math.min(viewportW / (tilesWide * tileSize), viewportH / (tilesTall * tileSize))`, defaulting to **12×10 tiles** per spec §7.1
- [ ] `CameraViewport.ts` — unit test: 1280×800 desktop and 390×844 mobile viewports both resolve to a zoom that keeps the 12×10 tile count on screen (within rounding) — this is Test 21.1, and it's testable as pure logic without a real Phaser canvas
- [ ] `WorldScene.ts` — call `computeViewportZoom()` on `create()` and again on every resize (currently `main.ts`'s `window.addEventListener('resize', ...)` only calls `game.scale.resize()`, it never recomputes the WorldScene camera's zoom — this is the actual root cause of the "Ant Farm" bug on wide monitors, not the zoom API itself)
- [ ] `main.ts` — remove or repurpose the dead `VIRTUAL_WIDTH`/`VIRTUAL_HEIGHT` exports (currently unused — `GameConfig.width/height` uses the raw `viewport` object, not these constants); if kept, wire them in as the canonical `tilesWide*TS`/`tilesTall*TS` reference resolution consumed by `CameraViewport.ts`
- [ ] Keep the existing `startFollow(sprite, true, 0.1, 0.1)` lerp — already matches the spec's own recommendation, no change needed here
- [ ] `WorldScene.ts` — smooth pan-to-center when the player crosses into an interior room boundary (new behavior — currently the camera only ever follows the player continuously, there is no room-entry framing event)
- [ ] Deadzone: configure `cameras.main.setDeadzone()` so small jitter doesn't re-trigger the lerp constantly (spec's "smooth Lerp follower w/ deadzones" — not currently set at all)

## 2. Palette & Skin System Extension (spec §2.3, §4, §7.2)

- [ ] `SkinInterface.ts` — extend `SkinPalette` with world-tile-level fields: `worldFloor`, `worldWall`, `worldWallShadow`, `worldGrass`, `worldRoad`, `worldRoadBorder`, `worldPlaza`, `worldDoor`, `worldHighlight` (additive change — existing 7 HUD fields stay, this doesn't break `applyPalette()`)
- [ ] `WorldScene.ts`'s `createTilesetTexture()` — stop hardcoding hex literals (`#18182a`, `#1e1e30`, `#1a2c18`, `#2c2c3a`, `#20202e`, etc.); take the active skin's `SkinPalette` as a parameter and draw each tile type from `palette.world*` fields instead. This is the actual fix for "muddy black-hole interiors" — the geometry (plank lines, brick courses, grass speckle) stays, only the fill colors become skin-driven
- [ ] `WorldScene.ts` — re-run `createTilesetTexture()` (or swap the cached canvas texture) when `switchSkin()` fires, mirroring how `assetMap` texture swaps already reload on skin change
- [ ] `solarpunk/skin.manifest.json` — populate `worldFloor`/`worldWall`/etc. with spec §4 Skin A values: ground `#e2d7c5` (cobblestone) / `#7fa655` (grass) / `#c46d4e` (brickwork/road); buildings `#fff3df` (stucco) / `#3c7a89` & `#d35400` (roofs) / `#ffeaa7` (lit windows)
- [ ] `retro_gb/skin.manifest.json` — populate world fields with spec §4 Skin B's exact 4-shade GB palette: `#e0f8cf` (highlight) / `#86c06c` (surface) / `#306850` (shadow) / `#071821` (outline/ink) — note the *existing* `retro_gb` HUD palette (`#0f380f`/`#306230`/`#8bac0f`/`#9bbc0f`) is a different, older GB-green ramp; decide whether to also realign the HUD fields to the spec's 4 shades for visual consistency within the skin, or leave HUD as-is and only add the new world fields — **recommendation: realign both**, since a skin with two different Game Boy green ramps reads as a bug, not a feature
- [ ] `labor_woodcut/skin.manifest.json` — explicitly out of scope for this spec (not mentioned anywhere in the design doc, and its `assetMap` entries are already all empty placeholders); leave untouched, note in the skin's own manifest comment/README if one exists that it predates M21 and isn't part of this palette pass
- [ ] `ThemeManager.test.ts` (or new `CameraViewport`-adjacent test) — Test 21.2: switching to `retro_gb` changes the resolved tileset palette without requiring a scene restart

## 3. Interior Furnishing (spec §2.2, §5.1)

- [ ] New `apps/web/src/world/InteriorProps.ts` — a pure registry `Record<InteriorId, PropPlacement[]>` (no Phaser dependency, unit-testable) naming each interior's required props. Requires first reading `buildMap()`'s existing `fillRect(... T.FLOOR ...)` calls (`WorldScene.ts` lines ~52–111) to map named rooms (Pip's Courier Room, Community Kitchen, Town Assembly Hall) onto their actual tile-coordinate rects — not yet enumerated, do this as the first implementation step
- [ ] `InteriorProps.ts` unit test — Test 21.3: each of the 3 named interiors resolves to ≥3 prop entries
- [ ] Pip's Courier Room props: bike rack, sleeping cot + blanket, cardboard boxes, glowing desk lamp
- [ ] Community Kitchen props: long wooden table + soup bowls, bubbling stove pot, crates of carrots/apples
- [ ] Town Assembly props: wooden benches, chalkboard with voting tallies, community banner
- [ ] `WorldScene.ts` — render each `PropPlacement` as a depth-3 canvas-drawn Phaser shape (same hand-drawn-primitive technique `createTilesetTexture()`/`spawnFlyers()` already use — no new asset pipeline needed) positioned at its interior's tile rect
- [ ] Props respect the Headless Simulation boundary: `InteriorProps.ts` emits abstract prop tokens (e.g. `PROP_COT`, `PROP_LAMP`) resolved to draw routines in `WorldScene.ts`, not hardcoded sprite filenames baked into simulation state

## 4. Resilience-Tier Environmental Dressing (spec §5.2)

- [ ] New `apps/web/src/world/ResilienceDressing.ts` — pure function mapping the existing `resilienceTier()` output (`'crisis'|'stabilising'|'thriving'` plus the emergency sub-state) onto the spec's 3 named tiers: `crisis`+emergency → **"Grim Squeeze"**, `stabilising` → **"Organizing"**, `thriving` → **"Flourishing Commons"** — reuses the tier classifier that already exists, doesn't add a second one
- [ ] `ResilienceDressing.ts` unit test — Test 21.4: "Grim Squeeze" tier includes a boarded-window/cracked-asphalt prop set that "Flourishing Commons" doesn't, and vice versa for flower-planter/market-stall props
- [ ] `WorldScene.ts` — on resilience-tier change, swap a small set of world-dressing props (boarded shopfronts / market stalls / flower planters) at fixed street-front coordinates, layered independently from the existing `world--crisis`/`world--thriving` CSS filter classes (which stay exactly as-is — they already handle the lighting/mood half correctly; this task only adds the missing asset half)
- [ ] Explicitly out of scope for this milestone: full tile-level retexturing of every street tile per tier (spec's "cracked asphalt" ground texture swap) — scoped down to a handful of fixed-position dressing props at named street-front locations, matching the M16/M17 "real logic, documented scope-down" convention rather than a full tilemap-wide per-tier retexture pass

## 5. Lighting & Shadow "Juice" Layer (spec §2.4, §7.3)

- [ ] New `apps/web/src/world/AmbientLightLayer.ts` — an HTML canvas 2D layer positioned above the Phaser `<canvas>` with `mix-blend-mode: multiply` (or `overlay`), redrawn each frame with a soft warm radial gradient (`rgba(255,220,150,0.4)`) centered on the player's screen position and every lit doorway/window — reuses the exact "separate render layer instead of a second `filter:` rule" pattern already established by M10's frost/rain overlays (CSS filters on the same element don't compose)
- [ ] Ellipse drop-shadow (`rgba(0,0,0,0.3)`) rendered under the player and every NPC — can live as a depth-lower Phaser ellipse per entity rather than needing the canvas overlay, simpler than the light-halo piece
- [ ] Verify the new canvas layer composes with (doesn't visually fight) the existing day/night tint rectangle, the resilience-tier CSS filter, and the weather overlay — same three-independent-layers verification M10's weather system already did

## 6. Sprite Scale & Walk Animation (spec §2.1, §7.4)

- [ ] Confirm this is subsumed by the Section 1 camera fix rather than needing a separate texture upscale: once the camera reliably frames 12×10 tiles, the player already occupies the spec's "~10% of screen height" target without doubling up on a second, independent scale factor — re-verify against the actual rendered size once Section 1 ships, only add a `setScale()` bump if the 12×10 framing alone doesn't hit the 10%-of-screen-height target
- [ ] `PlayerEntity.ts`/`NPCEntity.ts` — add a small ±2px Y-oscillation ("walk bob") tween layered on top of the existing 4-direction walk animations, toggled only while `body.velocity` is non-zero (do not replace the existing `walk_down`/`walk_up`/`walk_left`/`walk_right` animations, which already work correctly)

## 7. Interactable Bounce-Bubble Indicators (spec §6.1, §7.5)

- [ ] New `apps/web/src/world/InteractionPrompt.ts` — a small reusable bobbing-icon-bubble Phaser container (drop shadow + emoji/icon text, gentle sine-wave Y bob), replacing the plain `drawNodeMarker()` circle used today for construction nodes and adding the same treatment to NPCs and the bike portal (which currently have no floating indicator at all — NPCs rely on the player just walking into a fixed proximity radius with no visual cue beforehand)
- [ ] Wire into `NPCEntity`, construction node markers, and the Courier Rush bike portal — icon per interaction type (💬 dialogue, 🔨 construction, 🚲 minigame)
- [ ] Test 21.6 (manual): bubble appears within ~150ms of entering proximity, disappears on leaving

## 8. Dialogue Box Upgrade (spec §6.2)

- [ ] `DialogueOverlay.ts` — add an avatar-portrait pane to the existing `.dialogue-panel` (currently title + text + choice-buttons only, no portrait of any kind)
- [ ] Add an expression/mood field to the dialogue data structure NPCs already read from (`dialogueKey` trees) — resolved to a portrait frame via the existing NPC atlas/EntityToken mechanism, not a hardcoded image path, to respect the Headless Simulation boundary
- [ ] At minimum 3 expressions per speaking NPC: Happy / Tired / Determined (per spec)
- [ ] `style.css` — bump dialogue text to 16px with a high-contrast font (`Inter` already likely available via system stack; evaluate adding `Silkscreen` only for the `retro_gb` skin's dialogue treatment, not globally)
- [ ] Test 21.5: unit test that the portrait frame changes when the dialogue node's mood field changes

## 9. "Radio Free Commons" Widget Upgrade (spec §6.3)

- [ ] `RadioWidget.ts` — add a small inline `<canvas>` waveform driven by a Web Audio `AnalyserNode` tapped off the existing `SoundSynth.ts` output graph (the widget currently has no visual audio feedback at all — confirmed by direct inspection, no `waveform`/`analyser`/`canvas` references exist in the file today)
- [ ] Restyle the widget shell toward the spec's retro boombox/tape-deck visual (CSS-only, reusing the skin CSS custom properties already applied to `document.documentElement`, so the boombox re-skins for free across `solarpunk`/`retro_gb`)

## 10. Accessibility Pass (spec §2.5, §6)

- [ ] Audit existing HUD icon/button hit targets against WCAG-adjacent 44×44px minimum touch target guidance on mobile width (390px) — `TopHUD.ts` and modal action buttons
- [ ] Increase any icon/bar element found under that size, matching the spec's "microscopic UI" diagnosis — enumerate concrete offending elements during implementation rather than guessing sizes here

## Tests

- [ ] `CameraViewport.test.ts` — Test 21.1 (pure zoom-calculation, two viewport sizes → same tile count)
- [ ] `InteriorProps.test.ts` — Test 21.3 (≥3 props per named interior)
- [ ] `ResilienceDressing.test.ts` — Test 21.4 (tier → distinct prop sets)
- [ ] `DialogueOverlay.test.ts` — Test 21.5 (mood → portrait frame)
- [ ] Manual: Test 21.6 (bounce-bubble timing on proximity enter/exit)
- [ ] Manual: Test 21.7 (visual pass — interiors no longer flat black, HUD legible/tappable at mobile width)
