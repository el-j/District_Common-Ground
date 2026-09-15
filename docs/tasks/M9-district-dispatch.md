# M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Stories: `docs/stories/EPIC-09-district-dispatch.md`
Planning: `docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md`, `docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`

> **Audit note (2026-09-15):** several items below were checked off without matching code. See [`M9-FOLLOWUP-narrative-gaps.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M9-FOLLOWUP-narrative-gaps.md) for the real remaining work; corrections inline below.

## Go Backend Tasks
- [ ] `apps/api/internal/pulse/news.go` — RSS/JSON ingestion from civic feeds — **not built.** `HandleNews` still unconditionally returns `Items: []` with `Source: "stub"`, identical to the M8 placeholder. No RSS/feed-parsing code exists anywhere in the repo.
- [x] Crisis archetype classifier: 7 categories from keywords (`LABOR_TRANSIT`, `CLIMATE_EXTREME`, `HOUSING_SPECULATE`, `FOOD_HEALTH`, `CIVIC_DISINFO`, `MIGRATION_SANCT`, `FASCIST_AGITATION`) — classifier itself is real and tested, but the 7th archetype's string constant is inconsistent across the codebase: this doc says `COMMUNITY_DIVISION`, the Go backend (`news.go`/`validator.go`/`prompts.go`) uses `FASCIST_AGITATION`, and the frontend (`crisis_scenarios.json`/`CrisisWireModal.ts`/`narrativeGossip.ts`) uses `DIVISION_AGITATION`. Three different strings for one concept — worth noting given M16's lexicon audit specifically eliminated "fascist"-family terms from user-facing/frontend code but never touched this Go backend constant. Tracked in the follow-up doc.
- [x] `apps/api/internal/narrative/client.go` — Multi-provider AI client:
  - Ollama local endpoint support (`/api/chat` with `llama3.2:3b`)
  - OpenAI-compatible cloud support (Groq / Cloudflare / HuggingFace free tiers)
  - Configurable via `AI_PROVIDER`, `AI_MODEL`, `AI_ENDPOINT`, `AI_API_KEY`
- [x] `apps/api/internal/narrative/prompts.go` — Lore-anchored system prompts + character voice pillars + JSON schema definition
- [x] `apps/api/internal/narrative/validator.go` — JSON schema verification + hard mathematical clamping of stat deltas
- [x] `apps/api/internal/narrative/cache.go` — Database persistence in `dynamic_scenarios` table
- [x] `GET /api/v1/pulse/news` and `GET /api/v1/narrative/daily-scenarios` endpoints
- [x] Curated vault: evergreen fallback scenarios in `crisis_scenarios.json` for 100% offline play (23 entries, not "25+" as originally written)

## Frontend Tasks
- [x] `BroadsheetModal.ts` — "The Daily District Ground" UI
  - CSS 3D unfold animation (rotateX 90° → 0°, 400ms) — confirmed real
  - Newsprint texture (CSS background: repeating halftone SVG) — confirmed real
  - Real-world headline citation badge with source pill — **not built.** `BroadsheetData` has no source field and `broadsheetHTML.ts` renders no citation/source pill anywhere.
  - Sections: barometer row, NPC street quote — confirmed real. "Dynamic headline story" — **not built as described**: `TopHUD.ts`'s `onEndDay()` picks the headline from 4 hardcoded string templates keyed off food/energy index thresholds; it never calls `/api/v1/narrative/daily-scenarios` (that endpoint is consumed only by the NPC gossip mill below). "4×4 mini-crossword" — **not what's built**: it's a single free-text `<input>` checked against the literal string `"solidarity"` (`broadsheetHTML.ts`/`BroadsheetModal.ts`), not a grid puzzle. Functional and tested as written, just not a crossword.
- [x] `RadioWidget.ts` — "Radio Free Commons" pirate FM tuner
  - Analog dial + needle indicator — real, but plain CSS `<div>`s (`.radio-dial-track`/`.radio-needle`), not SVG as originally written
  - 3 frequencies with label + audio profile switch — confirmed real
  - White noise static during tuning (bandpass audio node) — confirmed real
  - Amber LED display showing frequency — confirmed real. "Scrolling breaking news ticker" — **not built**; no ticker exists in `RadioWidget.ts`. (A same-named-sounding but unrelated `CivicTickerWidget` exists from M15 — a real-world civic-action ticker, not radio news — don't conflate the two.)
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
