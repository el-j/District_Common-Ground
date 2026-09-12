# EPIC-11 — The Shared Commons, Climate Migration & Anti-Fascist Defense

**Agent roles:** game-designer, narrative-designer, engineering-backend-architect  
**Planning docs:** `docs/planning/06-TECHNICAL-ROADMAP-M8-M12.md`, `docs/planning/07-CLIMATE-MIGRATION-AND-ANTI-FASCISM.md`

## Vision
Players' collective solidarity choices pool into a global district health index. Climate migrants arrive at the North Station; welcoming them unlocks new construction capacity. Far-right propaganda appears in alleys; players can tear it down.

## New Construction Nodes
- **Node D: Community Tool Library** (East Canal) — reduces appliance repair & vehicle upkeep
- **Node E: Community Land Trust** — locks buildings against corporate buyout; unlocks "Safe Haven" ending

## Climate Migration Mechanic
- $M_\text{migrant}$ triggers newcomer arrival events at North Transit Station
- Scapegoat path: Police militarisation, population decline, vulnerability to next shock, world desaturates
- Solidarity path: +30% labour capacity, unlocks Rooftop Agro-Greenhouse + Bilingual Care Network, world blooms

## Anti-Fascist Defense Engine
- Disinformation events: slipped leaflets, AI-generated viral hoaxes, far-right "town halls" in nearby venues
- Player counter-actions:
  - Tear down hate flyers in alleys: +5 Trust, −2 Energy
  - Counter-organise public rebuttal: −20 Energy, Trust +25
  - Alert the community fridge network: Stress −10 across block

## Global Solidarity Pool (Go Backend)
- `internal/save/solidarity_pool.go` — aggregates anonymous solidarity decisions across all players
- `GET /api/v1/district/resilience` — returns global community index
- Frontend: subtle "District Pulse" badge on HUD showing global solidarity tier

## End-of-Month Assembly
- Monthly Town Hall modal: players vote on neighbourhood policy initiatives
- Choices affect global index for all players in the district

## Acceptance Criteria
- **Test 11.1:** Global solidarity index updates without blocking local gameplay
- **Test 11.2:** Completing Community Land Trust unlocks "Safe Haven" ending
- **Test 11.3:** Tearing down a hate flyer updates Trust + emits confirmation sound
