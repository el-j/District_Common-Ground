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
- [x] `apps/api/internal/save/solidarity_pool.go` — queries an aggregate from `crisis_log` — **the table it reads is never populated in production.** No code path anywhere (`actions.ts`, `CrisisEngine.ts`, or any Go handler) ever `INSERT`s into `crisis_log`; the only `INSERT INTO crisis_log` in the whole repo is inside `solidarity_pool_test.go`'s own test setup. Frontend crisis choices only mutate local Zustand state, persisted as one opaque JSONB blob via `/api/v1/save` — never as normalized per-choice rows. **Net effect: in real gameplay this endpoint always returns its neutral default, regardless of what any player does.** It "works" only inside its isolated unit test. See [`M11-FOLLOWUP-solidarity-pool-and-safe-haven.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md).
- [x] `GET /api/v1/district/resilience` — returns global community index — endpoint is real and tested, but see above; "(cached 1h)" is a `Cache-Control` response header only, not actual server-side caching — every request still hits the DB.
- [x] `TopHUD.ts` — "District Pulse" badge: global solidarity tier shown as coloured dot (renders correctly, but per above will always show the neutral-default tier in practice)

## End-of-Month Assembly
- [x] Monthly trigger: every 30 days → `TownHallAssembly.ts` modal with 3 policy votes
- [x] Vote result affects global index for next month
- [x] Outcomes logged in `historyLog`

## Tests
- [ ] "Safe Haven" banner on Land Trust completion — reclassified from a manual-test item to a **genuine missing feature** (audit 2026-09-15): no banner, ending state, or `landTrustProgress`-completion trigger of any kind exists in `actions.ts`, `CrisisEngine.ts`, or `WorldScene.ts`. EPIC-11's Test 11.2 asserts this as an acceptance criterion. Tracked in [`M11-FOLLOWUP-solidarity-pool-and-safe-haven.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M11-FOLLOWUP-solidarity-pool-and-safe-haven.md).
- [ ] Manual: tear down flyer → trust +5, flyer tile removed (code confirmed correct — `+5 Trust`/`-2 Energy`/flyer destroyed all present — this just needs eyeballing in a real browser)
- [x] Go httptest: `/api/v1/district/resilience` returns valid global index (test is real and passes; see the Global Solidarity Pool note above for why the endpoint is hollow in actual gameplay)
