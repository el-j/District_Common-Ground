# M8 — Living Economy & District Pulse Engine

Stories: `docs/stories/EPIC-08-living-economy.md`
Planning: `docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md`

## Go Backend Tasks
- [ ] Create `apps/api/internal/pulse/` package
- [ ] `economy.go` — struct `DistrictPulseState`; fetch+normalize BLS/EIA/NOAA indices; 24h file cache
- [ ] `economy.go` — fail-safe defaults (all multipliers = 1.0) when fetch fails
- [ ] `news.go` stub — placeholder returning empty news array (full impl in M9)
- [ ] `GET /api/v1/pulse/economy` handler wired into chi router
- [ ] `GET /api/v1/pulse/climate` handler (heat + displacement)
- [ ] `packages/shared-types/src/index.ts` — `DistrictPulseState`, `EconomicMultipliers`

## Frontend Tasks
- [ ] `apps/web/src/api/endpoints/pulse.ts` — typed fetch for `/api/v1/pulse/economy`
- [ ] `EconomyMath.ts` — accept `EconomicMultipliers` param; multiply upkeep by food/energy index
- [ ] `EconomyMath.ts` — commons mitigation: kitchen built → food upkeep $0; solar built → energy upkeep $0
- [ ] `EconomyMath.ts` — archetype earning: Pip courier base ×$M_\text{wage}$; Morgan salary −commute penalty ×$M_\text{transit}$
- [ ] Offline fallback: `SeasonalWave.ts` — sinusoidal seasonal generator (food peaks winter, energy peaks summer)
- [ ] `useGameStore.ts` — add `pulseState: DistrictPulseState | null` to GameState
- [ ] `TopHUD.ts` — Economic Barometer chip: food index icon + energy index icon with tier colour (green/amber/red)

## Tests
- [ ] Vitest: `EconomyMath.ts` with $M_\text{food} = 1.3$ and kitchen built → food upkeep = 0
- [ ] Vitest: seasonal wave returns 1.0 in spring, peaks ≥ 1.3 in winter (food)
- [ ] Go httptest: `/api/v1/pulse/economy` returns 200 with valid JSON when external fetch succeeds
- [ ] Go httptest: `/api/v1/pulse/economy` returns fail-safe defaults on network error
