# M8 — Living Economy & District Pulse Engine

Stories: `docs/stories/EPIC-08-living-economy.md`
Planning: `docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md`

## Go Backend Tasks
- [x] Create `apps/api/internal/pulse/` package (`economy.go` + `types.go`)
- [x] `economy.go` — `DistrictPulseState` struct; sinusoidal seasonal multipliers; 24h in-memory cache with `sync.RWMutex`
- [x] `economy.go` — fail-safe defaults (all multipliers = 1.0) via `seasonalFallback()` when fetch fails
- [x] `news.go` stub — placeholder returning empty news array (full impl in M9)
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
