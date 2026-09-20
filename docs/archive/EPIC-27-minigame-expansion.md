# EPIC-27 — Minigame Expansion

## Origin

Fourth of the 5-part follow-up sequence from the same broad request that produced [M24](../tasks/M24-economy-and-energy-rebalance.md), [M25](../tasks/M25-multiplayer-trading-between-neighbors.md), and [M26](../tasks/M26-npc-roster-expansion.md): "...plan about more mini games..."

Grounding the request in the real current code found: `packages/shared-types/src/kernel.ts`'s `MinigameCategory` contract (from M14's microkernel design) names 5 categories — `'delivery' | 'puzzle' | 'cooking' | 'defense' | 'assembly'` — but exactly one is built: `packages/minigame-courier-rush` (delivery). The other four categories were named in the type union and never implemented — a real 4/5 gap in the M14 contract this whole architecture was built to satisfy.

The user's direct follow-up in this same session — "please create more minigames! make sure they are outstanding nice!" — set the concrete scope and quality bar: fill the remaining 4 categories, with real production-quality visual polish (particle effects, juicy feedback, satisfying animation), not four thin placeholder loops.

## Design Intent

Build one real minigame per remaining category, each a standalone `@district-cg/minigame-*` package following `minigame-courier-rush`'s exact architecture (a `MinigameManifest` + `MinigameInstance` wrapper around a self-contained canvas-2D game class), registered through the existing `MinigameLoader`, and reachable in-world through a glowing portal placed near the construction node or NPC its theme ties to — exactly like the Courier Rush bike portal already is:

- **`tenant-match`** (puzzle) — a two-round memory-match game, themed around Leo's Legal Fund (lease clauses, code citations, covenants). Portal near the Legal Fund node.
- **`kitchen-rush`** (cooking) — a ticket-sequence cooking game, themed around the Community Kitchen (click pantry ingredients in the correct order before hungry orders time out). Portal near the Kitchen node.
- **`solidarity-line`** (defense) — a 3-lane defense game: place mutual-aid "shields" to turn back displacement pressure before it reaches the Community Land Trust. Portal near the Land Trust node.
- **`tool-workshop`** (assembly) — a conveyor-belt sorting game, themed around Marcus's Tool Library (sort mechanical/electrical/bike parts into the right bin; scrap anything genuinely broken). Portal inside the Tool Library.

All four reuse the same reward contract the existing minigame already established (`GameSessionHostAPI.grantRewards` → cash/trust/energy, or resilience for the defense game), so no new backend or resource-authority work was needed — minigames are, and remain, pure frontend content sitting on top of the existing microkernel.

## Non-Goals

- **No changes to the M14 microkernel/loader architecture itself.** `MinigameLoader`, `MinigameContainer`, and the `MinigameManifest`/`MinigameInstance` contracts were already real and complete from the earlier close-out sprint; this milestone is pure content built on top of them, not infrastructure work.
- **No remote/plugin-store minigames.** All four ship as first-party local packages registered in `main.ts`, exactly like `courier-rush` — the already-real `MinigameLoader.loadRemoteMinigame()` path (for owner-approved third-party minigames) is untouched and unexercised here.
- **No new backend/server-side minigame state.** Same trust model as `courier-rush`: the client runs the whole session and calls `host.grantRewards()` at the end; nothing is persisted server-side about a minigame session beyond the resulting resource deltas already flowing through the existing save path.
- **No unit tests for the new game classes.** This matches the pre-existing, zero-coverage precedent of `packages/minigame-courier-rush` itself (no `.test.ts` file anywhere in that package) — canvas-driven `requestAnimationFrame` game loops with pointer-event input aren't something this project's existing testing conventions cover, for the original minigame or these four.
