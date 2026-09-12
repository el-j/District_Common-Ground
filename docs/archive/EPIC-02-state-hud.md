# EPIC 02 — State Store, Archetype Selection & HUD

**Milestone:** M2 — Sprint 2
**Status:** [ ] Not Started

## Context

The game needs a spine: a state machine that tracks who the player is, what they have, and how far along the day is. This epic delivers character selection, the HUD overlay that surfaces live resource data, persistence across sessions, and the audio engine.

## User Stories

### S2.1 — Character Archetype Selection
As a new player starting the game,
I want to choose between three characters who start from very different social positions,
so that I can understand the game's central argument: the same crises hit differently depending on your class.

**Archetypes:**
| Character | Cash | Energy | Trust | Stress |
|---|---|---|---|---|
| Pip — Precarious Courier | $25 | 80/100 | 40/100 | 60% |
| Morgan — Exhausted Commuter | $240 | 40/100 | 25/100 | 45% |
| Arthur — Solitary Landlord | $1,200 | 65/100 | 10/100 | 30% |

**Acceptance criteria:**
- All 3 archetypes selectable from a character select screen
- Selecting a character correctly seeds asymmetric stats in the Zustand store
- The starting stats match the design spec exactly

### S2.2 — Floating HUD Overlay
As a player during gameplay,
I want to see my current resources at a glance without the HUD blocking the world,
so that I can make informed decisions without pausing to open a menu.

**HUD elements:**
- **Top bar:** Avatar token, Day counter, Commons Resilience progress bar
- **Resource matrix:** Cash ($), Energy (⚡), Trust (🤝), Stress (🔥)

**Acceptance criteria:**
- HUD implemented as an HTML/CSS overlay (not rendered on canvas)
- Updates reactively whenever store state changes
- Fully legible on a 375px wide screen

### S2.3 — Session Persistence
As a returning player,
I want the game to resume exactly where I left off — same position, same day, same resources —
so that I don't lose progress if I close the tab or my phone battery dies.

**Acceptance criteria:**
- State saved to IndexedDB on every day transition
- Refreshing the browser tab fully restores player coordinates, current day, and resource values
- No data loss on cold restart

### S2.4 — Procedural Audio
As a player,
I want ambient sound effects (footsteps, UI clicks, chimes) without the game asking permission to play audio aggressively,
so that the audio enhances immersion without triggering browser autoplay blocks.

**Acceptance criteria:**
- SoundSynth.ts uses native Web Audio API only (no MP3/OGG files)
- Audio initialization fires on first user tap, not on page load
- No autoplay policy errors in mobile Safari or Chrome
