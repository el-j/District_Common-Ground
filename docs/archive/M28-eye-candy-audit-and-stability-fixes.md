# M28 — "2026 Eye-Candy" Audit & Stability Fixes

Story: [`docs/stories/EPIC-28-eye-candy-audit-and-stability-fixes.md`](../stories/EPIC-28-eye-candy-audit-and-stability-fixes.md)

Planning: none new under `docs/planning/` — a direct-request audit + fix pass, scoped ad hoc matching the M21–M27 precedent.

Status: **Implemented 2026-09-17.** Sections 1–5 built and verified; Section 6 formally deferred (see below). `tsc --noEmit` clean, `vitest run` 384/384 (no regressions, no new tests — matches this project's precedent of not unit-testing CSS/manifest/Phaser-rendering content), `oxlint` clean. No Go changes this milestone.

## Section 0 — Prior-session groundwork (retroactively logged, not new work this pass)

The visual overhaul that prompted this audit was implemented in an earlier same-day session but never given a task doc: the `meta.skinRevision` counter (`useGameStore.ts`, `ThemeManager.ts`) fixing the world-tileset boot-palette bug, three refined skins (`solarpunk`="Neon Solarpunk", `aurora`="Aurora Prime", new `sunset_commons`), the `SkinUIKit` glass/gradient/glow system's rollout to a handful of surfaces, and the `[E]` keybind badge centralized in `TopHUD.setAction()`. Logged here for continuity; not re-verified or re-implemented.

## Section 1 — Kill the flicker + HUD-desaturation bug (critical)

- [x] `apps/web/index.html`: `#ui-root` moved from a child of `#game-container` to a DOM sibling under `<body>`, `position: absolute` → `position: fixed` (still viewport-aligned, since `#game-container` is a borderless `100vw`×`100vh` box). Makes it structurally impossible for a world-mood filter on `#game-container` to ever touch HUD/modal chrome again.
- [x] `apps/web/src/style.css`: removed the `emergency-pulse` (and legacy `emergency-pulse-legacy`) `@keyframes` and their `animation: ... infinite` rules — `world--emergency`/`.world-emergency` are now static filters/box-shadows, relying on `#game-container`'s pre-existing `transition: filter 0.8s ease` for a smooth one-time change instead of a perpetual pulse.
- [x] `apps/web/src/core/state/useGameStore.ts`: `INITIAL_STATE.commons.resilienceScore` raised from `0` to `20` (mid-`crisis` tier, not the harshest `emergency` tier) — a fresh game now opens under visible economic stress, not full-collapse imagery on day one.
- [x] `apps/web/src/world/WorldScene.ts`: the resilience-tier store subscription now guards on `commons.resilienceScore` actually changing (`lastResilienceScore` field) before re-running `applyResilienceTier`/`updateWorldDressing` — it previously had no selector and reran on every unrelated store mutation.

## Section 2 — Finish the color/uiKit migration sweep

- [x] `.settings-panel`'s base rule (shared by `SettingsModal`/`ShopModal`/`QuestModal`/`WorkModal`/`ShareModal`/`SocialHubModal`/`CivicDirectoryModal`/`FriendDistrictViewer`/`GeoPreviewModal`'s inner chrome) migrated to `var(--ui-*)`/`var(--skin-*)` with the original hardcoded values kept as fallbacks.
- [x] The remaining 9 icon-toolbar buttons (`shop`/`social`/`civic`/`journal`/`mesh`/`credit`/`radio`/`quest`/`bitchat`) migrated the same way — each keeps its own distinct accent hue as the fallback/hover color (not flattened to one shared color), only the background/border/blur now pick up the active skin.
- [x] `apps/web/src/builder/DistrictGrid.ts`'s plot-card background/border/text color and progress-bar fill migrated from hardcoded hex to `var(--ui-*)`/`var(--skin-*)` (the 3 semantic action-button colors — harvest/upgrade/claim — kept their distinct hues, same reasoning as the toolbar buttons).
- [x] `GeoPreviewModal.ts` given its own `.menu-preview-overlay`/`.menu-preview-panel` classes instead of reusing `SettingsModal`'s `.settings-overlay`/`.settings-panel` — addresses "main menu mixed with in-game menu" by making the pre-game preview visually distinct (an accent top-stripe) from an in-game dialog, while still sharing the same underlying skin-var treatment.

## Section 3 — Fix keyboard interaction

