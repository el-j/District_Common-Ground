# M8 Follow-up — Real Live-Data Feeds for the District Pulse Engine

Found: 2026-09-15, full repo audit
Status: `[x] Resolved` — Option 2 (re-scope, not build) chosen 2026-09-15; see `docs/SPRINT-2026-09-15-PLAN.md` §5.
Parent: [`M8-living-economy.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M8-living-economy.md)

---

## The Gap

`apps/api/internal/pulse/economy.go`'s `GetPulseState()` unconditionally calls `seasonalFallback(time.Now())`. There is no HTTP client, no API key config, no fetch attempt to any external data source anywhere in the repo. `EPIC-08-living-economy.md`'s entire "Data Sources" table (BLS/EIA/Eurostat cost-of-living and energy indices, NOAA climate/heat data, GTFS transit data, UNHCR displacement data) describes a live-data system that was never built — only the synthetic sinusoidal fallback exists, dressed up as a "fail-safe default."

This isn't a functional bug — the sinusoidal fallback is well-built, tested, and produces sensible seasonal variation (food peaks winter, energy peaks summer). But the game's core pitch ("real-world macroeconomic indices drive gameplay") is not actually true today; the district's economy never reflects the real world, only the calendar.

## Why This Matters

- Player-facing claims in the design docs (and potentially marketing/README copy) describe real-world data driving the simulation. If that's still the intended pitch, it needs building. If it was a deliberate simplification, the docs should say so explicitly instead of implying "fallback for when the real thing fails."
- `Wage`/`Transit` are hardcoded to exactly `1.0` forever — these two multipliers currently do nothing at all in gameplay (every multiplication by 1.0 is a no-op). Confirm whether that's intended or whether they were meant to eventually vary with real GTFS/BLS data.

## Options to Resolve

1. **(Recommended if the live-data pitch matters)** Build the real fetch path: pick one real free/no-key data source per index (e.g., Open-Meteo already proven working in M17's `plugin-geo-weather` for a precedent on the fetch/cache/fallback shape), wire a `fetchLiveIndices(ctx) (*DistrictPulseState, error)` that `GetPulseState()` tries first, falling back to `seasonalFallback()` only on error — matching what this doc already (incorrectly) claimed was built.
2. **(Recommended if scope should just be corrected)** Formally re-scope M8 as "synthetic seasonal economy, real-data integration deferred" — update `EPIC-08-living-economy.md`'s Data Sources table to say so plainly, and drop `Wage`/`Transit` from `EconomicMultipliers` if they'll never vary (or wire at least one of them to something real, even coarse, e.g. a static seasonal transit-cost curve like the others).
3. Do nothing (status quo) — acceptable short-term (nothing is broken, the fallback is genuinely good), but the doc/EPIC should stop describing unbuilt data pipelines as done.

## Acceptance Criteria

- [x] Decided Option 2 (re-scope docs honestly) — no concrete near-term need for a real pipeline surfaced.
- [x] `EPIC-08-living-economy.md` and `M8-living-economy.md` no longer imply real external fetches exist; both explicitly state the model is fully synthetic and real integration is deferred.
- [x] `Wage`/`Transit` got real (coarse) seasonal curves (`economy.go`) instead of a permanent `1.0` no-op — wage dips in the post-holiday trough, transit ticks up in winter — both already consumed by `EconomyMath.ts`'s earning/commute-penalty math, so this is a real gameplay change, not just a cosmetic number.
- [x] `go test -race -short ./...` passes with no regressions; new `TestSeasonalFallback_WageAndTransitVary` guards against this becoming a no-op again.
