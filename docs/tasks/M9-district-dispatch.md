# M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Stories: `docs/stories/EPIC-09-district-dispatch.md`
Planning: `docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md`, `docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`

## Go Backend Tasks
- [ ] `apps/api/internal/pulse/news.go` — RSS/JSON ingestion from civic feeds
- [ ] Crisis archetype classifier: 7 categories from keywords (`LABOR_TRANSIT`, `CLIMATE_EXTREME`, `HOUSING_SPECULATE`, `FOOD_HEALTH`, `CIVIC_DISINFO`, `MIGRATION_SANCT`, `FASCIST_AGITATION`)
- [ ] `apps/api/internal/narrative/client.go` — Multi-provider AI client:
  - Ollama local endpoint support (`/api/chat` with `llama3.2:3b`)
  - OpenAI-compatible cloud support (Groq / Cloudflare / HuggingFace free tiers)
  - Configurable via `AI_PROVIDER`, `AI_MODEL`, `AI_ENDPOINT`, `AI_API_KEY`
- [ ] `apps/api/internal/narrative/prompts.go` — Lore-anchored system prompts + character voice pillars + JSON schema definition
- [ ] `apps/api/internal/narrative/validator.go` — JSON schema verification + hard mathematical clamping of stat deltas
- [ ] `apps/api/internal/narrative/cache.go` — Database persistence in `dynamic_scenarios` table
- [ ] `GET /api/v1/pulse/news` and `GET /api/v1/narrative/daily-scenarios` endpoints
- [ ] Curated vault: 25+ evergreen fallback scenarios in `crisis_scenarios.json` for 100% offline play

## Frontend Tasks
- [ ] `BroadsheetModal.ts` — "The Daily District Ground" UI
  - CSS 3D unfold animation (rotateX 90° → 0°, 400ms)
  - Newsprint texture (CSS background: repeating halftone SVG)
  - Real-world headline citation badge with source pill
  - Sections: dynamic headline story, barometer row, NPC street quote, 4×4 mini-crossword (+5 energy on solve)
- [ ] `RadioWidget.ts` — "Radio Free Commons" pirate FM tuner
  - SVG analog dial + needle indicator
  - 3 frequencies with label + audio profile switch
  - White noise static during tuning (bandpass audio node)
  - Amber LED display showing frequency + scrolling breaking news ticker
- [ ] `advanceDay()` → trigger BroadsheetModal before new day begins (not blocking)
- [ ] Dynamic NPC Rumor Mill (`NPCEntity.ts` & `DialogueOverlay.ts`):
  - Fetches daily NPC gossip array from API
  - Replaces static one-liners with dynamic commentary on current inflation, recent crisis outcome, and district bloom state
  - Offline fallback to authored archetype lines

## Tests
- [ ] Vitest: BroadsheetModal renders dynamic scenario JSON without throwing
- [ ] Vitest: CrisisEngine parses and applies dynamic AI scenario stat deltas within clamp bounds
- [ ] Go test: `validator_test.go` verifies malformed or out-of-bounds LLM responses are rejected
- [ ] Go httptest: `/api/v1/narrative/daily-scenarios` returns valid scenario matching schema
- [ ] Go httptest: fallback to curated vault works when AI provider returns 500 or times out
- [ ] Manual: advance day → broadsheet unfolds with dynamic story → close → talk to Sal → hear dynamic rumor
