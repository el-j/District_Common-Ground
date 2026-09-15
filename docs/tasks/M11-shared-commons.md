# M11 — Shared Commons, Climate Displacement & Community Defense

Stories: `docs/stories/EPIC-11-shared-commons.md`
Planning: `docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md`

## New Construction Nodes
- [x] `useGameStore.ts` — add `toolLibraryProgress: number`, `landTrustProgress: number` to commons
- [x] Node D: Community Tool Library (East Canal) — interactive node in WorldScene; 20% upkeep reduction wired in EconomyMath
- [x] Node E: Community Land Trust — interactive node in WorldScene
- [x] `WorldScene.ts` — Node D and Node E added as construction nodes
- [x] `ConstructionModal.ts` — extended to cover all 5 nodes (BuildProgressKey includes toolLibraryProgress + landTrustProgress)

## Climate Migration Events
- [x] New crisis archetype: `MIGRATION_SANCT` scenarios in `crisis_scenarios.json` (3 authored: ice-raid-threat, sanctuary-council-vote, refugee-housing-crisis)
- [x] When $M_\text{migrant} > 1.5$ → trigger migration event at North Transit Hub
- [x] Solidarity resolution: +30% construction speed (buff multiplier), unlock Greenhouse node
- [x] Scapegoat resolution: police militarisation visual (extra dark filter), −15 trust

## Community Defense Actions
- [x] Discoverable flyer objects in alley tiles (generated when `COMMUNITY_DIVISION` event active)
- [x] Proximity action: "Tear down flyer [E]" → +5 Trust, −2 Energy, flyer disappears
- [x] Counter-organise public rebuttal crisis option → −20 Energy, Trust +25
- [x] Alert community network option → Stress −10 across block

## Global Solidarity Pool (Go Backend)
- [x] `apps/api/internal/save/solidarity_pool.go` — queries an aggregate from `crisis_log`. **Fixed 2026-09-15:** added `HandleRecordCrisisChoice` (`POST /api/v1/district/crisis-log`, auth required) which `INSERT`s a real row every time a player resolves a crisis, wired from `CrisisEngine.ts`'s `resolveCrisis()` via `apps/web/src/api/endpoints/district.ts` (fire-and-forget, matches the "local state is authoritative" convention). Proven end-to-end (not just fixture-seeded) by `TestHandleRecordCrisisChoice_EndToEnd_ChangesAggregate` in `solidarity_pool_test.go`, which POSTs through the real handler and asserts the very next `GET /api/v1/district/resilience` reflects it. See [`M11-FOLLOWUP-solidarity-pool-and-safe-haven.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md) for the full history of the gap.
- [x] `GET /api/v1/district/resilience` — returns global community index — endpoint is real, tested, and now genuinely fed by real gameplay; "(cached 1h)" is still only a `Cache-Control` response header, not actual server-side caching — every request still hits the DB (unchanged, not a correctness issue).
- [x] `TopHUD.ts` — "District Pulse" badge: global solidarity tier shown as coloured dot — now reflects real aggregate player behaviour.

## End-of-Month Assembly
- [x] Monthly trigger: every 30 days → `TownHallAssembly.ts` modal with 3 policy votes
- [x] Vote result affects global index for next month
- [x] Outcomes logged in `historyLog`

## Tests
- [x] "Safe Haven" banner on Land Trust completion — **built 2026-09-15**: `commons.safeHavenUnlocked` flips true exactly once, the moment `landTrustProgress` first reaches 100 (`actions.ts`'s `updateCommonsProgress`, covered by 3 new tests in `actions.test.ts`); `WorldScene.ts`'s `checkSafeHaven()` (polled in `update()`, same pattern as `checkCrisis()`/`checkAssembly()`) shows the new `SafeHavenBanner.ts` one-time celebratory modal.
- [ ] Manual: tear down flyer → trust +5, flyer tile removed (code confirmed correct — `+5 Trust`/`-2 Energy`/flyer destroyed all present — this just needs eyeballing in a real browser)
- [x] Go httptest: `/api/v1/district/resilience` returns valid global index, and (as of 2026-09-15) `TestHandleRecordCrisisChoice_EndToEnd_ChangesAggregate` proves the aggregate now moves in response to a real POST, not just a fixture-seeded row.
