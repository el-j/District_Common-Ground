# M31 — HUD Rework, Unified Settings, Restart Fix, Modal-Close Consistency

Story: [`docs/stories/EPIC-31-world-hud-progression-overhaul.md`](../stories/EPIC-31-world-hud-progression-overhaul.md)

Planning: none new under `docs/planning/` — scoped ad hoc from direct user feedback, grounded by an Explore-agent audit of the live UI code (`TopHUD.ts`, `style.css`, `SettingsModal.ts`, `modalDismiss.ts`, every modal file, `main.ts`) before writing this doc.

Status: **Implemented 2026-09-19.**

## Section 1 — HUD layout rework

`apps/web/src/ui/TopHUD.ts` + `apps/web/src/style.css`:
- [x] Split the 12 icon-toolbar buttons by frequency instead of one bottom-right cluster (`#hud-icon-toolbar`, `style.css:3207-3217`). Kept Settings, Radio, Quest, Work in the bottom toolbar alongside `End Day`/the context action button; Share, Builder, Plugins, Shop, Social, Civic Directory, Journal moved into the Menu drawer.
- [x] Added a single "Menu" affordance (`#hud-menu-btn`, `☰`) absolutely positioned to `#top-hud`'s top-right corner, toggling `#hud-menu-drawer`'s grid of the secondary buttons (click-outside and Escape both close it).
- [x] `registerButton()` stays the single button-registration entry point — now takes an optional `group: 'primary' | 'secondary'` (default `'secondary'`) that routes the created button into `iconToolbarEl` or `menuDrawerGridEl`.
- [x] Kernel-plugin-registered buttons (via `attachHudSink`) default to `'secondary'` since the `HudSink` interface only ever passes one argument — a deliberate, sensible default (Menu drawer), not a leftover; documented in a code comment on `registerButton()`.

## Section 2 — Restart flow fix

`apps/web/src/main.ts` (root cause site: `main.ts:118-125`) + `apps/web/src/ui/CharacterSelect.ts`:
- [x] `CharacterSelect` mounting is now reactive to `meta.phase` via a `useGameStore.subscribe()` callback in `main.ts`, mounting a fresh `CharacterSelect` whenever `phase` transitions to `'select'` after boot.
- [x] Guarded against duplicate DOM: `mountCharacterSelect()` is a no-op while an instance is already tracked, and the tracked reference is cleared both by `CharacterSelect`'s own `onComplete` callback (the normal path) and defensively in the subscription when phase leaves `'select'`.
- [x] Verified `TopHUD.render()`'s existing hide-on-select logic needs no change — confirmed correct as-is.
- Not unit-tested: `main.ts`'s `boot()` runs immediately on import (real Phaser game, kernel, service worker) and isn't structured for isolated unit testing without a larger entry-point refactor, out of scope here. Verified live instead (see Verification §4).

## Section 3 — Unify settings (fold mute into SettingsModal)

`apps/web/src/ui/SettingsModal.ts` + `apps/web/src/ui/TopHUD.ts`:
- [x] Added `.settings-audio` (Section renderAudio()) to `SettingsModal`, reusing the existing `setBGMMuted`/`isBGMMuted` from `SoundSynth.ts` — no second mute flag.
- [x] Removed the standalone mute button registration from `TopHUD.ts` entirely (it lives only in Settings now).
- [x] Re-grepped `⚙`/"settings" across `apps/web/src/ui` — `SettingsModal` remains the only settings-shaped surface.

## Section 4 — Modal-close consistency

`apps/web/src/ui/TownHallAssembly.ts` + `apps/web/src/ui/modalDismiss.ts`:
- [x] `TownHallAssembly` now has a visible `.assembly-close` × button, and its Escape handling was switched from a bespoke `window` listener to the shared `bindEscapeClose()` helper.
- [x] Documented via a code comment directly above each class (`CrisisWireModal.ts`, `AuthOverlay.ts`, `CharacterSelect.ts`) that they are intentionally non-dismissible forced-choice/onboarding gates, cross-referencing this section.

## Architecture notes / non-goals

See [EPIC-31](../stories/EPIC-31-world-hud-progression-overhaul.md)'s epic-wide non-goals. This milestone specifically adds no new visual skin/art assets and no new modals beyond the Menu drawer — it's a reorganization + 2 real bug fixes, not new content.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npm test` — full suite green: 403/403 (12 new — `TopHUD.test.ts` ×5 for toolbar/drawer routing + kernel-plugin default group, `SettingsModal.test.ts` ×3 for the mute control, `TownHallAssembly.test.ts` ×4 for the new × button). The `CharacterSelect` re-mount subscription itself stays a live/manual check (see §4) — `main.ts`'s `boot()` runs at import time and isn't isolated for unit testing. Also fixed a pre-existing `DialogueOverlay.test.ts` timer leak (`window.setTimeout` firing after jsdom teardown) surfaced by the new test files' effect on suite ordering — switched that test to fake timers.
3. `cd apps/web && npx oxlint src/` — clean.
4. Live via `make dev-d`: trigger "New Game" from Settings and confirm `CharacterSelect` actually reappears (not a blank/frozen screen) and a fresh run can be started without a page reload; confirm the HUD icon toolbar now shows only the short-listed primary buttons plus a working Menu drawer for the rest; confirm the mute toggle now lives in Settings and the standalone icon is gone; confirm `TownHallAssembly` now has a visible × that closes it; confirm `CrisisWireModal`/`AuthOverlay`/`CharacterSelect` remain deliberately non-dismissible (only resolvable via their forced choice).