- [x] `WorldScene.ts`: `Phaser.Input.Keyboard.JustDown(this.actionKey)` is now computed exactly once per `update()` and threaded into `handleInteractions(ePressed)` — it was being called a second, independent time inside `handleInteractions()`, and `JustDown` only ever returns `true` once per press, so the second call always saw it as already-consumed. This alone made `E` dead for every world interaction; only `Space` worked.
- [x] `apps/web/src/world/InputManager.ts`: `setLocked(boolean)`'s backing field changed from a single overwritten boolean to a refcount (`lockCount`, floored at 0) — ~10 modals each call `setLocked(true)`/`setLocked(false)` once per open/close with no stacking awareness; opening a second modal on top of an already-open one used to let the first-closed modal's `setLocked(false)` silently unlock movement while the other was still open.
- [x] New `apps/web/src/ui/modalDismiss.ts` (`bindEscapeClose`): a shared, single dispose-function helper, now used by 14 modals — added real Escape support to the 11 that had a working × + backdrop-click but no keyboard dismissal at all (`SettingsModal`, `ShopModal`, `QuestModal`, `WorkModal`, `SocialHubModal`, `PluginManagerModal`, `CivicDirectoryModal`, `GeoPreviewModal`, `FriendDistrictViewer`, `ShareModal`, `CivicJournal`), and fixed a real listener leak in the 3 that already had ad hoc Escape handling but only removed the listener inside the Escape branch itself (`ConstructionModal`, `DistrictBuilderModal`, `HistoryModal` — closing via × left a stale `keydown` listener on `window`/`document` forever).
- [x] `TownHallAssembly.ts`/`style.css`: added a small visible "Esc to dismiss" hint — it already handled Escape correctly, it just had no close glyph at all, so the escape hatch was undiscoverable.
- `CrisisWireModal`'s missing close is intentional (forced A/B choice) — confirmed, not touched.

## Section 4 — Make the speech bubble clickable

- [x] `apps/web/src/world/InteractionPrompt.ts`: the bubble container now takes an optional `onClick` callback, calls `setInteractive()` with a circular hit area, and toggles `input.enabled` in `show()`/`hide()` so it's only clickable while actually visible.
- [x] `apps/web/src/ui/TopHUD.ts`: new public `triggerAction()` fires whatever handler is currently registered via `setAction()` — reused by the bubble's click instead of duplicating `handleInteractions()`'s proximity/priority logic.
- [x] `WorldScene.ts`: all 4 `InteractionPrompt` construction sites (NPCs, construction nodes, the bike portal, the 4 minigame portals) now pass `() => WorldScene.hud?.triggerAction()` — clicking a visible `💬`/`🔨`/`🚲` bubble now does exactly what pressing `E` does for that same target.

## Section 5 — Hide key-hints on touch devices

- [x] `style.css`: `.context-action-button .key-hint` wrapped in `@media (hover: none) and (pointer: coarse)` → `display: none` — targets touchscreens specifically, not a touch-capable desktop monitor still driven by a mouse. CSS-only; no JS device-detection utility existed or was needed.

## Section 6 — Minigame plugin architecture (deferred)

Routing the 5 built-in minigames (`courier-rush`/`kitchen-rush`/`solidarity-line`/`tenant-match`/`tool-workshop`) through the already-built, already-tested `MinigameLoader.loadRemoteMinigame()` + `GET /api/v1/games` catalog path — instead of `main.ts`'s static per-package imports + `registerLocalMinigame` — is **scoped out of this pass** and tracked as a follow-up. It needs a standalone browser-ESM build step per package, static asset hosting, and Go registry changes touching 5 currently-working games; materially larger and riskier than every other fix in this milestone combined. See [EPIC-28](../stories/EPIC-28-eye-candy-audit-and-stability-fixes.md) non-goals.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — 384/384 passed, no regressions.
3. `cd apps/web && npx oxlint src/` — clean.
4. Live-verified against the running dev stack (`make dev-d`, Vite dev server): confirmed the served `index.html` has `#game-container`/`#ui-root` as siblings, confirmed `style.css` no longer contains `emergency-pulse`, confirmed the mobile `key-hint` media query is served, confirmed `resilienceScore: 20` in the served `useGameStore.ts`, confirmed no errors in `web`/`api` container logs, confirmed `GET /health` returns `200`.
5. No Go changes this milestone — backend suite untouched.
