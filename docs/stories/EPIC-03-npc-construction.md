# EPIC 03 — NPC Interactions & Commons Construction

**Milestone:** M3 — Sprint 3
**Status:** [ ] Not Started

## Context

The neighborhood becomes a social space here. Players can talk to residents, learn their situations, and contribute to building shared infrastructure. The world starts to visually reward collective action — completed projects change the tilemap itself.

## User Stories

### S3.1 — NPC Proximity Interaction
As a player walking through the neighborhood,
I want NPCs to become interactable when I walk near them, with a clear action prompt,
so that the world feels populated and I know exactly when and how to engage.

**Acceptance criteria:**
- NPCEntity has a configurable proximity detection radius
- Walking into range shows a context action button (bottom-right on mobile)
- Button displays "Talk 💬" near NPCs, "Build 🔨" near construction sites
- Button disappears when the player walks out of range

### S3.2 — Dialogue System
As a player talking to a neighbor,
I want to read their dialogue with typewriter animation and choose from branching responses,
so that conversations feel human and my choices feel meaningful.

**Acceptance criteria:**
- DialogueOverlay.ts renders text character by character (typewriter effect)
- Player can select from 2–4 response options
- The overlay is keyboard and touch accessible
- Dialogue closes cleanly and returns control to the player

### S3.3 — Community Construction
As a player,
I want to contribute resources to three community building projects and watch them progress,
so that I can see direct material consequences of my investment in the commons.

**Build nodes:**
- **Node A:** Community Kitchen & Fridge (reduces daily food cost)
- **Node B:** Rooftop Solar Cooperative (reduces energy upkeep)
- **Node C:** Legal Defense Fund (reduces stress from crisis events)

**Acceptance criteria:**
- Each node has a visible progress bar in the world / UI
- Contributing cash or energy updates the node's progress immediately
- HUD refreshes to reflect resource change

### S3.4 — Visual World Transformation
As a player who has invested in the commons,
I want to see the neighborhood tiles change to reflect the work done —
rundown textures replaced with thriving, maintained ones —
so that my actions have a visible legacy in the world.

**Acceptance criteria:**
- Reaching a build threshold (per design spec) swaps the tilemap from rundown to upgraded visuals
- The visual change applies the daily upkeep reduction buff to the player's stats
- No reload required — tilemap swap happens live
