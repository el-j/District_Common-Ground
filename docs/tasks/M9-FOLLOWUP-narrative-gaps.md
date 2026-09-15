# M9 Follow-up — Real News Ingestion, AI-Driven Headlines & Naming Cleanup

Found: 2026-09-15, full repo audit
Status: `[ ] Not Started`
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

## Acceptance Criteria (once picked up)

- [ ] Pick one canonical name for the 7th archetype (recommend `DIVISION_AGITATION`, matching the frontend and the lexicon-audit intent) and rename the Go-side constant + all its usages (`news.go`, `validator.go`, `prompts.go`, `validator_test.go`) to match. Re-run `lexiconAudit.test.ts` and extend it to also scan Go source if practical, so this class of regression gets caught automatically next time.
- [ ] Decide whether real RSS/feed ingestion is in scope for `news.go`, or whether it should be formally re-scoped as "AI narrative pipeline only, real news ingestion deferred" (mirrors the M8 live-data decision — consider resolving both together, since M9's stub inherits directly from M8's).
- [ ] If real ingestion is built: wire the Broadsheet's headline through `/api/v1/narrative/daily-scenarios` (or a dedicated headline field on that response) instead of `TopHUD.ts`'s hardcoded templates, and add a source citation pill once a real source exists to cite.
- [ ] Either build a real small crossword grid or rename the feature/doc language to match what's actually there (a single "commons word" prompt).
- [ ] `npm test` and `go test -short ./...` pass with no regressions.
