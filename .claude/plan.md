# Mobile-first fix plan

## Objective
Fix the fullscreen/mobile rendering bug and the talk dialogue interaction bug before continuing the M3 milestone work.

## Working assumptions
- The game is a mobile-first PWA and must fill the viewport cleanly on phone-sized screens.
- The player interaction flow must be reliable: nearby NPC -> action button -> dialogue overlay -> close -> resume play.
- Changes must preserve the existing architecture and keep state logic decoupled from skin assets.

## Execution plan
1. Inspect the live viewport sizing and interaction path in the browser.
2. Identify the root causes in the render config and the dialogue lifecycle.
3. Implement the minimal fixes for full-viewport sizing and one-dialog-at-a-time behavior.
4. Verify all project checks still pass.
5. Update the tracked task file and orchestrator status to complete.

## Acceptance checks
- The game fills the mobile viewport without tiny letterboxed framing.
- Movement and the HUD remain visible and usable on small screens.
- The Talk action opens exactly one dialogue instance and closes cleanly.
- TypeScript + lint checks remain green.
