# EPIC 01 — Engine Foundation & Top-Down Canvas

**Milestone:** M1 — Sprint 1
**Status:** [ ] Not Started

## Context

Before any game content exists, the player needs a working world to move through. This epic delivers the bare canvas: a responsive tilemap viewport, a player they can control, and collision so the world feels solid. Everything else in the game is built on top of this.

## User Stories

### S1.1 — Responsive Canvas
As a player on any device,
I want the game canvas to fill my screen correctly without blurry pixels,
so that the visual experience feels intentional and sharp on both my phone and desktop.

**Acceptance criteria:**
- Canvas maintains a stable target framerate under mobile emulation
- Integer scaling preserves pixel art sharpness at all viewport sizes
- No letterboxing bleed or layout overflow

### S1.2 — Touch Movement
As a mobile player,
I want a floating virtual thumbstick on the left half of my screen,
so that I can move my character comfortably with my left thumb while keeping my right free for actions.

**Acceptance criteria:**
- Thumbstick spawns dynamically where the player first touches the left half
- Releasing the touch immediately stops the avatar (velocity = 0)
- Thumbstick does not appear on desktop

### S1.3 — Keyboard Movement
As a desktop player,
I want to move my character with WASD or arrow keys,
so that I can play comfortably without needing a mouse.

**Acceptance criteria:**
- All 4 directions (Up, Down, Left, Right) functional
- Movement feels immediate, no input lag from key polling

### S1.4 — Walking Animation
As a player,
I want to see my avatar animate while I walk and face the direction I'm moving,
so that the character feels alive and the world feels responsive to my input.

**Acceptance criteria:**
- 4-directional walking animations (up, down, left, right)
- Frame-based animation cycling tied to movement state
- Idle state when no input is given

### S1.5 — Tile Collision
As a player,
I want buildings, fences, and walls to block my movement,
so that the world feels physical and navigation requires actual wayfinding.

**Acceptance criteria:**
- Player cannot clip into or pass through solid tiles
- No stutter or position snapping when pressing against a wall
- Diagonal corner cases handled gracefully
