# M11 — Shared Commons, Climate Migration & Anti-Fascist Defense

Stories: `docs/stories/EPIC-11-shared-commons.md`
Planning: `docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md`

## New Construction Nodes
- [x] `useGameStore.ts` — add `toolLibraryProgress: number`, `landTrustProgress: number` to commons
- [x] Node D: Community Tool Library (East Canal) — interactive node in WorldScene; 20% upkeep reduction not yet wired in EconomyMath
- [x] Node E: Community Land Trust — interactive node in WorldScene
- [x] `WorldScene.ts` — Node D and Node E added as construction nodes
- [x] `ConstructionModal.ts` — extended to cover all 5 nodes (BuildProgressKey includes toolLibraryProgress + landTrustProgress)

## Climate Migration Events
- [ ] New crisis archetype: `MIGRATION_SANCT` scenarios in `crisis_scenarios.json` (3 authored)
- [ ] When $M_\text{migrant} > 1.5$ → trigger migration event at North Transit Hub
- [ ] Solidarity resolution: +30% construction speed (buff multiplier), unlock Greenhouse node
- [ ] Scapegoat resolution: police militarisation visual (extra dark filter), −15 trust

## Anti-Fascist Defense Actions
- [ ] Discoverable flyer objects in alley tiles (generated when `FASCIST_AGITATION` event active)
- [ ] Proximity action: "Tear down flyer [E]" → +5 Trust, −2 Energy, flyer disappears
- [ ] Counter-organise public rebuttal crisis option → −20 Energy, Trust +25
- [ ] Alert community network option → Stress −10 across block

## Global Solidarity Pool (Go Backend)
- [x] `apps/api/internal/save/solidarity_pool.go` — aggregate anonymous solidarity choices from crisis_log
- [x] `GET /api/v1/district/resilience` — returns global community index (cached 1h)
- [ ] `TopHUD.ts` — "District Pulse" badge: global solidarity tier shown as coloured dot

## End-of-Month Assembly
- [ ] Monthly trigger: every 30 days → `TownHallAssembly.ts` modal with 3 policy votes
- [ ] Vote result affects global index for next month
- [ ] Outcomes logged in `historyLog`

## Tests
- [ ] Manual: complete Land Trust → "Safe Haven" banner displays
- [ ] Manual: tear down flyer → trust +5, flyer tile removed
- [ ] Go httptest: `/api/v1/district/resilience` returns valid global index
