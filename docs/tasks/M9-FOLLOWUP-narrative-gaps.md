# M9 Follow-up — Real News Ingestion, AI-Driven Headlines & Naming Cleanup

Found: 2026-09-15, full repo audit
Status: `[x] Resolved` — 5 of 6 gaps fixed 2026-09-15 (see `docs/SPRINT-2026-09-15-PLAN.md` §2); real RSS ingestion (gap #1) formally re-scoped/deferred rather than built, mirroring the M8 decision.
Parent: [`M9-district-dispatch.md`](file:///Users/rex-fab-alt/Documents/private/District_Common-Ground/docs/tasks/M9-district-dispatch.md)

---

## The Gaps

Five distinct items in M9's task doc were checked off without matching code. Each is real, scoped, independent work — listed in rough priority order:

### 1. `news.go` is still the M8 stub
`HandleNews` unconditionally returns `Items: [], Source: "stub"`. No RSS/JSON feed parsing exists anywhere in the repo, despite the M9 doc claiming this was implemented. This is the actual root cause of gap #2 below — there's no real news for anything downstream to consume.

### 2. The Broadsheet's headline is not AI-driven
`TopHUD.ts`'s `onEndDay()` picks the headline from 4 hardcoded string templates keyed off food/energy index thresholds. It never calls `/api/v1/narrative/daily-scenarios` — that endpoint (which *is* real, AI-backed, and tested) is currently consumed only by the NPC gossip mill, not the Broadsheet. The Broadsheet is the player-facing "daily news" surface; today it's static copy, not the dynamic AI narrative the milestone is named after.

### 3. The "4×4 mini-crossword" is a single text input
`broadsheetHTML.ts`/`BroadsheetModal.ts` render one `<input>` checked against the literal string `"solidarity"`. It's real and functional as written, just not a crossword. Either build an actual small grid, or rename/re-describe the feature honestly.

### 4. No source citation badge on the Broadsheet
`BroadsheetData` has no `source` field; nothing renders a citation/source pill. This is blocked on #1 (there's no real news source to cite yet).

### 5. RadioWidget has no ticker; dial is CSS not SVG
Cosmetic-only gaps: the "scrolling breaking news ticker" doesn't exist in `RadioWidget.ts` (don't confuse with the unrelated, real `CivicTickerWidget` from M15), and the dial is plain CSS divs rather than SVG. Low priority.

### 6. Archetype naming inconsistency: `FASCIST_AGITATION` / `DIVISION_AGITATION` / `COMMUNITY_DIVISION`
Three different string constants for the same 7th crisis archetype across three layers:
- Go backend (`news.go`, `validator.go`, `prompts.go`, tests): `FASCIST_AGITATION`
- Frontend (`crisis_scenarios.json`, `CrisisWireModal.ts`, `narrativeGossip.ts`): `DIVISION_AGITATION`
- `M9-district-dispatch.md`'s original text: `COMMUNITY_DIVISION`

This is worth fixing precisely *because* M16's lexicon audit (`lexiconAudit.test.ts`) specifically eliminated "fascist"-family terminology from user-facing/frontend code as part of the game's zero-ideological-jargon design principle — but that audit only scanned `.ts`/JSON content, never touched this Go backend constant, so it's still there, just invisible to players. It should not silently regress if `FASCIST_AGITATION` is ever echoed into any player-facing string, log, or future admin UI.

## Acceptance Criteria

- [x] Renamed the Go-side constant `FASCIST_AGITATION` → `DIVISION_AGITATION` (`news.go`, `validator.go`, `prompts.go`, `validator_test.go`, `economy_test.go`), matching the frontend. Extended `lexiconAudit.test.ts` with a Go-source scan (substring match, not the word-boundary regex — `_` is a word character, which is exactly how `FASCIST_AGITATION` slipped through originally) that deliberately exempts `news.go`'s real-world keyword-classification table (input-side, never echoed to a player) so it can't be censored into uselessness.
- [x] Decided: real RSS/feed ingestion is **deferred**, formally re-scoped in `M9-district-dispatch.md` — mirrors the M8 live-data decision. `news.go` remains the AI-pipeline's stub; nothing implies otherwise anymore.
- [x] Wired the Broadsheet's headline through `/api/v1/narrative/daily-scenarios` (`TopHUD.ts`'s `onEndDay()` now awaits `fetchDailyNarrative()`, using the top scenario's `title`/`context`) — this did **not** require real ingestion, since the AI pipeline generates scenarios directly. Added the source citation pill (`BroadsheetData.source` → `.broadsheet-citation`), shown only on the AI-driven path.
- [x] Renamed the feature/doc language to match what's actually there (a single "Commons Clue" prompt) rather than building a full crossword grid — the visible copy was already honest ("Commons Clue"), only internal `crossword-*` class names and the task-doc wording needed fixing.
- [x] RadioWidget ticker built too (was listed as low-priority/optional but was cheap once the citation data flow existed): `.radio-ticker` marquee fed by `CivicTickerWidget.getHeadlines()`.
- [x] `npm test` (310/310) and `go test -race -short ./...` pass with no regressions.
