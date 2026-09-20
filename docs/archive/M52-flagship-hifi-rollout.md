# M52 — Flagship Hi-Fi Rollout

Story: [`docs/stories/EPIC-37-hifi-art-direction-rayman-pivot.md`](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 5.

Status: **Implemented.**

## Section 1 — World tiles

- [x] **Already fully satisfied by M50, confirmed rather than assumed.** Re-reading `packages/skin-painterly-depth/src/index.ts` before starting any new work showed `createTilesetTexture()` already draws all `TILE_FRAME_COUNT = 11` frames (floor, wall, grass, road, plaza, door, built/highlight, tree, water, dirt path, sidewalk), and cross-checking against `apps/web/src/world/MapData.ts`'s real `T` tile-index map (`FLOOR:0 … SIDEWALK:10`, `TILE_FRAME_COUNT = 11`) confirmed the frame order matches exactly, index for index. M50's "single-slice proof" framing in its own task doc undersold what was actually built — it was never a partial tile subset. No new tile-rendering code was needed; this section's real work was verifying and recording that fact rather than blindly re-implementing already-complete coverage.

## Section 2 — Character & NPC art

- [x] Wired up M48's previously-unconsumed `player.appearance` token (4 skin-tone variants, confirmed via grep to have zero prior consumers anywhere in `world/`/`skins/`) into the `SkinRenderer` contract: `SkinRenderer.createPlayerTexture()` in `apps/web/src/skins/SkinRendererInterface.ts` gained an optional `appearance?: AppearanceToken` parameter — additive and backward-compatible, since every `packages/skin-*` bundle copies this interface locally rather than importing it (confirmed pattern from M30/M50), so an older bundle simply ignores the extra runtime argument.
  - **Built-in `DEFAULT_RENDERER`** (`WorldScene.ts`, shared by all 5 legacy/non-hifi skins) now varies `createPlayerTexture()`'s skin-tone color by `player.appearance` via a new `APPEARANCE_SKIN_TONES` map, with `APPEARANCE_TONE_1` deliberately set to the exact pre-M52 hardcoded hex so old saves/legacy skins render identically to before.
  - **Flagship (`skin-painterly-depth`)** got the same treatment with its own local `APPEARANCE_SKIN_TONES` map (again, `TONE_1` matching its pre-M52 default) — the flagship demonstrating the full surface, per this section's own wording.
  - Both call sites in `WorldScene.ts` (the synchronous `preload()` fallback and the async skin-switch path) updated to pass `useGameStore.getState().player.appearance` through.
  - **Explicit scope decision, recorded not silently left inconsistent**: the other 3 hi-fi packages (`skin-diorama-glow`/`skin-flat-vector`/`skin-neon-city`) were deliberately **not** retrofitted to consume `appearance` — they still typecheck fine against the new optional param (JS ignores unread arguments) but keep their single fixed skin tone. This matches EPIC-37's own "no forced retirement/reskin of the other skins" non-goal and the M51 bible's §4 "no forced migration" precedent: only the flagship is required to prove the surface, not every skin.
  - NPC art (`createNPCTextures()`) was left as-is: NPCs don't carry a `player`-style `appearance` field (they're fixed named characters, not player-customized), so there was no new per-NPC surface to wire — confirmed by grep there is no NPC-appearance concept anywhere in `GameState`.

## Section 3 — Key UI surfaces

- [x] **Already fully satisfied by M50, confirmed rather than assumed.** `apps/web/public/assets/skins/painterly_depth/skin.manifest.json`'s `uiKit` block (fontFamily/fontFamilyDisplay, radiusSm/Md/Lg, shadowPanel, shadowGlow, gradientPanel, gradientAccent, blur, pixelArt) was already fully populated at M50 time — re-checking `ThemeManager.ts`'s `applyUiKitVariables()` confirmed it reads directly from `manifest.uiKit` and writes every field to a `--ui-*` CSS custom property on `<html>`, with `src/style.css` consuming 122 separate `var(--ui-*, …)` references across HUD/dialogue/modal components (grepped to confirm, not assumed). No new code was needed; switching to the flagship skin already retextures every one of those UI surfaces through the existing M22 mechanism.

## Architecture notes / non-goals

See [EPIC-37](../stories/EPIC-37-hifi-art-direction-rayman-pivot.md)'s epic-wide non-goals. This milestone promotes the M50 proof toward a genuine flagship option; it does not require retiring or hiding any of the other 8 skins — confirmed upheld, all 8 remain registered and untouched except for the additive, backward-compatible `SkinRenderer` interface change. **EPIC-37 is now complete** (M50 → M51 → M52, all implemented).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd packages/skin-painterly-depth && npm run check && npm run build` — clean, bundle rebuilt (7.09 kB, gzip 2.27 kB — grew slightly from M50's 6.91 kB due to the new appearance-tone map).
3. `cd apps/web && npx vitest run` — 591/591, no regressions. No new test was added for the appearance-tone wiring specifically, consistent with this project's established precedent of not unit-testing Phaser-canvas texture-drawing functions directly (`WorldScene.ts` has no dedicated test file for the same reason — Phaser crashes under plain jsdom, documented repeatedly elsewhere in this project); coverage here is the live dev-server check below plus the unchanged full-suite pass proving no other consumer broke.
4. `cd apps/web && npx oxlint src/` — clean, same pre-existing non-blocking warning.
5. Root `npm run build` — clean; PWA precache unchanged at 32 entries (existing files modified, no new files added this milestone).
6. Live via the Vite dev server (`npm run dev`, not the full Docker stack — this milestone touches no `apps/api` code, unlike M50): confirmed `200` on the dev index, the modified `WorldScene.ts` module, and the rebuilt `painterly_depth` renderer bundle. Full manual walkthrough (world/interior/HUD visual comparison) stays the same documented limitation as every prior visual milestone — no headless browser available to this agent.
