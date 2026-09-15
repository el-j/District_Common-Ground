# M9 — "The District Dispatch" & Dynamic AI Narrative Engine

Stories: `docs/stories/EPIC-09-district-dispatch.md`
Planning: `docs/planning/03-NEWS-TO-CRISIS-PIPELINE.md`, `docs/planning/08-DYNAMIC-AI-NARRATIVE-PIPELINE.md`

> **Audit note (2026-09-15):** several items below were checked off without matching code; most were fixed the same day (naming cleanup, AI headline wiring, citation pill, radio ticker). See [`M9-FOLLOWUP-narrative-gaps.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M9-FOLLOWUP-narrative-gaps.md) for the full history; only real RSS/feed ingestion remains formally deferred.

## Go Backend Tasks
- [ ] `apps/api/internal/pulse/news.go` — RSS/JSON ingestion from civic feeds — **formally re-scoped, deferred (2026-09-15).** `HandleNews` still unconditionally returns `Items: []` with `Source: "stub"`; this is not a bug to fix quietly, it's a real feature (a live RSS/feed parser) that was never built and mirrors the M8 live-data decision. `news.go`'s keyword-classification map still exists and is real — it's just never fed live text today. The AI narrative pipeline below does *not* depend on this; it generates scenarios directly, it doesn't classify ingested news.
- [x] Crisis archetype classifier: 7 categories from keywords (`LABOR_TRANSIT`, `CLIMATE_EXTREME`, `HOUSING_SPECULATE`, `FOOD_HEALTH`, `CIVIC_DISINFO`, `MIGRATION_SANCT`, `DIVISION_AGITATION`) — classifier itself is real and tested. **Fixed 2026-09-15:** the 7th archetype's string constant was inconsistent across the codebase (Go backend used `FASCIST_AGITATION`, frontend used `DIVISION_AGITATION`); renamed the Go-side constant (`news.go`/`validator.go`/`prompts.go`/`validator_test.go`) to `DIVISION_AGITATION` to match the frontend and the intent of M16's lexicon audit. `lexiconAudit.test.ts` now also scans Go source (substring match, not word-boundary regex — `SNAKE_CASE` identifiers defeat `\b`) so this class of regression is caught automatically going forward.
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
  - Real-world headline citation badge with source pill — **built 2026-09-15.** `BroadsheetData.source` renders a `.broadsheet-citation` pill ("📡 AI Narrative Wire — live/cached") whenever the headline came from the real AI pipeline; omitted for the hardcoded-fallback path.
  - Sections: barometer row, NPC street quote — confirmed real. "Dynamic headline story" — **fixed 2026-09-15**: `TopHUD.ts`'s `onEndDay()` now awaits `fetchDailyNarrative()` and uses the top scenario's `title`/`context` as the headline/subheadline, falling back to the original 4 hardcoded templates only when the pipeline is offline/empty. "4×4 mini-crossword" — this was always a **doc-wording gap, not a code gap**: the real, intentional feature is a single "Commons Clue" prompt (`<input class="commons-clue-input">` checked against `"solidarity"`, renamed from the old `crossword-*` class names for hygiene) — functional and tested as written, correctly described here now.
- [x] `RadioWidget.ts` — "Radio Free Commons" pirate FM tuner
  - Analog dial + needle indicator — real, but plain CSS `<div>`s (`.radio-dial-track`/`.radio-needle`), not SVG as originally written (kept as-is — low priority, cosmetic only)
  - 3 frequencies with label + audio profile switch — confirmed real
  - White noise static during tuning (bandpass audio node) — confirmed real
  - Amber LED display showing frequency — confirmed real. "Scrolling breaking news ticker" — **built 2026-09-15**: `.radio-ticker` CSS marquee, fed by the same `CivicTickerWidget.getHeadlines()` data TopHUD already uses. (A same-named-sounding but unrelated `CivicTickerWidget` exists from M15 — a real-world civic-action ticker, not radio news — the ticker reuses its data, doesn't conflate the two.)
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
- [x] Vitest: `narrativeGossip.test.ts` — `pickGossipLine`/`scenariosToGossip` archetype matching + DEFAULT fallback, `fetchDailyGossip`'s and (added 2026-09-15) `fetchDailyNarrative`'s network-failure/non-OK fallback and session-cache reuse (the two now share one underlying fetch, tested explicitly)
- [x] Vitest: `BroadsheetModal.test.ts` — citation pill renders when `source` is set, omitted on the fallback path (added 2026-09-15)
- [x] Vitest: `lexiconAudit.test.ts` — Go source now scanned too (added 2026-09-15), catches the `FASCIST_AGITATION`-class regression this audit found
- [ ] Manual: advance day → broadsheet unfolds with dynamic story (now AI-driven when the pipeline is reachable) → close → talk to Sal → hear dynamic rumor
