# Sprint Plan — Closing the 2026-09-15 Audit Gaps

Source: [`AUDIT-2026-09-15.md`](AUDIT-2026-09-15.md). This doc turns each follow-up's "Options to Resolve" into locked decisions and granular, file-level subtasks so the work can be tracked and implemented directly. Decisions below default to each follow-up doc's own **Recommended** option, per standing project convention (build real, minimal, honestly-scoped logic; document what's deliberately left out).

Execution order (highest player-facing impact / lowest coupling risk first):

1. **M11** — Solidarity Pool write path + Safe Haven ending
2. **M9** — Naming cleanup + Broadsheet AI headline wiring + citation + crossword rename + radio ticker
3. **M14** — Three missing QA tests
4. **M20** — Package scripts, remote dynamic-loading path, naming fix
5. **M8** — Re-scope docs + give Wage/Transit a real (simple) seasonal curve
6. **M10** — Weather overlay (rain/frost)

Each milestone ends with: `tsc --noEmit`, `oxlint src/`, `npm test` (frontend changes) and/or `go build ./... && go vet ./... && go test -race -short ./...` (backend changes), plus updating the relevant `Mx-FOLLOWUP-*.md` and `Mx-*.md` checkboxes.

---

## 1. M11 — Solidarity Pool + Safe Haven

**Decision:** Solidarity Pool → Option 1 (real write path). Safe Haven → Option 1 (build the trigger).

### 1.1 Solidarity Pool write path
- [ ] `apps/api/internal/save/solidarity_pool.go`: add `HandleRecordCrisisChoice(w, r)` on `SolidarityHandler` — decodes `{crisisId string, day int, choice "solidarity"|"scapegoat"}`, validates `choice` against the DB's own CHECK constraint values, inserts into `crisis_log` using `middleware.UserID(r)`. No `summary` column write (scenario copy isn't needed for the aggregate and keeps the payload minimal/anonymous).
- [ ] `apps/api/cmd/server/main.go`: wire `r.With(requireAuth).Post("/district/crisis-log", solidarityHandler.HandleRecordCrisisChoice)` next to the existing `/district/resilience` route.
- [ ] `apps/web/src/api/endpoints/district.ts` (new file, mirrors `shop.ts`/`irl.ts` token pattern): `recordCrisisChoice(crisisId: string, day: number, choice: 'solidarity'|'scapegoat'): void` — fire-and-forget POST, swallow errors (matches `advanceDay()`'s "never blocks gameplay" convention).
- [ ] `apps/web/src/core/simulation/CrisisEngine.ts`: in `resolveCrisis()`, right after building `entry`, call `recordCrisisChoiceRemote(entry.id, entry.day, entry.choice)` fire-and-forget.
- [ ] Go test in `apps/api/internal/save/solidarity_pool_test.go`: a **real end-to-end** test — POST to `HandleRecordCrisisChoice` via httptest with a seeded user, then GET `HandleDistrictResilience` and assert the aggregate reflects the just-inserted row (not a test-seeded row) — this is the test that actually proves the gap is closed.
- [ ] Vitest test in a new `apps/web/src/api/endpoints/district.test.ts` or extend `CrisisEngine.test.ts`: confirm `resolveCrisis()` triggers a `fetch` call to `/api/v1/district/crisis-log` with the right body (mock `fetch`).

### 1.2 Safe Haven ending
- [ ] `apps/web/src/core/state/useGameStore.ts`: add `commons.safeHavenUnlocked: boolean` (default `false`).
- [ ] `apps/web/src/core/state/actions.ts`: in `updateCommonsProgress()`, when `node === 'landTrustProgress'` and the new value crosses 100 for the first time (`current < 100 && nextCommons.landTrustProgress >= 100`), set `safeHavenUnlocked: true` in the returned `commons` object.
- [ ] New `apps/web/src/ui/SafeHavenBanner.ts` — one-time celebratory modal (dialog role, close button), using `TactileEffects.playStageCompleteChime()` + `TactileEffects.spawnCelebrationParticles()` on open, matching the M14 completion-celebration pattern already established in `builder/`.
- [ ] `apps/web/src/world/WorldScene.ts`: add `checkSafeHaven()` polled in `update()` (same pattern as `checkCrisis()`/`checkAssembly()`), gated by a `safeHavenShown` instance flag so it only ever opens once per session.
- [ ] Vitest: `actions.test.ts` — landTrustProgress crossing 100 sets `safeHavenUnlocked` true exactly once (doesn't re-fire on subsequent contributions once already at 100).
- [ ] Update `docs/tasks/M11-shared-commons.md`'s manual-test section — flip both items from "genuine gap" back to real, once shipped.

---

## 2. M9 — Narrative Gaps

**Decisions:**
- Naming → rename Go-side `FASCIST_AGITATION` to `DIVISION_AGITATION` (matches frontend + lexicon-audit intent).
- Real RSS ingestion → **deferred** (Option 2, mirrors M8): re-scope `news.go` as "AI narrative pipeline only" rather than build a live feed parser.
- Broadsheet headline → wire through `/api/v1/narrative/daily-scenarios` (independent of RSS ingestion — the AI endpoint already works).
- Crossword → this is a **doc-wording gap only**, not a player-facing one (no player-visible text says "crossword"); rename internal class names for hygiene, correct the task-doc language.
- RadioWidget ticker → add a minimal real scrolling ticker (cheap, reuses existing civic headlines data already flowing through `TopHUD`).

### 2.1 Naming cleanup
- [ ] Rename `FASCIST_AGITATION` → `DIVISION_AGITATION` in `apps/api/internal/pulse/news.go`, `apps/api/internal/narrative/validator.go`, `apps/api/internal/narrative/prompts.go`, `apps/api/internal/narrative/validator_test.go`.
- [ ] Extend `apps/web/src/core/util/lexiconAudit.test.ts` with a third `it()` that walks `apps/api/internal/**/*.go` and substring-checks (case-insensitive, not the word-boundary regex — `SNAKE_CASE` identifiers defeat `\b` since `_` is a word character, which is exactly how this slipped through) for `fascis`, `comrade`, `cadre`, `far-right`/`far right`, `alt-right`/`alt right`.

### 2.2 Broadsheet AI headline + citation
- [ ] `apps/web/src/api/narrativeGossip.ts`: add `fetchDailyNarrative(): Promise<NarrativeResponse>` — the same session-cached fetch `fetchDailyGossip()` already does, but returning the raw response instead of the derived gossip lines. Refactor `fetchDailyGossip()` to call it internally (one fetch, two consumers) rather than duplicating the network call.
- [ ] `apps/web/src/ui/broadsheetHTML.ts`: add `source?: string` to `BroadsheetData`; render a small citation pill ("AI Narrative Wire — live" / "— cached") only when `source` is present.
- [ ] `apps/web/src/ui/TopHUD.ts`: make `onEndDay()` fetch `fetchDailyNarrative()` before opening the Broadsheet; when a scenario exists, use its `title`/`context` as `headline`/`subheadline` and pass `source`; when the fetch fails or returns empty, fall back to the existing 4 hardcoded templates (unchanged) with no `source` field — this is the honest fallback path, not a silent failure.
- [ ] Vitest: extend `TopHUD`'s existing test file (or add one) mocking `fetchDailyNarrative` to assert both the AI-headline path and the fallback path render correctly.

### 2.3 Crossword rename (doc + hygiene)
- [ ] `apps/web/src/ui/broadsheetHTML.ts` / `BroadsheetModal.ts`: rename `crossword-*` CSS classes to `commons-clue-*` (matches the already-honest visible heading "Commons Clue").
- [ ] `docs/tasks/M9-district-dispatch.md`: correct the wording from "4×4 mini-crossword" to "single Commons Clue prompt" — this is the actual, intentional feature.

### 2.4 RadioWidget ticker
- [ ] `apps/web/src/ui/RadioWidget.ts`: accept an optional `getHeadlines: () => string[]` callback in the constructor; render a `.radio-ticker` scrolling marquee (CSS `@keyframes` translateX, same technique already used elsewhere for scrollFactor-0 overlays) when headlines are available, hidden otherwise.
- [ ] Wire the civic ticker's existing headline source (`TopHUD`'s `civicTicker.getHeadlines()`) into wherever `RadioWidget` is instantiated.

### 2.5 News ingestion — formal re-scope (no code change)
- [ ] `docs/tasks/M9-district-dispatch.md` + `EPIC-08/EPIC-09` docs: state plainly that `news.go` is the AI-scenario pipeline's fallback stub, real RSS/JSON ingestion is deferred, matching the M8 decision below.

---

## 3. M14 — QA Coverage

No design decision — build the three missing tests against the real, already-correct implementation.

- [ ] **Test 14.2** — `apps/web/src/core/kernel/MinigameLoader.test.ts`: mount/unmount a registered test minigame 10 times via `MinigameLoader.launchMinigame()` + `container.unmount()`, assert `instance.unmount` called once per cycle and no `MinigameContainer` DOM nodes remain under `document.body` afterward.
- [ ] **Test 14.4** — new `apps/api/internal/kernel/courier_delivery_loop_test.go`: real integration test chaining `StartSession` → simulated deliveries → `CompleteSession` against the real courier-rush plugin (`packages/go/plugin-courier-rush`), asserting the wallet balance (`shop` package) actually increases via `h.repo.RecordSession`. Uses `testutil.NewPostgres`, skipped under `-short`.
- [ ] **Test 14.5** — new `apps/api/internal/kernel/verification_requests_test.go`: submit → quarantined (not in `ListVerifiedPlugins`) → owner review-approve → promoted to verified catalog; a non-owner review attempt gets `403`. Uses `testutil.NewPostgres`, skipped under `-short`.
- [ ] Flip `docs/archive/M14-microkernel-minigames.md` section 7's three `[ ]` rows to `[x]` once each lands; if all three land, M14 becomes archive-eligible (re-verify against the same zero-gap bar the other archived milestones met, then archive).

---

## 4. M20 — Standalone Package Cleanup

### 4.1 Per-package script surface
- [ ] For each of `minigame-courier-rush`, `plugin-bitchat`, `plugin-geo-weather`, `plugin-mesh-comms`, `plugin-mutual-credit`: add `vite.config.ts` (minimal — no plugins, just enables `vite`/`vite build` to run against a package-local `index.html`) and a throwaway `index.html` dev harness importing `src/index.ts`; update `package.json` scripts to `{"dev": "vite", "build": "tsc --noEmit", "check": "tsc --noEmit", "typecheck": "tsc --noEmit"}` (keep `typecheck` for anything already calling it).
- [ ] Verify `npm run dev --workspace=@district-cg/<pkg>` actually starts (smoke-check each, then stop it — don't leave dev servers running).

### 4.2 Remote dynamic-loading path
- [ ] `apps/web/src/core/kernel/MinigameLoader.ts`: add `static async loadRemoteMinigame(manifest: MinigameManifest): Promise<void>` — real `await import(/* @vite-ignore */ manifest.entrypointUrl)`, validates the module exports `createMinigame()` before calling `registerLocalMinigame()`; throws a catchable, descriptive error on a malformed module rather than crashing.
- [ ] Document + rely on the existing invariant that this only ever gets called with manifests sourced from `GET /api/v1/games` (which only returns local-registry-healthy + server-approved-verified plugins) — remote loading never bypasses `verification_requests.go`'s owner-approval gate because nothing else feeds it a manifest.
- [ ] Test fixture: `apps/web/src/core/kernel/__fixtures__/remoteMinigameFixture.ts` (tiny, exports `createMinigame`) + `__fixtures__/malformedMinigameFixture.ts` (exports nothing usable). Extend `MinigameLoader.test.ts`: real path loads + mounts via the fixture; malformed path rejects with a clear error and doesn't leave the loader in a broken state (`hasMinigame()` still false).

### 4.3 Naming consistency
- [ ] `docs/planning/20-STANDALONE-MONOREPO-PACKAGES-FOR-MINIGAMES-AND-PLUGINS.md`: correct the topology diagram's `transport-bitchat` to `plugin-bitchat`.

---

## 5. M8 — Living Economy re-scope

**Decision:** Option 2 (re-scope docs honestly) + give `Wage`/`Transit` a real, simple seasonal curve instead of a permanent no-op `1.0` — cheap, honest, no external API/secret management needed.

- [ ] `apps/api/internal/pulse/economy.go`: give `Wage` and `Transit` real (if coarse) sinusoidal curves analogous to `Food`/`Energy`/`Heat`/`Migrant` — e.g. wage dips slightly in the post-holiday trough (mirrors real seasonal hiring patterns), transit cost ticks up in winter (heating-driven fuel cost pass-through) — both still clamped, still deterministic, still fully synthetic. Update `EconomyMath.test.ts`/Go test coverage for the new curves' bounds.
- [ ] `docs/stories/EPIC-08-living-economy.md`: rewrite the "Data Sources" table to state plainly this is a synthetic seasonal model; real external index integration is not built and not currently planned (deferred, not "fallback for when the real thing fails").
- [ ] `docs/tasks/M8-living-economy.md`: remove language implying a live-fetch path exists; note `Wage`/`Transit` now vary too.

---

## 6. M10 — Weather System

**Decision:** Option 1 (build it) — minimal rain/frost overlay, reusing `SoundSynth.playRain()` for audio.

- [ ] `apps/web/src/world/WorldScene.ts`: add a `weatherOverlay` layer (depth-90, scrollFactor-0, same tier as `tintOverlay`) driven by a pure `weatherTier(heat: number): 'none'|'rain'|'frost'` helper (heat below a low threshold → frost tint + a lightweight Phaser particle/graphics rain effect; heat spike → nothing extra, rain is the "wet season" signal, frost the "cold snap" signal — matches EPIC-10's "rain & cold-snap" framing). Composes with (doesn't replace) `updateDayNight()`'s tint.
- [ ] Gate on `useGameStore.getState().pulseState?.multipliers.heat`; start `playRain()` once per rain-state transition (not every frame).
- [ ] New `apps/web/src/world/WeatherSystem.ts` (pure `weatherTier()` function, mirroring how `resilienceTier()` is isolated and tested) + `WeatherSystem.test.ts`.
- [ ] `docs/stories/EPIC-10-district-expansion.md` / `docs/tasks/M10-district-expansion.md`: flip the Weather System line from "gap" to shipped, with a scoping note (visual overlay + reused audio, not a full particle-physics rain sim).

---

## Verification checklist (run after each numbered section, not just at the end)

- `cd apps/web && npx tsc --noEmit`
- `cd apps/web && npx oxlint src/`
- `cd apps/web && npm test -- --run`
- `cd apps/api && go build ./... && go vet ./...`
- `cd apps/api && go test -race -short ./...`
- `cd apps/api && go test ./...` (Docker/testcontainers) at least once after M11 and M14 land, since those add the only new DB-touching tests
