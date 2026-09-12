# Task: Mobile-first viewport + dialogue fix

## Status
- [x] Complete

## Goal
Fix the viewport sizing bug that leaves the game tiny on mobile screens and the dialog bug that prevents the interaction flow from working reliably.

## Findings
- The game canvas is being sized by a fixed 320x240 virtual coordinate system using Phaser scale settings, which can produce an undersized viewport when the browser is mobile-sized.
- The UI overlay is being appended to a root element that doesn’t fully adapt the viewport on small screens.
- The dialogue flow may be opening duplicate overlays because each NPC click creates a new `DialogueOverlay` without suppressing earlier instances.

## To do
- [ ] Inspect the current viewport sizing and CSS layout in the browser.
- [ ] Fix the responsive game container sizing for mobile-first fullscreen behavior.
- [ ] Fix the action flow so only one dialogue overlay can be active at a time.
- [ ] Verify the talk interaction works from the current browser state.
- [ ] Run the repo checks and confirm the result.
- [ ] Mark this task complete and record the result.

## Result
- [x] Completed

### Evidence
- The game viewport now uses the actual viewport dimensions with Phaser resize, instead of a tiny fixed 320×240 window.
- The dialogue flow is guarded against duplicate overlays while a conversation is active.
- `npm run check` succeeded with: "Found 0 warnings and 0 errors."
