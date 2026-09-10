# M1 Tasks — Engine Foundation & Top-Down Canvas

**Sprint:** 1
**Status:** [ ] Not Started
**Stories:** EPIC-01

---

## Setup

- [ ] Initialize Vite project with TypeScript template
  - `npm create vite@latest . -- --template vanilla-ts`
  - Enable strict TS: `noImplicitAny: true`, `strictNullChecks: true`, `strict: true`
- [ ] Install dependencies: `phaser` (or `pixi.js`), `tailwindcss`, `zustand`, `idb-keyval`, `vite-plugin-pwa`
- [ ] Configure Tailwind CSS (PostCSS config, content paths)
- [ ] Set up directory structure per `CLAUDE.md` layout
- [ ] Create `index.html` with canvas mount point and HUD overlay root
- [ ] Set up `main.ts` engine bootstrap entry point

---

## WorldScene.ts

- [ ] Create `src/world/WorldScene.ts`
- [ ] Initialize Phaser Game instance with canvas config
- [ ] Implement responsive viewport: virtual resolution scaled to fill screen
- [ ] Apply integer scaling to preserve pixel art sharpness
- [ ] Load placeholder tilemap (16px tile grid, 3-zone world layout: North/Central/South)
- [ ] Implement basic tile rendering loop

---

## InputManager.ts

- [ ] Create `src/world/InputManager.ts`
- [ ] Implement WASD movement (keyboard)
- [ ] Implement Arrow key movement (keyboard)
- [ ] Implement dynamic floating virtual thumbstick for touch
  - Spawns at touch origin point on left screen half
  - Directional vector calculated from drag delta
  - Clamp to max radius
- [ ] Implement thumbstick cleanup on `touchend` / `touchcancel` (velocity → 0)
- [ ] Export a normalized `{ dx, dy }` direction per frame

---

## PlayerEntity.ts

- [ ] Create `src/world/entities/PlayerEntity.ts`
- [ ] Bind to InputManager direction output
- [ ] 4-directional movement (Up, Down, Left, Right)
- [ ] Frame-based walking animation per direction
- [ ] Idle animation when no input
- [ ] Expose `position: { x, y }` and `facing` state

---

## CollisionSystem.ts

- [ ] Create `src/world/CollisionSystem.ts`
- [ ] Build AABB tile collision check against solid tile layer
- [ ] Resolve collision: stop movement axis that collides, allow perpendicular axis
- [ ] No clipping into tiles
- [ ] No stutter at wall corners

---

## Acceptance Tests (M1)

- [ ] **Test 1.1:** Canvas maintains stable framerate under mobile emulation (375px screen)
  - Open Chrome DevTools → Mobile emulation → 375x667
  - Confirm FPS counter stays at target under continuous movement
- [ ] **Test 1.2:** Moving player into a solid obstacle tile stops position advancement without clipping or stutter
  - Walk character into a wall tile from all 4 directions
  - Confirm position never overlaps the tile bounding box
- [ ] **Test 1.3:** Releasing touch input immediately brings avatar velocity to 0
  - Touch and drag thumbstick → release → confirm player stops in ≤1 frame
