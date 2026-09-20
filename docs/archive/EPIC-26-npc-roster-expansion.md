# EPIC-26 — NPC Roster Expansion

## Origin

Third of the 5-part follow-up sequence from the same broad request that produced [M24](../tasks/M24-economy-and-energy-rebalance.md) and [M25](../tasks/M25-multiplayer-trading-between-neighbors.md): "add multiplayer trading between neighbors, also bring in much more npc and plan about more mini games..."

Grounding the request in the real current code (not just the aspirational design bible) found: the entire live NPC roster is exactly 3 characters — Mira, Leo, Elena (`apps/web/src/world/WorldScene.ts`) — each with a 5-tree rotating dialogue script (`NpcDialogues.ts`) and a daily gossip line (`narrativeGossip.ts`). Two of the game's five construction nodes (Community Tool Library, Community Land Trust) have no NPC voice tied to them at all.

Separately, `docs/planning/09-NPC-SOCIAL-NETWORK-AND-RELATIONSHIPS.md` ("v2.0") already contains a fully-written "Seven Pillars" character bible — Sal, Elena, Marcus, Rosa, Tariq, Mrs. Higgins, Officer Vance — with voice pillars, vulnerabilities, and an aspirational favor/reciprocity/trust-graph mechanic that was never built. Elena is the only one of the seven currently implemented (and her implemented role — Solar Cooperative organizer — doesn't match the planning doc's dossier, which reassigns her to the Community Kitchen and gives solar to Tariq; the live game is the source of truth here, not the aspirational doc).

## Design Intent

Pull three more characters from that existing dossier — **Sal** (Corner Grocer), **Marcus** (Tool Library machinist), and **Mrs. Higgins** (Tenement Historian) — rather than inventing new ones from scratch, and wire each into the *actual* current NPC architecture (walk-up dialogue + gossip line), not the aspirational favor/reciprocity system. This gives every one of the five construction nodes an NPC voice (Kitchen/Mira, Solar/Elena, Legal/Leo, Tool Library/Marcus, Land Trust/Higgins) plus Sal as a South-zone flavor NPC, doubling the roster from 3 to 6.

## Non-Goals

- **No favor/reciprocity mechanic, NPC-to-NPC trust graph, or reciprocal buffs.** The planning doc's "Informal Mutual Aid Favor" system and "Reciprocal Buffs" table are a substantially larger system than a roster expansion — a real trust-graph/ripple-effect economy is its own future milestone, not silently built here.
- **No bespoke walk-animation frames.** Mira/Leo/Elena are each a single static procedural-canvas frame today (no walk cycle) — the three new NPCs match that exact precedent, not a new animation system.
- **No real art assets.** Every skin manifest's `NPC_*_ATLAS` entries for the existing three NPCs point at `.webp` files that don't exist on disk anywhere in the repo today (confirmed by listing every skin's asset directory) — the game runs entirely on the procedural canvas fallback. The three new NPCs' manifest entries follow this same declared-but-unpopulated convention; they are not a regression.
- **Rosa, Tariq, and Officer Vance** (the remaining three dossier characters) are deferred to a future roster pass if the user wants the full seven — not required to satisfy "much more npc" for this milestone.
