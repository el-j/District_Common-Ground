# M22 — UI Skin Kit & "Modern Shine" Redesign

Stories: `docs/stories/EPIC-22-ui-skin-kit-and-modern-shine.md`
Planning: none — direct user request 2026-09-15 ("move away from the zelda optic... make this look very nice and shiny... store this as a ui-skin-kit that can be easily applied via our system").

> **Grounding note (2026-09-15):** every diagnosis below comes from grepping the actual `index.html`/`style.css`/`ThemeManager.ts`, not from assuming "pixel art = old." The single most important finding: `ThemeManager` has been writing 7 `--skin-*` CSS custom properties for multiple sessions, but `style.css` only *reads* them in 8 places (all added in the last two sessions) — the skin system barely reaches the UI at all today. That's the real blocker to "easily applied via our system," and Section 1 below fixes it before Section 3 tries to ship a new look through it.
>
> **Status (2026-09-15):** Sections 1–3 implemented same-day, following the user's "ok please implement now". Section 4 (full modal sweep) and Section 5 (documentation-only) remain as scoped. Manual visual/contrast tests (22.4/22.5) still need a live browser.

## 1. Foundation — make the skin system actually reach the UI

- [x] Move `index.html`'s inline `<style>` rules that should be theme-driven into `style.css`/the same `<style>` block, `--ui-*`-driven with safe fallbacks:
  - `html, body { font-family: monospace; }` → `background: var(--ui-bg, #1a1a2e); font-family: var(--ui-font, monospace);`
  - `#game-container canvas { image-rendering: pixelated; image-rendering: crisp-edges; }` → kept as the default, added `html[data-pixel-art="false"] #game-container canvas { image-rendering: auto; }` beneath it
  - Everything else in `index.html`'s `<style>` block left alone (layout-only rules)
