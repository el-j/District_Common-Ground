# M8 — Living Economy & District Pulse Engine

Stories: `docs/stories/EPIC-08-living-economy.md`
Planning: `docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md`

> **Audit note (2026-09-15), resolved same day:** `GetPulseState()` has no live-fetch code path at all — it *unconditionally* calls `seasonalFallback(time.Now())`. There is no BLS/EIA/Eurostat/GTFS/NOAA/UNHCR fetch anywhere in the codebase, so the "live data vs. fail-safe fallback" distinction this doc and EPIC-08 originally described does not exist in code; the game runs 100% on synthetic seasonal multipliers year-round. **Decision: formally re-scoped as synthetic-only** (Option 2 of the follow-up doc) rather than building a real fetch path — `EPIC-08-living-economy.md`'s Data Sources table now says so plainly instead of implying a fallback for when "the real thing" fails. `Wage`/`Transit`, which were a permanent `1.0` no-op, now have their own real (if coarse) synthetic seasonal curves too, so every multiplier actually varies. See [`M8-FOLLOWUP-live-data-feeds.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M8-FOLLOWUP-live-data-feeds.md) for the full history.

## Go Backend Tasks
- [x] Create `apps/api/internal/pulse/` package (`economy.go` + `types.go`)
- [x] `economy.go` — `DistrictPulseState` struct; sinusoidal seasonal multipliers; 24h in-memory cache with `sync.RWMutex`
- [x] `economy.go` — **fully synthetic seasonal model** via `seasonalFallback()` (formally re-scoped 2026-09-15, no live external fetch exists or is planned); all 6 multipliers now vary by month, including `Wage`/`Transit` which were a permanent `1.0` no-op before
- [x] `news.go` stub — placeholder returning empty news array; real RSS/JSON ingestion formally deferred (mirrors this decision) — see [`M9-FOLLOWUP-narrative-gaps.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M9-FOLLOWUP-narrative-gaps.md)
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
- [x] Go httptest: `/api/v1/pulse/economy` returns 200 with valid JSON (synthetic seasonal path — there is no external fetch to succeed or fail)
- [x] Go test: `TestSeasonalFallback_WageAndTransitVary` (added 2026-09-15) — regression guard proving Wage/Transit actually vary by month and are no longer a permanent `1.0` no-op
