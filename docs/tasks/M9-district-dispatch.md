# M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Stories: `docs/stories/EPIC-09-district-dispatch.md`
Planning: `docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md`, `docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`

## Go Backend Tasks
- [x] `apps/api/internal/pulse/news.go` — RSS/JSON ingestion from civic feeds (+ 7-archetype keyword classifier)
- [x] Crisis archetype classifier: 7 categories from keywords (`LABOR_TRANSIT`, `CLIMATE_EXTREME`, `HOUSING_SPECULATE`, `FOOD_HEALTH`, `CIVIC_DISINFO`, `MIGRATION_SANCT`, `COMMUNITY_DIVISION`)
- [x] `apps/api/internal/narrative/client.go` — Multi-provider AI client:
  - Ollama local endpoint support (`/api/chat` with `llama3.2:3b`)
  - OpenAI-compatible cloud support (Groq / Cloudflare / HuggingFace free tiers)
  - Configurable via `AI_PROVIDER`, `AI_MODEL`, `AI_ENDPOINT`, `AI_API_KEY`
- [x] `apps/api/internal/narrative/prompts.go` — Lore-anchored system prompts + character voice pillars + JSON schema definition
- [x] `apps/api/internal/narrative/validator.go` — JSON schema verification + hard mathematical clamping of stat deltas
- [x] `apps/api/internal/narrative/cache.go` — Database persistence in `dynamic_scenarios` table
- [x] `GET /api/v1/pulse/news` and `GET /api/v1/narrative/daily-scenarios` endpoints
- [x] Curated vault: 25+ evergreen fallback scenarios in `crisis_scenarios.json` for 100% offline play

## Frontend Tasks
- [x] `BroadsheetModal.ts` — "The Daily District Ground" UI
  - CSS 3D unfold animation (rotateX 90° → 0°, 400ms)
  - Newsprint texture (CSS background: repeating halftone SVG)
  - Real-world headline citation badge with source pill
  - Sections: dynamic headline story, barometer row, NPC street quote, 4×4 mini-crossword (+5 energy on solve)
- [x] `RadioWidget.ts` — "Radio Free Commons" pirate FM tuner
  - SVG analog dial + needle indicator
  - 3 frequencies with label + audio profile switch
  - White noise static during tuning (bandpass audio node)
  - Amber LED display showing frequency + scrolling breaking news ticker
- [x] `advanceDay()` → trigger BroadsheetModal before new day begins (not blocking)
- [x] Dynamic NPC Rumor Mill (`NPCEntity.ts`, `WorldScene.ts`, `narrativeGossip.ts`):
  - Fetches daily NPC gossip from `/api/v1/narrative/daily-scenarios`
  - Session-cached (1h TTL), each NPC gets archetype-matched line
  - "Heard anything lately?" branch injected into NPC dialogue tree at runtime
  - Offline fallback to authored archetype lines per NPC (mira/leo/elena × 7 archetypes)

## Tests
- [x] Vitest: BroadsheetModal renders dynamic scenario JSON without throwing (`BroadsheetModal.test.ts`)
- [x] Vitest: CrisisEngine parses and applies dynamic AI scenario stat deltas within clamp bounds (`CrisisEngine.dynamic.test.ts`)
- [x] Go test: `validator_test.go` verifies malformed or out-of-bounds LLM responses are rejected (16 tests)
- [x] Go httptest: `/api/v1/narrative/daily-scenarios` returns valid scenario matching schema
- [x] Go httptest: fallback returns 200 valid JSON when AI provider returns 500
- [x] Vitest: `narrativeGossip.test.ts` — `pickGossipLine`/`scenariosToGossip` archetype matching + DEFAULT fallback, `fetchDailyGossip`'s network-failure/non-OK fallback and session-cache reuse
- [ ] Manual: advance day → broadsheet unfolds with dynamic story → close → talk to Sal → hear dynamic rumor