- [x] New shared CSS surface classes in `style.css`: `.ui-panel`, `.ui-panel--accent`, `.ui-btn--glow` — additive utility classes for Section 4's future sweep, nothing existing removed
- [x] Migrated the **highest-traffic** surfaces directly to the `--ui-*` vars (functionally equivalent to `.ui-panel`, done via CSS rule edits rather than touching each `.ts` file's className, to avoid any risk to JS logic keyed off class names): the icon-button toolbar (`[class*="-open-btn"]`, glow-on-opt-in only), `.dialogue-panel`, `.radio-widget` + `.radio-controls button`, `.context-action-button`, `.end-day-btn`, `#top-hud`, and CharacterSelect's `.cs-title`/`.cs-subtitle`/`.cs-geo-preview-link`/`.archetype-card`
- [x] Verified this section is a no-op for every existing skin — **and found a real design bug while doing it**: an early draft of `applyUiKit()` always wrote `DEFAULT_UI_KIT`'s literals for every unset field, which would have flattened every component's distinct bespoke background (radio-widget's warm amber, end-day-btn's green, dialogue-panel's navy, ...) to one shared generic gradient the moment *any* skin loaded — a real regression, not a no-op, unlike M21's single-consumer `DEFAULT_WORLD_PALETTE` precedent. Fixed by making `applyUiKit()` only set a CSS var when the active manifest's `uiKit` actually supplies that field, and `removeProperty()` it otherwise — so an unset var falls through to each rule's own local hardcoded fallback. Confirmed via `ThemeManager.test.ts` Test 22.3 and the full existing suite (341/341, no regressions).

## 2. `SkinUIKit` schema (spec-free, following M21's `SkinPalette` extension precedent exactly)

- [x] `SkinInterface.ts` — new optional `SkinManifest.uiKit?: SkinUIKit` field:
  ```ts
  export interface SkinUIKit {
    fontFamily?: string;       // body/UI font stack
    fontFamilyDisplay?: string; // heading font stack, falls back to fontFamily
    radiusSm?: string;
    radiusMd?: string;
    radiusLg?: string;
    shadowPanel?: string;      // full box-shadow value
    shadowGlow?: string;       // accent/active-state glow box-shadow
    gradientPanel?: string;    // panel surface background
    gradientAccent?: string;   // primary-button/highlight background
    blur?: string;             // backdrop-filter blur length, e.g. "12px"
    pixelArt?: boolean;        // true = keep crisp pixel-art rendering (default)
  }
  ```
- [x] `ThemeManager.ts` — `DEFAULT_UI_KIT` constant matching today's actual values exactly + `resolveUiKit(partial?: SkinUIKit): ResolvedUiKit` (Test 22.1/22.2, used for JS-side full resolution) + `applyUiKit(manifest)`. **Deviation from the original plan, discovered during implementation:** `applyUiKit()` does *not* write `resolveUiKit()`'s fully-defaulted output to CSS — see the Section 1 bug note above for why. It writes only the fields the manifest's raw `uiKit` actually supplies (`--ui-font`, `--ui-font-display`, `--ui-radius-sm/md/lg`, `--ui-shadow-panel`, `--ui-shadow-glow`, `--ui-gradient-panel`, `--ui-gradient-accent`, `--ui-blur`), `removeProperty()`-ing the rest, and separately sets `html.dataset.pixelArt = String(pixelArt ?? true)` (safe as a blanket default since exactly one CSS rule consumes it, unlike the bespoke-per-component gradient/shadow fields)
- [x] `switchSkin()` / `activateDefaultSkin()` — call `applyUiKit(manifest)` alongside the existing `applyPalette(manifest)` call
- [x] `ThemeManager.test.ts` — Test 22.1 (no `uiKit` → exact pre-M22 defaults), Test 22.2 (+22.2b partial-field fallback), and Test 22.3 (switching skins flips `html.dataset.pixelArt`)

## 3. Ship "Aurora Glass" — the proof skin

- [x] New `apps/web/public/assets/skins/aurora/skin.manifest.json` — `skinId: "aurora"`, `displayName: "Aurora Glass"`. Deep navy `background` (`#0b1220`), translucent glass `surface`, cyan accent (`#7dd3fc`), near-white `text`; world-tile fields recolored to a cool twilight-blue/violet palette with warm glowing-window doors
- [x] `uiKit` block: `fontFamily: "'Inter', system-ui, sans-serif"`, soft radii (10/18/28px), a real glow, glassy panel/accent gradients + `blur: 16px`, `pixelArt: false`. **Font decision made during implementation:** no `<link>` to Google Fonts and no self-hosted `@font-face` were added — this is a real offline-first PWA (see M18), and adding a network font dependency would both leak viewer IPs to a third party and break the "boots with zero network" guarantee. `'Inter'` is listed first for browsers that happen to have it installed, but the stack degrades to `system-ui, sans-serif` everywhere else, which is already a genuine, free step away from monospace.
- [x] `assetMap` — full `EntityToken` coverage, texture URLs point at `assets/skins/aurora/*.webp` (none of which exist yet, exactly like `solarpunk`/`retro_gb` today — they 404-skip gracefully in `switchSkin()`)
- [x] `audioProfile` — `sfxType: "soft_synth_pads"`, `bgmType: "ambient_shimmer"` (stored, inert, matches the existing pattern for all skins)
- [x] Registered `aurora` as selectable everywhere the built-in skin list was hardcoded — **found 3 separate copies during implementation, not 1**: `SettingsModal.ts`'s local `catalog`/`KNOWN_PREVIEWS`, `ThemePluginManager.ts`'s `BUILT_IN_IDS` + offline-fallback catalog, and the Go backend's `apps/api/internal/theme/handler.go` `builtInThemes` (the online catalog source `getThemeCatalog()` actually calls first) — all three updated so `aurora` appears both online and offline.

## 4. Full modal sweep (explicitly deferred / follow-up — matches M16/M17's scoping convention)

- [ ] Migrate the remaining ~19 `ui/*.ts` panels (`BroadsheetModal`, `QuestModal`, `ShopModal`, `SocialHubModal`, `CivicDirectoryModal`, `DistrictBuilderModal`, `PluginManagerModal`, `CrisisWireModal`, `HistoryModal`, `TownHallAssembly`, `SafeHavenBanner`, `CivicJournal`, `CivicTickerWidget`, the mesh/geo-weather/mutual-credit/bitchat plugin panels, `AuthOverlay`) from their own hardcoded `linear-gradient(180deg, #hex, #hex)` panel backgrounds to `.ui-panel` — **not required** for "Aurora Glass" to prove the kit works (Section 1's highest-traffic list is the actual acceptance bar), but required before the skin *feels* complete everywhere rather than in patches
- [ ] Once the sweep is done, consider whether the per-modal gradient/shadow rules can be deleted outright rather than left as now-redundant dead CSS

## 5. World-tilemap scope decision (explicitly out of scope this milestone)

- [ ] Document (this line is the documentation): the hand-drawn canvas tile art in `WorldScene.ts`'s `createTilesetTexture()` stays hand-drawn pixel-primitive art — `uiKit.pixelArt: false` only turns off `image-rendering: pixelated` so the existing small textures get smoothly interpolated on upscale (a real, free softening), it does **not** repaint the tileset as vector/gradient art. A fully painted or vector-style world tileset is a separate, much larger asset-generation milestone, not silently bundled into this one.

## Tests

- [x] `ThemeManager.test.ts` — Test 22.1 (no `uiKit` → exact pre-M22 defaults, zero regression)
- [x] `ThemeManager.test.ts` — Test 22.2 (+22.2b) (a full "shiny" `uiKit` input resolves without falling back to defaults; a partial one falls back per-field)
- [x] `ThemeManager.test.ts` — Test 22.3 (switching to `aurora` sets `html.dataset.pixelArt = "false"`; switching back to `labor_woodcut` sets it back to `"true"`)
- [ ] Manual: Test 22.4 (visual pass — `aurora` reads as genuinely different chrome on HUD/dialogue/radio/character-select, not just recolored)
- [ ] Manual: Test 22.5 (contrast check on glass/glow surfaces)

**Verification run 2026-09-15:** `cd apps/web && npx tsc --noEmit` clean · `npx vitest run` 341/341 · `npx oxlint src/` clean · `cd apps/api && go build ./...` clean · `go test -race -short ./...` clean · `npm run build` (web) succeeds (only the pre-existing, unrelated dynamic-import warning).
