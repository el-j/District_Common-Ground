# 22 — Hi-Fi Art Pipeline & Direction Bible

Companion to [EPIC-37](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md) / [M51](../tasks/M51-art-pipeline-and-direction-bible.md). Formalizes what [M50](../tasks/M50-hifi-renderer-feasibility-skin.md) proved out (`packages/skin-painterly-depth`) into a repeatable convention and process, written for whoever — human or AI-assisted — builds the next piece of hi-fi content, not just for M51's own author.

## 1. Asset sourcing — where this stands today

M50's Section 1 investigated all 3 approaches the original vision doc named (push procedural further / real illustrated assets / hybrid) and found only the first buildable in this development environment: there is no image-generation tool available to an AI agent working in this codebase, and sourcing real illustrated art from the open web would mean shipping unlicensed, unverified assets into a real product.

**Consequence for this doc: Section 1's original scope ("asset format & atlas conventions, if M50 chose a real-art-asset approach") does not apply yet.** `skin.manifest.json`'s `assetMap` field already exists structurally (every hi-fi skin's manifest populates it, vestigially, with `textureUrl`/`frameRate`/`footprint` entries pointing at files that are never actually loaded — confirmed unchanged since M30) and needs no schema change to support real assets whenever that becomes possible; nothing about the *procedural* path required touching it. When a future milestone gains access to either a real illustration pipeline or an image-generation tool, this section is where that atlas/sprite-sheet format convention gets written — deliberately left as an open slot here rather than speculatively designed against tooling that doesn't exist yet.

## 2. The procedural depth & lighting convention

This is the actual, repeatable convention `skin-painterly-depth` established and every future procedural hi-fi skin package should follow, so M52's rollout applies one consistent language across world tiles, interiors, and characters instead of reinventing it per surface.

### 2.1 Color — 5-stop painted fill

Where the 3 original M30 skins (`diorama-glow`/`flat-vector`/`neon-city`) use a 3-stop linear gradient (shadow → base → highlight) per surface, the hi-fi convention going forward is a **5-stop gradient**: deep ambient shadow → mid shadow → base color → highlight → specular peak. This reads as "painted" rather than "tri-tone banded" at the same resolution, with no new tooling — just one more `addColorStop()` call per fill. Reference implementation: `paintedFill()` in `packages/skin-painterly-depth/src/index.ts`.

### 2.2 Depth — per-tile ambient occlusion + whole-canvas vignette

Two techniques, both mandatory for any future package that wants to be graded as "flagship tier":

- **Per-tile ambient occlusion**: soft radial darkening at each tile's 4 corners, composited with `globalCompositeOperation = 'multiply'` so it darkens without flattening the underlying gradient. This is the primary "objects sit in the world, not on it" cue. Reference: `ambientOcclusionCorners()`.
- **Whole-canvas depth vignette**: applied once, after all tiles are drawn, as a cheap global depth cue.

**Explicitly flagged limitation, not silently accepted**: the vignette is a *stand-in* for true multi-layer parallax, not parallax itself. Real parallax needs separate Phaser render layers with independent camera `scrollFactor` values, which is a `WorldScene.ts` change — out of scope for a texture-generation package, and out of scope for M51 (a docs/convention milestone, per EPIC-37's own "no engine/perspective change beyond fidelity" framing). **This is the concrete forward dependency M52 inherits**: when M52 rolls the pipeline out broadly, it either (a) budgets real `WorldScene.ts` layer work to deliver actual parallax, or (b) explicitly re-confirms the vignette stand-in is good enough for flagship tier and records that as a conscious call, not an oversight. Either way, M52 must not silently inherit this gap without addressing it one way or the other.

### 2.3 Lighting — fixed light source, 3-tone character shading, rim light

- **Light source direction: fixed top-left**, consistent with every gradient/shadow direction already chosen in `skin-painterly-depth`. Future packages should keep this fixed direction rather than each choosing their own, so mixing hi-fi content from different packages in the same scene (a realistic near-term case once M52 rolls out per-surface) doesn't produce visually contradictory shadows.
- **3-tone character shading** (shadow / base / highlight), one tier more than Diorama Glow's 2-tone — the minimum bar for "flagship tier" going forward.
- **Arc-drawn silhouettes, not rectangle-drawn**, wherever the shape in question has a natural curve (heads, in `skin-painterly-depth`'s case) — flat rectangles read as programmatic even with good color; a drawn curve reads as "considered" even with simple color.
- **Rim light**: a bright stroke along the lit edge of a silhouette, a dark stroke along the shadow edge, both keyed off the same fixed top-left light source as the gradients. This is what separates a character from its background at a glance without needing a full illustrated outline.

## 3. Production process — how the next hi-fi package actually gets made

This mirrors exactly how `skin-painterly-depth` (M50) and the 3 M30 packages before it were built — a proven, low-risk shape, not a new process invented for this doc.

1. **Scaffold** a new `packages/skin-<name>/` with `package.json`, `tsconfig.json`, `vite.config.ts` (lib-mode build emitting to `apps/web/public/plugins/skins/<id>/index.js`), and `src/index.ts` implementing the `SkinRenderer` contract (`createTilesetTexture`, `createPlayerTexture`, `createNPCTextures`). Each package stays **fully standalone at runtime** — the `ResolvedWorldPalette`/`SkinRenderer` types are copied locally, not imported from the workspace, exactly as `skin-diorama-glow`'s own doc comment explains — so no package ever depends on another package's build output.
2. **Apply §2's conventions** (5-stop fills, per-tile AO, fixed top-left light, 3-tone shading + rim light) as the floor, not the ceiling — a package is free to add more, never less, and should note in its own top-of-file doc comment anything it pushes beyond what the previous flagship did, the same way `skin-painterly-depth`'s comment documents its delta over the 3 M30 packages.
3. **Register at all 4 integration points** (still exactly 4, unchanged since M30):
   - `apps/web/src/skins/ThemePluginManager.ts` — `BUILT_IN_IDS` set + offline-fallback catalog array.
   - `apps/web/src/ui/SettingsModal.ts` — `KNOWN_PREVIEWS` + `catalog` array.
   - `apps/api/internal/theme/handler.go` — `builtInThemes` Go slice.
   - A new `apps/web/public/assets/skins/<id>/skin.manifest.json` (full palette, `audioProfile`, `uiKit`, `rendererUrl`).
4. **Add to the build step**: `scripts/build-skins.sh`'s `SKINS=(...)` array — required before any `apps/web` production build, since Vite copies `public/` as-is and never runs the skin packages' own builds implicitly.
5. **Verify**, in this order, before calling a package done: `npm run check` (tsc) and `npm run build` inside the package itself; the main app's `tsc --noEmit`, `vitest run`, and `oxlint src/` for regressions; a full root `npm run build` to confirm the build-skins step and PWA precache pick up the new bundle; and — for any change that also touches `apps/api` (a new theme registration always does) — a live check against the real Docker stack (`make dev-d`, curl the served `/api/v1/themes` catalog, `make down`), not just the frontend dev server. This last step is the one place this process differs from a docs-only or frontend-only milestone, and it's required every time because the Go registration is real server code, not a config file.
6. **Review criterion**: a new package earns "flagship tier" only if it visibly clears every §2 bar against the *most recent* prior flagship (currently `skin-painterly-depth`), not just against the original 3 M30 skins — the bar moves forward with each milestone, it doesn't stay fixed at M30's.

## 4. Non-goals (carried from EPIC-37, restated for this doc specifically)

- No WebGL/shader-pipeline rewrite — every technique in §2 runs on Phaser's existing Canvas 2D texture-generation path, exactly as today.
- No commitment to when/whether a real illustrated-art pipeline becomes available — §1 stays an open slot, not a promise.
- No forced migration of the 3 pre-M50 hi-fi packages to the 5-stop/AO/rim-light convention — they remain valid, supported skins; §2 is the bar for *new* flagship-tier work, not a retrofit mandate.
