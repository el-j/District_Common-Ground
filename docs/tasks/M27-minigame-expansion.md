# M27 — Minigame Expansion

Story: [`docs/stories/EPIC-27-minigame-expansion.md`](../stories/EPIC-27-minigame-expansion.md)

Planning: none new under `docs/planning/` — fills the remaining 4 categories of the pre-existing `docs/planning/14-DYNAMIC-MICROKERNEL-AND-EXTENSIBLE-MINIGAMES.md` contract; fourth of the 5-part M24–M28 follow-up sequence, scoped ad hoc matching the M21–M26 precedent.

Status: **Implemented 2026-09-17.** All sections built and tested; full verification suite green (see below).

## Section 1 — Four new standalone minigame packages

Each mirrors `packages/minigame-courier-rush`'s exact shape: `package.json`/`tsconfig.json`/`vite.config.ts`/`index.html` dev harness, a `src/index.ts` exporting a `MinigameManifest` + `MinigameInstance` wrapper, and a self-contained canvas-2D game class implementing its own `requestAnimationFrame` loop, particle system, and HUD — no shared game-engine dependency beyond `@district-cg/shared-types`.

- [x] `packages/minigame-tenant-match` (category: `puzzle`) — **Tenant Rights Match**: a two-round memory-match game (4×4 then 4×5) with a fake-3D card-flip animation (horizontal-scale trick), sparkle-burst particles on a match, and a combo/time-bonus scoring loop.
- [x] `packages/minigame-kitchen-rush` (category: `cooking`) — **Community Kitchen Rush**: sequential ingredient-click orders against a countdown per ticket, escalating recipe length over the session, with steam/sparkle feedback and a screen-shake on a wrong ingredient.
- [x] `packages/minigame-solidarity-line` (category: `defense`) — **Solidarity Line**: a 3-lane defense game where a regenerating "solidarity meter" lets the player place mutual-aid shields that weaken and dissolve incoming "displacement pressure" tokens before they reach the Land Trust building; a life/morale system with a escalating wave difficulty.
- [x] `packages/minigame-tool-workshop` (category: `assembly`) — **Tool Library Workshop**: a scrolling conveyor-belt sorting game — click the correct bin (mechanical/electrical/bike/scrap) while a part sits in the pickup zone, with a "broken" variant that must always go to scrap regardless of category, testing attention as well as reflexes.

## Section 2 — Wiring into the existing microkernel and world

- [x] `apps/web/package.json`: 4 new workspace dependencies added (`@district-cg/minigame-{tenant-match,kitchen-rush,solidarity-line,tool-workshop}`), `npm install` run at the repo root to symlink them.
- [x] `apps/web/src/main.ts`: 4 new `MinigameLoader.registerLocalMinigame()` calls, mirroring the existing `courier-rush` registration exactly.
- [x] `apps/web/src/world/WorldScene.ts`: a new generic `minigamePortals` array (id/label/emoji/color/position) driving marker-circle rendering, bounce-bubble proximity prompts, `[E]`-to-launch action-button wiring, and a shared `launchWorldMinigame(id)` method — built as one small reusable structure rather than copy-pasting the bike-portal's bespoke fields 4 times, since 4 near-identical portals crossed the threshold where that abstraction pays for itself. Each portal is placed near the construction node or NPC its theme ties to (see EPIC-27 for the mapping) and verified against `buildMap()`'s actual wall/floor layout so every portal sits on real walkable ground, not inside a wall a player could never reach.
- [x] The pre-existing `courier-rush` bike portal is untouched — it keeps its own dedicated fields and `launchCourierRush()` method exactly as before; the new generic path is additive, not a refactor of working code.

## Architecture notes / non-goals

See [EPIC-27](../stories/EPIC-27-minigame-expansion.md) for the full non-goals list. In short: this is content built on top of the already-complete M14 microkernel (`MinigameLoader`/`MinigameContainer`/manifest contracts), not new infrastructure — and it carries no backend changes, since minigames only ever call the existing `GameSessionHostAPI.grantRewards()` at session end, exactly like `courier-rush` already does.

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd packages/minigame-tenant-match && npx tsc --noEmit` / same for `minigame-kitchen-rush`, `minigame-solidarity-line`, `minigame-tool-workshop` — all 4 clean standalone.
3. `cd apps/web && npm test` — 384/384 passed, full existing suite green, no regressions (no new frontend unit tests added — see non-goals: this matches `minigame-courier-rush`'s own pre-existing zero test-file precedent).
4. `cd apps/web && npx oxlint src/` — clean.
5. No Go changes this milestone — backend suite untouched.
