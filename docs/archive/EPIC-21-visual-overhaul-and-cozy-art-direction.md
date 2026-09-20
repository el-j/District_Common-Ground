# EPIC-21 — Visual Overhaul & Cozy Art Direction

**Agent roles:** technical-artist, level-designer, engineering-frontend-developer, ui-designer, whimsy-injector
**Planning doc:** `docs/kickstart/Visual Overhaul & Skin Design Specification.md`

## Vision

The game is currently playable but visually cold: the camera sits too far back for the world to read as a lived-in place, interiors are flat near-black boxes, the palette is desaturated navy/grey rather than a warm or expressive tone, and there is no ambient "juice" (light, shadow, bounce, floating prompts) to sell the world as alive. This epic makes the game **joyful and legible** without touching the Headless Simulation boundary — every visual change resolves through `EntityToken`s and skin manifests, exactly like the existing solidarity/crisis/weather visual systems already do.

Confirmed by direct code inspection (not just the spec's own claims — see [[project-district-common-ground]]'s "verify docs against code" pattern):

- `WorldScene.ts` already sets `cameras.main.setZoom(2)` with a `startFollow(sprite, true, 0.1, 0.1)` lerp — the lerp value the spec recommends is already in place. The actual "Ant Farm" bug is that Phaser's scale mode is `RESIZE` (`main.ts`), so the camera's effective field of view in *tiles* scales with the player's window/monitor size — a wide desktop monitor shows ~60×34 tiles at zoom 2 (16px tiles), nowhere near the spec's 12×10 target, while a phone is closer but still not fixed. Two dead constants (`VIRTUAL_WIDTH = 320`, `VIRTUAL_HEIGHT = 240`, exported from `main.ts` but never consumed by the Phaser `GameConfig`) suggest a fixed-viewport approach was intended once but never wired in.
- `createTilesetTexture()` in `WorldScene.ts` hand-draws all 7 tile types (`FLOOR #18182a`, `WALL #1e1e30`/`#3c3a5a`, `GRASS #1a2c18`, `ROAD #2c2c3a`, `PLAZA #20202e`, `DOOR` wood, `BUILT` teal) directly as near-black/navy hex literals — confirming both the "muddy palette" and "black-hole interiors" diagnoses are real, not exaggerated. There is no furniture/prop tile type at all.
- The skin/theme pipeline (`ThemeManager.ts`, `SkinInterface.ts`) is more mature than the spec assumes: `switchSkin()`/`applyPalette()`/CSS-custom-property + Phaser-texture-swap machinery already works end-to-end for three skins (`solarpunk`, `retro_gb`, `labor_woodcut`). But `SkinPalette` only carries 7 **UI/HUD**-level fields (`background`, `surface`, `accent`, `text`, `hudBg`, `hudBorder`, `hudText`) — none reach the world-tile canvas draw calls above, which are hardcoded and skin-independent today. This is the real integration point for the spec's Skin A/B palettes, not a parallel system.
- The 4-tier resilience visual system (`resilienceTier()` → `world--thriving`/`world--stabilising`/`world--crisis`/`world--emergency` CSS filter classes) already exists and already implements the *mood/lighting* half of the spec's §5.2 table. It does **not** implement the *asset* half (boarded shops, flower planters, market stalls, cracked asphalt) — there is no prop-swap mechanism of any kind yet.
- `DialogueOverlay.ts` is a plain title/text/choice-buttons panel with no avatar/portrait pane. `RadioWidget.ts` is a plain frequency-tuner with no waveform/animation. NPCs and construction nodes have proximity prompts but no bouncing icon-bubble treatment. All three are genuine gaps, not stale docs.

## Four Pillars (from the spec)

1. **Camera & Viewport** — replace the fixed `setZoom(2)` + `RESIZE` combo with a viewport-independent zoom that always frames a fixed tile count, so the player reads as a person-sized character on every screen.
2. **Palette & Skins** — thread real world-tile colors through the existing skin manifest pipeline instead of hardcoded canvas hex literals; ship the spec's Skin A ("Warm Solarpunk") and Skin B ("Game Boy Pocket Classic") values into the existing `solarpunk`/`retro_gb` skins.
3. **Tilemap & Level Design** — add a furniture/prop layer for named interiors, and extend the existing resilience-tier system with tier-conditional world dressing (not just a color filter).
4. **UI/UX Juice & Accessibility** — floating interaction prompts, a portrait-driven dialogue box, an animated radio widget, ambient light/shadow layer, and readable touch-sized UI.

## Acceptance Criteria

- **Test 21.1:** On both a 1280×800 desktop viewport and a 390×844 mobile viewport, the camera shows the same fixed tile count (12×10) — verified by a unit test on the pure zoom-calculation function, not a full Phaser render.
- **Test 21.2:** Switching to `retro_gb` recolors world tiles (floor/wall/ground) to the Game Boy 4-shade palette without a page reload — same mechanism `switchSkin()` already uses for HUD colors.
- **Test 21.3:** Pip's Courier Room, the Community Kitchen, and the Town Assembly each render ≥3 named props, verified by a unit test asserting the prop registry returns ≥3 entries per named interior.
- **Test 21.4:** Resilience tier `crisis` renders at least one "grim" world-dressing prop variant (e.g. boarded window) that tier `thriving` does not, and vice versa for a "flourishing" variant (e.g. flower planter) — verified at the pure-logic tier→propset mapping level, matching how Test 10.3 verifies `weatherTier` without chasing full Phaser rendering.
- **Test 21.5:** `DialogueOverlay` renders an avatar portrait pane whose expression frame changes when the dialogue node's mood field changes.
- **Test 21.6:** Manual — walk near an NPC/construction node/bike portal and confirm a bobbing icon bubble appears within ~150ms and disappears on leaving proximity.
- **Test 21.7:** Manual — Lighthouse/visual pass confirms interior rooms no longer read as flat black boxes and HUD icons remain legible/tappable at mobile width.
