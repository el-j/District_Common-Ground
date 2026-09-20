# EPIC-08 — The Living Economy & District Pulse Engine

**Agent roles:** economy-designer, engineering-backend-architect, engineering-frontend-developer  
**Planning doc:** `docs/planning/02-LIVING-ECONOMY-AND-REAL-DATA.md`

## Vision
Connect in-game daily resource flows to normalized macroeconomic data feeds. When real food prices spike or energy tariffs climb, the district residents feel it. Community-built Commons absorb the shocks.

> **Re-scoped 2026-09-15 (audit + follow-up):** the table below was this milestone's original real-data pitch. It was never built — no HTTP client, no API key config, no fetch attempt to any of these sources exists anywhere in the repo. What exists instead is a well-built, tested, **fully synthetic** sinusoidal seasonal model (`apps/api/internal/pulse/economy.go`'s `seasonalFallback()`) that produces sensible seasonal variation for all 6 indices (food/energy/heat/migrant already varied; wage/transit were a permanent `1.0` no-op until fixed the same day). Real external data integration is **formally deferred, not planned near-term** — this table now documents the original real-data ambition for reference, not what's running today. See [`M8-FOLLOWUP-live-data-feeds.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M8-FOLLOWUP-live-data-feeds.md) if that decision ever needs revisiting.

## Data Sources (aspirational — not built; see re-scope note above)
| Index | Source | Multiplier Range | Gameplay Effect |
|---|---|---|---|
| Food | BLS CPI-U / Eurostat HICP | $M_\text{food} \in [0.8, 1.5]$ | Grocer prices, kitchen upkeep |
| Energy | EIA Short-Term / ENTSO-E | $M_\text{energy} \in [0.7, 1.8]$ | Heating bill, appliance cost |
| Gig Wages | Open Gig Pay Index | $M_\text{wage} \in [0.75, 1.4]$ | Pip courier payouts |
| Transit | GTFS-RT alerts | $M_\text{transit} \in [0.5, 1.5]$ | Morgan commute friction |
| Heat Anomaly | NOAA GISTEMP | $M_\text{heat} \in [1.0, 2.2]$ | Heat dome crises, cooling demand |
| Displacement | UNHCR Open Data | $M_\text{migrant} \in [0.8, 2.5]$ | Newcomer arrival events |

## Go Backend Tasks
- `apps/api/internal/pulse/economy.go` — **synthetic** seasonal indices (no live fetch), 24h in-memory cache
- `GET /api/v1/pulse/economy` endpoint — returns `DistrictPulseState` JSON
- `GET /api/v1/pulse/climate` endpoint — heat + displacement indices
- `packages/shared-types/src/index.ts` — `DistrictPulseState`, `EconomicMultipliers` types

## Frontend Tasks
- `EconomyMath.ts` — dynamic daily upkeep using live multipliers; commons mitigation logic
- Archetype earning: Pip courier jobs scale with $M_\text{wage}$; Morgan salary offset by $M_\text{transit}$; Arthur rent balance
- Offline fallback: client-side sinusoidal seasonal wave generator
- `TopHUD.ts` — compact Economic Barometer widget (↑ food / ↑ energy icons + tier colour)

## Acceptance Criteria
- **Test 8.1:** $M_\text{food} = 1.30$ → grocer upkeep up 30%; community kitchen built → food upkeep $0
- **Test 8.2:** Network offline → seamless fallback to cached/seasonal indices; no UI errors
- **Test 8.3:** Pip's courier payouts scale accurately with $M_\text{wage}$
