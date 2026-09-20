# EPIC-09 — "The District Dispatch" & Dynamic AI Narrative Engine

**Agent roles:** narrative-designer, engineering-backend-architect, engineering-frontend-developer, game-designer  
**Planning docs:** `docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md`, `docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`

## Vision
Real civic news, climate feeds, and economic shifts are dynamically synthesized into street-level dilemmas and fresh NPC street gossip using a zero-cost, open-weight AI model pipeline (Ollama / Groq / Cloudflare / Hugging Face). The neighborhood never repeats the same canned lines, while strict programmatic guardrails protect game balance and theme.

## Crisis Archetypes (7 categories)
`LABOR_TRANSIT` · `CLIMATE_EXTREME` · `HOUSING_SPECULATE` · `FOOD_HEALTH` · `CIVIC_DISINFO` · `MIGRATION_SANCT` · `COMMUNITY_DIVISION`

## Go Backend Tasks (Dynamic AI Engine)
- `apps/api/internal/pulse/news.go` — RSS ingestion, keyword classification into 7 archetypes
- `apps/api/internal/narrative/client.go` — Generic client supporting free AI providers:
  - **Ollama** (`llama3.2:3b` / `qwen2.5:3b`) for local/offline dev
  - **Groq** (`llama-3.3-70b-versatile`) free tier for ultra-fast generation
  - **Cloudflare Workers AI / HuggingFace** serverless free tiers
  - **Deterministic Vault Fallback** for zero-network/offline environments
- `apps/api/internal/narrative/prompts.go` — System prompts with Character Voice Pillars (Sal, Elena, Mira, Leo, Arthur) and strict Solidarity vs. Scapegoating framework
- `apps/api/internal/narrative/validator.go` — Enforces JSON schema and clamps all stat deltas (Cash [-$50, +$100], Energy [-$35, 0], Trust/Resilience [-30, +35])
- Database caching: store generated daily scenarios in PostgreSQL `dynamic_scenarios` table
- `GET /api/v1/pulse/news` and `GET /api/v1/narrative/daily-scenarios` endpoints

## Frontend Tasks
- `BroadsheetModal.ts` — "The Daily District Ground" morning paper UI
  - CSS 3D unfold animation (folded → open), newsprint texture, halftone pattern
  - Real-world headline citation badge with source attribution
  - Sections: Main Dynamic Headline, The Barometer (economic weather), Street Interview (dynamic NPC quote), Mini-puzzle (4×4 crossword → +5 energy)
- `RadioWidget.ts` — "Radio Free Commons" pirate FM tuner
  - Vintage faceplate, analog needle, tuning knob
  - 3 frequencies: Radio Free Commons (lo-fi), Civil Defense (alerts), Pirate Dispatch (jazz + crisis)
  - Amber LED frequency display, dial-click audio, live scrolling emergency news ticker
- `NPCEntity.ts` & `DialogueOverlay.ts` Dynamic Rumor Mill:
  - Consumes dynamic daily NPC banter reacting to recent crisis choices and economic indices
  - Offline fallback to authored role-specific lines

## Acceptance Criteria
- **Test 9.1:** Advancing to new day → morning paper displays dynamically synthesized, news-grounded crisis scenario
- **Test 9.2:** All AI-generated scenario stat deltas stay strictly within balance bounds (no infinite money/health)
- **Test 9.3:** If AI provider is unreachable or times out (>3.5s), system instantly falls back to curated offline vault without player-facing error
- **Test 9.4:** Talking to Sal, Elena, or Mira displays dynamic street rumors referencing current district conditions
- **Test 9.5:** Solidarity/scapegoat choice logged with real-world context in Town Hall archive
