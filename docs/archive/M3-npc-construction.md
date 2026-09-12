# M3 Tasks — NPC Interactions & Commons Construction

**Sprint:** 3
**Status:** [ ] Not Started
**Stories:** EPIC-03
**Depends on:** M2 complete

---

## NPCEntity.ts

- [ ] Create `src/world/entities/NPCEntity.ts`
- [ ] Define NPC data type: `{ id, token: EntityToken, name, dialogueTreeId, position }`
- [ ] Implement proximity detection radius (configurable per NPC)
- [ ] On player enter radius: emit `npc:enter` event with NPC id
- [ ] On player exit radius: emit `npc:exit` event
- [ ] Exclamation bubble visual indicator when player is in range (optional polish)

---

## Context Action Button

- [ ] Add context action button to HUD (bottom-right, mobile-primary position)
- [ ] Subscribe to proximity events:
  - Near NPC → show "Talk 💬"
  - Near construction node → show "Build 🔨"
  - Neither → hide button
- [ ] Button tap/click triggers the relevant action handler
- [ ] Button keyboard shortcut: Space or E

---

## DialogueOverlay.ts

- [ ] Create `src/ui/DialogueOverlay.ts`
- [ ] Render as HTML overlay (above canvas, below HUD)
- [ ] Typewriter text animation: reveal characters at configurable speed
- [ ] Support 2–4 player response options displayed as selectable buttons
- [ ] Handle dialogue tree traversal: `{ text, responses: [{ label, next }] }` structure
- [ ] Pause player movement while dialogue is open (set InputManager to locked state)
- [ ] Resume movement on dialogue close
- [ ] Touch-accessible: tap to skip typewriter animation; tap response to select

---

## Construction Nodes

- [ ] Define construction node data: `{ id, token: EntityToken, label, position, progressKey }`
- [ ] 3 nodes placed in world:
  - **Node A:** Community Kitchen & Fridge → `kitchenProgress`
  - **Node B:** Rooftop Solar Cooperative → `solarGridProgress`
  - **Node C:** Legal Defense Fund → `legalFundProgress`
- [ ] "Build 🔨" action opens a contribution modal:
  - Shows current progress (0–100%)
  - Input: how much cash/energy to contribute
  - Confirm button calls `updateCommonsProgress(node, amount)` + deducts resources
- [ ] Contribution immediately updates Zustand store and HUD

---

## Dynamic Tilemap Swapping

- [ ] Define threshold value for build completion trigger (per design spec)
- [ ] Subscribe to `commons.*Progress` values in Zustand
- [ ] When a node crosses threshold: swap corresponding tilemap region from `rundown` to `upgraded` tileset
- [ ] Apply permanent daily upkeep reduction buff (via `EconomyMath.ts` — stub if not yet implemented)
- [ ] Tile swap is immediate, no reload

---

## Acceptance Tests (M3)

- [ ] **Test 3.1:** Walking within range of an NPC activates the action button; pressing it opens the dialogue overlay
  - Walk player to within NPC proximity radius → confirm button appears with "Talk 💬" → tap → confirm dialogue opens
- [ ] **Test 3.2:** Contributing cash or energy updates building progress and triggers an immediate HUD refresh
  - Open Build modal → contribute resources → confirm `commons.*Progress` updated in store → confirm HUD shows new resource values
- [ ] **Test 3.3:** Reaching the build completion threshold updates the tilemap and applies the daily upkeep reduction buff
  - Set a node's progress to threshold via dev tools → confirm tileset swaps → confirm buff applied in `EconomyMath`
