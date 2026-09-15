# EPIC-22 — UI Skin Kit & "Modern Shine" Redesign

**Agent roles:** technical-artist, ui-designer, whimsy-injector, engineering-frontend-developer
**Planning doc:** none (direct user request, 2026-09-15) — no design spec exists yet for this one, unlike M21's kickstart doc.

## Vision

The user's own words: *"i think we must move away from the zelda optic. i realy look to old... make this look very nice and shiny... store this as a ui-skin-kit that can be easily applied via our system."*

This epic does two things:

1. **Diagnoses why the game reads as dated** — not vaguely ("it's pixel art"), but by tracing exactly which hardcoded values in the current code produce that look, so the fix targets the real cause.
2. **Builds a `ui-skin-kit`**: extends the *existing* skin-manifest pipeline (`ThemeManager.ts` / `SkinInterface.ts`, already used for `solarpunk`/`retro_gb`/`retro_gb`/`labor_woodcut`, and just extended for world-tile colors in M21) with a second, parallel token set for **UI chrome** — fonts, corner radii, shadows/glows, gradients, blur, and a pixel-art on/off switch — so a completely different visual "feel" (not just a different palette) can be swapped in the same way skins already are: `switchSkin(skinId)`, no rebuild, no code change per skin.

## Grounded diagnosis (verified against the actual code, not assumed)

- **`index.html`** hardcodes `font-family: monospace` on `html, body` and `image-rendering: pixelated; image-rendering: crisp-edges;` on the Phaser canvas, both in a `<style>` block *inside `index.html` itself* — outside `style.css` entirely, and with zero connection to the skin system. No skin can ever change these today, no matter what its manifest says.
- **`style.css`** (2,674 lines) has **28** `font-family` declarations and every single one is a monospace variant. It has **85** `border-radius` uses, but they cluster at 2–8px (sharp/blocky) or `999px` (pill) — there is no soft/glassy radius language. It has only **13** `box-shadow` uses total across the whole file, and only **2** `backdrop-filter: blur()` uses — there is essentially no glow, glass, or depth language anywhere.
- **The most important finding:** `ThemeManager.applyPalette()` has been setting 7 `--skin-*` CSS custom properties (`--skin-bg`, `--skin-surface`, `--skin-accent`, `--skin-text`, `--skin-hud-bg`, `--skin-hud-border`, `--skin-hud-text`) on `document.documentElement` since before this session — but grepping `style.css` for `var(--skin-` turns up **8 total usages**, all added in the last two sessions (the geo-weather barometer chip and M21's radio-widget restyle). The skin system can already change color values; **almost nothing in the UI reads them.** Switching skins today recolors the HUD border on 2–3 elements and (as of M21) the world tilemap — everything else (25 separate modal files in `apps/web/src/ui/`, each with its own hardcoded `linear-gradient(180deg, #hex, #hex)` panel background — 10 such gradients exist, all independently authored, all dark-navy) stays pinned to the original palette regardless of active skin.
- **No shared modal base.** All 25 `ui/*.ts` files (`DialogueOverlay`, `ConstructionModal`, `SettingsModal`, `BroadsheetModal`, `ShopModal`, etc.) implement their own panel chrome from scratch in `style.css`, rather than sharing one themeable surface class. This is *why* re-skinning the chrome would otherwise mean touching 25 files one at a time — the fix is a shared `.ui-panel`/`.ui-surface` utility class, not per-modal patches.
- **World tiles are hand-drawn canvas pixel art** (`WorldScene.ts`'s `createTilesetTexture()`, palette-driven since M21). This is a separate, larger asset-generation problem from the UI chrome — see Scope below.

## What "ui-skin-kit" means concretely

A second manifest section, `uiKit`, alongside the existing `palette` — additive, optional, same fallback-to-defaults pattern M21 used for `worldFloor` etc. (`SkinManifest.uiKit?: SkinUIKit`), covering: font stack, a 4-step radius scale, a panel shadow, an accent glow shadow, a panel background gradient, an accent gradient, an optional backdrop blur amount, and a `pixelArt: boolean` switch that flips the Phaser canvas (and any other pixel-art-sensitive surface) between crisp/blocky and smooth rendering — all resolved through `ThemeManager.applyUiKit()` into new `--ui-*` CSS custom properties, the same way `applyPalette()` already works.

A concrete new skin, **"Aurora Glass"** (`skinId: "aurora"`), ships as the proof that the kit works: bright gradient backdrop, glassmorphic panels, soft glowing accents, a modern sans-serif font, smooth (non-pixelated) rendering — the "very nice and shiny" look the user asked for — switchable at runtime exactly like `solarpunk`/`retro_gb` are today.

## Four Pillars

1. **Wire the skin system into the UI it was always meant to theme** — move `index.html`'s hardcoded font/image-rendering into `style.css` as `--ui-*`-driven rules; introduce a shared `.ui-panel` surface class; migrate the highest-traffic surfaces (HUD, dialogue, radio, character select, the icon toolbar) to consume it.
2. **Extend the manifest schema** with `SkinUIKit` (font, radius, shadow, glow, gradient, blur, pixelArt) and `ThemeManager.resolveUiKit()`/`applyUiKit()`, following M21's additive/fallback-safe precedent exactly.
3. **Ship "Aurora Glass"** as a complete, real, switchable skin proving the kit end-to-end — not just a token schema with no skin using it.
4. **Scope the world-tilemap question honestly**: the cheap, real, in-scope win is `pixelArt:false` smoothing the existing hand-drawn canvas textures (an actual visual softening, zero new art); a fully painted/vector "shiny" tilemap is flagged as a separate, future, much larger effort — not silently promised here.

## Acceptance Criteria

- **Test 22.1:** `ThemeManager.resolveUiKit()` — given no `uiKit` in a manifest (e.g. `labor_woodcut`, or any older/community skin), returns the exact pre-M22 defaults (monospace font, sharp radii, `pixelArt: true`) — zero regression for skins that don't opt in.
- **Test 22.2:** Given the "Aurora Glass" manifest's `uiKit`, `resolveUiKit()` returns its smooth-font/glass/glow/`pixelArt:false` values.
- **Test 22.3:** Switching to `aurora` sets `html[data-pixel-art="false"]`, and the corresponding CSS rule turns off `image-rendering: pixelated` on the Phaser canvas — verified at the token-resolution/attribute level, not a full render (matches how M21 verified palette switching).
- **Test 22.4 (manual):** Visual pass — switching between `solarpunk`/`retro_gb` and `aurora` produces a genuinely different *feel* (not just different hex values) on at least: the HUD icon toolbar, the dialogue box, the radio widget, and the character-select screen.
- **Test 22.5 (manual):** Lighthouse/contrast pass on the new glass/glow surfaces — glow effects and blur must not drop text contrast below WCAG AA on top of the new gradients.
