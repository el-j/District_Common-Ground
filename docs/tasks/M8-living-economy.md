# M8 — Living Economy & District Pulse Engine

Stories: `docs/stories/EPIC-08-living-economy.md`
Planning: `docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md`

> **Audit note (2026-09-15):** `GetPulseState()` has no live-fetch code path at all — it *unconditionally* calls `seasonalFallback(time.Now())`. There is no BLS/EIA/Eurostat/GTFS/NOAA/UNHCR fetch anywhere in the codebase, so the "live data vs. fail-safe fallback" distinction this doc and EPIC-08 describe does not exist in code; the game runs 100% on synthetic seasonal multipliers year-round. This was scoped-down silently rather than documented as a scoping note at the time. See [`M8-FOLLOWUP-live-data-feeds.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M8-FOLLOWUP-live-data-feeds.md) for the tracked follow-up (real fetch, or a formal decision to keep it synthetic-only by design).

## Go Backend Tasks
- [x] Create `apps/api/internal/pulse/` package (`economy.go` + `types.go`)
- [x] `economy.go` — `DistrictPulseState` struct; sinusoidal seasonal multipliers; 24h in-memory cache with `sync.RWMutex`
- [x] `economy.go` — fail-safe defaults via `seasonalFallback()`, always active (not just on fetch failure — see audit note above; only `Wage`/`Transit` are pinned at 1.0, `Food`/`Energy`/`Heat`/`Migrant` are sinusoidal even in this "default" path)
- [x] `news.go` stub — placeholder returning empty news array (full impl planned for M9; **still a stub after M9** — see [`M9-FOLLOWUP-narrative-gaps.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M9-FOLLOWUP-narrative-gaps.md))
- [x] `GET /api/v1/pulse/economy` handler wired into chi router
- [x] `GET /api/v1/pulse/climate` handler (heat + displacement)
- [x] `packages/shared-types/src/index.ts` — `DistrictPulseState`, `EconomicMultipliers`

## Frontend Tasks
- [x] `apps/web/src/api/endpoints/pulse.ts` — typed fetch for `/api/v1/pulse/economy`
- [x] `EconomyMath.ts` — accept `EconomicMultipliers` param; multiply upkeep by food/energy index
- [x] `EconomyMath.ts` — commons mitigation: kitchen built → food upkeep $0; solar built → energy upkeep $0
- [x] `EconomyMath.ts` — archetype earning: Pip courier base ×$M_\text{wage}$; Morgan salary −commute penalty ×$M_\text{transit}$
- [x] Offline fallback: `SeasonalWave.ts` — sinusoidal seasonal generator (food peaks winter, energy peaks summer)
- [x] `useGameStore.ts` — add `pulseState: DistrictPulseState | null` to GameState
- [x] `TopHUD.ts` — Economic Barometer chip: food index icon + energy index icon with tier colour (green/amber/red)

## Tests
- [x] Vitest: `EconomyMath.ts` with $M_\text{food} = 1.3$ and kitchen built → food upkeep = 0
- [x] Vitest: seasonal wave returns 1.0 in spring, peaks ≥ 1.3 in winter (food)
- [x] Go httptest: `/api/v1/pulse/economy` returns 200 with valid JSON when external fetch succeeds
- [x] Go httptest: `/api/v1/pulse/economy` returns fail-safe defaults on network error
