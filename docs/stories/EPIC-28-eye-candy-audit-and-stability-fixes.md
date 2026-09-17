# EPIC-28 — "2026 Eye-Candy" Audit & Stability Fixes

## Origin

A direct user request — "the whole game look like zelda in very very bad coloreing... make this game a real eye-candy!" — led to a same-day visual overhaul (never given its own milestone doc at the time, retroactively covered here as groundwork): a `skinRevision` counter fixing a world-tileset boot bug, three refined skin manifests (Neon Solarpunk, Aurora Prime, Sunset Commons), a `uiKit` glass/gradient/glow CSS-variable system, and `[E]`-style keybind badges on context actions.

The user then tested that build live and reported it had **not** actually fixed the core complaint, plus 7 further concrete issues, verbatim: dialogs missing a close ("×"), the main menu visually blending with in-game menus, colors "flickering the whole time (we had this already before!)", keyboard keys not working, clicking a character's speech bubble doing nothing, keyboard-shortcut hints needing to hide on mobile, and minigames being "build into the frontend and not loaded via plugin system independently." The user explicitly asked for "a full audit and planning about all these findings," so three Explore agents audited the live code (not just the screenshots) in parallel before any fix was proposed.

## Design Intent

Every one of the 8 complaints had a concrete, code-confirmed root cause — this was root-cause debugging, not a subjective repaint:

- **The flicker + "still muted/90s" complaint shared one root cause**: `#ui-root` (the entire HUD/modal DOM tree) was a *child* of `#game-container`, which carries world-mood CSS filter classes (`world--crisis`/`world--emergency`, driven by `commons.resilienceScore`). A CSS filter on a parent composites over every descendant as one layer — so those filters were desaturating/pulsing the whole HUD, not just the Phaser canvas, and `resilienceScore` starting at `0` put every fresh game straight into the harshest `emergency` tier, whose `animation: ... infinite` keyframe ran forever. Fixed by moving `#ui-root` to be a DOM sibling of `#game-container` (not a child), removing the infinite pulse in favor of a static filter + the pre-existing `transition: filter 0.8s ease`, and bumping the starting score into the milder `crisis` tier.
- **The other half of "still 90s"**: the prior session's `uiKit` rollout only reached a fraction of the UI — `.settings-panel` (shared by 9 modals), 9 of 15 icon-toolbar buttons, and `DistrictGrid.ts`'s plot cards (the visually dominant content of the Living District Builder modal) were still fully hardcoded, never reading a skin variable.
- **"Keyboard keys do not work"**: a genuinely deterministic bug — `WorldScene.update()` called Phaser's `JustDown(actionKey)` twice per frame (once for the Scraps-the-cat feed check, again for Talk/Build/Town Hall/etc.), and `JustDown` only ever returns `true` once per press. The second check always saw it as already-consumed, so `E` could never trigger a world interaction — only `Space` ever worked.
- **"Clicking the speech bubble does nothing"**: confirmed literal — `InteractionPrompt.ts`'s bounce-bubble is a decorative Phaser `Arc`+`Text` with no `setInteractive()` call, ever. It never could be clicked.
- **"Mini-games not via plugin system"**: true for the 5 built-in games specifically (compiled into `main.ts` via static imports) even though a full, independent, tested plugin/manifest system for minigames already exists end-to-end (`PluginManagerModal` → `PluginRegistry` → `GET /api/v1/games` → `MinigameLoader.loadRemoteMinigame()`) — it's just never called from application code today.

## Non-Goals

- **Routing the 5 built-in minigames through the plugin/catalog system.** This is a genuine infra build-out (a standalone browser-ESM build step per package, static asset serving, Go registry changes) touching 5 currently-working minigames — materially larger and riskier than every other fix in this milestone combined. Deliberately scoped out and tracked as a deferred follow-up, the same pattern this project already used for M22's "full 25-modal sweep."
- **CrisisWireModal's missing close button.** Confirmed intentional — it's a forced A/B crisis choice by design; not a bug to fix.
- **The ~250ms CharacterSelect→HUD crossfade overlap** noticed during the "main menu mixed with in-game menu" investigation. Reads as a deliberate transition (both layers are full-screen `position:absolute` with an opacity fade), not a bug — left untouched.
