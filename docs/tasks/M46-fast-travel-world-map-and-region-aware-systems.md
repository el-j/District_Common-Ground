# M46 — Fast Travel, World Map UI & Region-Aware Systems

Story: [`docs/stories/EPIC-35-open-world-regions-and-travel.md`](../stories/EPIC-35-open-world-regions-and-travel.md)

Planning: [`docs/planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md`](../planning/21-OPEN-WORLD-CRAFTING-BUILDINGS-AND-IDENTITY-VISION.md) — Pillar 3.

Status: **Implemented 2026-09-19.** Completes EPIC-35.

## Section 1 — World/region map UI

- [x] New `apps/web/src/ui/WorldMapModal.ts` showing every region (locked or not) with a Travel button for unlocked ones. **Deviation, recorded not silent:** uses the `.settings-panel`/`.shop-grid`/`.shop-card` shell (already `--ui-*`-token-driven via M22's Skin UI Kit) rather than the bare `.ui-panel` class this doc originally named — every other modal built across this session's milestones already standardized on that shell, and it's a more complete surface than `.ui-panel` alone; reusing the *established* convention, in the spirit of this section's own "rather than inventing new UI chrome" intent.
- [x] Entry point: a new "🗺 World Map" button in `TopHUD`'s secondary group (menu drawer), following `registerButton()`'s existing pattern exactly.
- [x] **Real cross-scene mechanism, built to make travel from a DOM modal possible at all**: `WorldScene` gained a static `activeTravelHandler` registry (`setActiveTravelHandler()`/`requestTravel()`) — the same "static registry a sibling scene/DOM component can reach" shape the existing `hud` static field already established. Whichever of `WorldScene`/`RegionScene` is currently awake registers itself; `WorldMapModal.ts` calls `WorldScene.requestTravel(regionId)` without needing to know which scene is active. `WorldScene.travelToPlaceholderRegion()` (M44) was generalized to `travelToRegionScene(targetRegionId)`, accepting any unlocked region instead of one hardcoded destination — the rail-platform node now calls it with an explicit id too.

## Section 2 — Region unlock gating

- [x] `Region.unlockCondition` (M44's flavor text) is joined by a real `unlockRule: RegionUnlockRule` — a small discriminated union (`'always' | 'trust' | 'resilienceScore' | 'questCompleted'`) evaluated by a new pure `isRegionUnlocked(rule, ctx)` function, consistent with the game's existing values (trust/resilience/quest — never currency, per EPIC-35's own non-goal). `REGION_INDUSTRIAL_OUTSKIRTS` is gated on `trust >= 20` — a real, archetype-sensitive bar (Arthur's low starting trust starts below it, Pip/Morgan above), not a trivially-always-true placeholder. Enforcement lives in `WorldScene.travelToRegionScene()` itself (the actual choke point), not just hidden in the UI — a locked region rejects a direct rail-node interaction too, shown as "Locked 🚉 (needs 20 trust)".

## Section 3 — Region-aware crisis/economy scenario tagging

- [x] `CrisisScenario` (`CrisisEngine.ts`) gained an optional `region?: string` field (kept as `string`, not `RegionData.ts`'s `RegionId` — the same "core/ never imports world/" reasoning every other cross-layer id in this codebase already follows). `checkForCrisis()`'s pool-draw now prefers a region-tagged scenario for the player's current region *after* the existing migrant-pressure priority check (never overriding it, never restricting the pool — the same non-starving principle M23 §1's reshuffle fix already established). `crisis_scenarios.json`'s `warehouse-displacement` ("The Distribution Centre Comes to Town," already `LABOR_TRANSIT`-archetyped) is tagged `"region": "REGION_INDUSTRIAL_OUTSKIRTS"` as the first real example — a genuine content fit, not an arbitrary pick, chosen over authoring new scenario content (out of scope for wiring the mechanism).

## Architecture notes / non-goals

See [EPIC-35](../stories/EPIC-35-open-world-regions-and-travel.md)'s epic-wide non-goals — no currency-gated travel, no per-region save sharding. `RegionScene.ts`'s own travel-handler registration only routes a request back to Common Ground (no direct region-to-region travel between two non-Common-Ground regions in v1 — there's only one such region to test this against anyway; recorded as a scope limit for whenever a 3rd region exists, not an oversight).

## Verification

1. `cd apps/web && npx tsc --noEmit` — clean.
2. `cd apps/web && npx vitest run` — 554/554 passing (6 new: `RegionData.test.ts`'s `isRegionUnlocked()` coverage for all 4 rule types, `CrisisEngine.test.ts`'s region-preference-vs-migrant-priority-vs-no-match tests grounded in the real tagged `warehouse-displacement` scenario).
3. `cd apps/web && npx oxlint src/` — clean.
4. `cd apps/web && npm run build` — clean production build (159 modules).
5. Live via the Vite dev server (no Docker rebuild needed — no backend changes this milestone): confirmed all 6 changed/new source files plus the updated `crisis_scenarios.json` data file return HTTP 200. A pre-existing jsdom/Phaser test crash was fixed along the way: `TopHUD.test.ts` (which now transitively imports `WorldScene.ts` via the new World Map button) needed a `WorldScene` mock, the same pattern `InputManager`'s own Phaser-module-load crash already required elsewhere. The full interactive open-map → see locked/unlocked regions → travel → confirm a region-tagged crisis can trigger round trip stays manual, the same limitation flagged for M41/M44/M45.
